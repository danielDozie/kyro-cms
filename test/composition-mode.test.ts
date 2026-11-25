import { graphql } from "graphql";
import { buildGraphQLSchema, RelationLoader } from "../src/api/graphql/index.js";
import { createFindByIDProcedure, createCreateProcedure } from "../src/api/trpc/procedures.js";
import { afterEach, describe, expect, it } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import { createRegistry } from "../src/registry/index.js";
import { createKyroApp } from "../src/api/rest/kyro-app.js";
import { pageCollection } from "../src/templates/pages.js";
import { contentRepresentation, layoutSignature } from "../src/studio/representation.js";
import { enforceStudioValidation } from "../src/studio/validation.js";

const content = [
  {
    id: "frame",
    blockType: "container",
    layout: { background: "dark" },
    children: [
      { id: "photo", blockType: "imageElement", image: "media-1" },
      { id: "space", blockType: "spacer", size: 32 },
      { id: "words", blockType: "textElement", content: "Original", layout: { color: "red" } },
    ],
  },
];
let db: LocalAdapter;
afterEach(async () => db?.disconnect());
async function setup() {
  db = new LocalAdapter({ path: ":memory:" });
  await db.connect();
  const registry = createRegistry();
  registry.addCollection({
    ...pageCollection,
    versions: { drafts: true, maxPerDoc: 1 },
    access: { read: () => true, create: () => true, update: () => true },
  });
  await db.init([registry.getCollection("pages")!]);
  const doc = await db.create<any>({
    collection: "pages",
    data: { title: "Mode test", slug: "mode-test", content, status: "published" },
  });
  const app = (enabled: boolean, user = true) =>
    createKyroApp({
      registry,
      db,
      studio: { enabled },
      authAdapter: {} as any,
      ...(user ? { user: { id: "editor", role: "admin" } as any } : {}),
    });
  return { doc, app, registry };
}
function request(app: any, id: string, path = "", body?: any, headers = {}) {
  return app.request(`/api/pages/${id}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
describe("Studio/headless composition policy", () => {
  it("projects without mutation, preserves references/order and leaves ordinary data intact", () => {
    const source = {
      createdAt: new Date("2026-11-25T00:00:00Z"),
      content,
      info: { layout: "ordinary application data" },
    };
    const projected = contentRepresentation(source);
    expect(projected.content.map((b) => b.id)).toEqual(["photo", "words"]);
    expect(projected.content[0].image).toBe("media-1");
    expect(projected.content[1]).not.toHaveProperty("layout");
    expect(projected.createdAt).toEqual(source.createdAt);
    expect(projected.info.layout).toBe("ordinary application data");
    expect(source.content[0].layout).toEqual({ background: "dark" });
  });
  it("freezes saved layout settings in headless mode but allows content edits", async () => {
    const { registry } = await setup();
    const original = { content };
    const edited = structuredClone(original);
    edited.content[0].children[2].content = "Edited";
    expect(layoutSignature(edited)).toBe(layoutSignature(original));
    expect(() =>
      enforceStudioValidation(edited, registry.getCollection("pages")!, {
        originalDoc: original,
        studioEnabled: false,
      }),
    ).not.toThrow();
    edited.content[0].layout.background = "white";
    expect(() =>
      enforceStudioValidation(edited, registry.getCollection("pages")!, {
        originalDoc: original,
        studioEnabled: false,
      }),
    ).toThrow("Layout authoring is disabled");
    expect(() =>
      enforceStudioValidation(original, registry.getCollection("pages")!, { studioEnabled: false }),
    ).toThrow();
  });
  it("defaults APIs to mode, rejects full headless output, never trusts an anonymous editor header", async () => {
    const { doc, app } = await setup();
    const headless = await app(false, false);
    const caps = await (await headless.request("/api/studio/capabilities")).json();
    expect(caps.enabled).toBe(false);
    expect(caps.blockTypes).not.toContain("container");
    expect((await headless.request("/api/studio/preview-session", { method: "POST" })).status).toBe(403);
    let response = await request(headless, doc.id, "", undefined, { "x-kyro-admin": "true" });
    expect(response.status).toBe(200);
    expect((await response.json()).doc.content.map((b: any) => b.id)).toEqual(["photo", "words"]);
    expect((await request(headless, doc.id, "?representation=full")).status).toBe(400);
    const studio = await app(true);
    response = await request(studio, doc.id);
    expect((await response.json()).doc.content[0].blockType).toBe("container");
    response = await request(studio, doc.id, "?representation=content");
    expect((await response.json()).doc.content[0].id).toBe("photo");
    const editor = await app(false);
    response = await request(editor, doc.id, "", undefined, { "x-kyro-admin": "true" });
    expect((await response.json()).doc.content[0].blockType).toBe("container");
  });
  it("delivers the same headless projection through GraphQL and tRPC", async () => {
    const { doc, registry } = await setup();
    const schema = buildGraphQLSchema({ registry, db, settings: { studio: { enabled: false } } });
    const ctx = {
      db,
      registry,
      req: new Request("http://localhost/graphql"),
      relationLoader: new RelationLoader({ db }),
    };
    const result = await graphql({
      schema,
      source: `{ page(id: "${doc.id}") { content { __typename } } }`,
      contextValue: ctx,
    });
    expect(result.errors).toBeUndefined();
    expect((result.data as any).page.content).toHaveLength(2);
    expect(Object.keys(schema.getTypeMap()).some((name) => /_Container$/.test(name))).toBe(false);
    const trpc = { db, registry, req: ctx.req as any, settings: { studio: { enabled: false } } };
    const item = await createFindByIDProcedure(trpc)({ collection: "pages", id: doc.id });
    expect(item.content.map((b: any) => b.id)).toEqual(["photo", "words"]);
    await expect(
      createFindByIDProcedure(trpc)({ collection: "pages", id: doc.id, representation: "full" }),
    ).rejects.toThrow("unavailable");
    await expect(
      createCreateProcedure(trpc)({ collection: "pages", data: { title: "Forbidden", slug: "forbidden", content } }),
    ).rejects.toThrow("Layout authoring is disabled");
    const studioSchema = buildGraphQLSchema({ registry, db, settings: { studio: { enabled: true } } });
    const projected = await graphql({
      schema: studioSchema,
      source: `{ page(id: "${doc.id}") { content { __typename } } }`,
      contextValue: { ...ctx, req: new Request("http://localhost/graphql?representation=content") },
    });
    expect(projected.errors).toBeUndefined();
    expect((projected.data as any).page.content).toHaveLength(2);
  });
  it("converts and recovers only drafts, guards stale previews, and protects recovery from pruning", async () => {
    const { doc, app } = await setup();
    const headless = await app(false);
    let preview = await (await request(headless, doc.id, "/composition")).json();
    expect(preview.layouts).toBe(2);
    expect(
      (
        await request(await app(false, false), doc.id, "/composition", {
          action: "convert",
          revision: preview.revision,
        })
      ).status,
    ).toBe(401);
    expect((await request(headless, doc.id, "/composition", { action: "convert", revision: "stale" })).status).toBe(
      409,
    );
    const conversion = await request(headless, doc.id, "/composition", {
      action: "convert",
      revision: preview.revision,
    });
    expect(conversion.status).toBe(200);
    const { recoveryVersionId } = await conversion.json();
    let draft = await db.findByID<any>({ collection: "pages", id: doc.id, draft: true });
    expect(draft.content.map((b: any) => b.id)).toEqual(["photo", "words"]);
    const live = await db.findByID<any>({ collection: "pages", id: doc.id, draft: false });
    expect(live.content[0].blockType).toBe("container");
    for (let i = 0; i < 4; i++)
      await db.createVersion({ collection: "pages", documentId: doc.id, data: draft, status: "draft" });
    expect((await db.findVersionByID({ collection: "pages", versionId: recoveryVersionId }))?.recovery).toBe(true);
    preview = await (await request(headless, doc.id, "/composition")).json();
    expect(preview.recoveries.map((v: any) => v.id)).toContain(recoveryVersionId);
    const recovered = await request(headless, doc.id, "/composition", {
      action: "recover",
      revision: preview.revision,
      versionId: recoveryVersionId,
    });
    expect(recovered.status).toBe(200);
    draft = await db.findByID<any>({ collection: "pages", id: doc.id, draft: true });
    expect(draft.content[0].layout.background).toBe("dark");
    expect(draft._hasUnpublishedChanges).toBe(true);
    const nextPreview = await (await request(headless, doc.id, "/composition")).json();
    const repeated = await request(headless, doc.id, "/composition", { action: "convert", revision: nextPreview.revision });
    expect((await repeated.json()).recoveryVersionId).toBe(recoveryVersionId);
    const single = await db.findVersions({ collection: "pages", documentId: doc.id, recoveryOnly: true });
    expect(single.docs).toHaveLength(1);

    expect((await db.findByID<any>({ collection: "pages", id: doc.id, draft: false })).content).toEqual(live.content);
    expect((await request(headless, doc.id, `/versions/${recoveryVersionId}/restore`, {})).status).toBe(400);
  });
});
