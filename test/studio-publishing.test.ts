import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import { createRegistry } from "../src/registry/index.js";
import { createRESTAPI } from "../src/api/rest/index.js";
import { pageCollection } from "../src/templates/pages.js";

describe("Studio page publishing through the headless API", () => {
  let db: LocalAdapter;
  let app: any;
  beforeAll(async () => {
    db = new LocalAdapter({ path: ":memory:" });
    await db.connect();
    const collection = { ...pageCollection, access: { read: () => true, create: () => true, update: () => true } };
    const registry = createRegistry();
    registry.addCollection(collection);
    await db.init([registry.getCollection("pages")!]);
    app = await createRESTAPI(registry, db, { studio: { enabled: true } });
  });
  afterAll(async () => {
    await db?.disconnect();
  });
  it("saves a Hero as a draft, publishes it, then keeps a later draft separate from live content", async () => {
    const hero = {
      id: "hero-1",
      blockType: "hero",
      isMultiScreen: false,
      singleSlide: { title: "First heading", subtitle: "Introduction", buttons: [{ text: "Explore", url: "/about" }] },
    };
    const request = (path: string, method = "GET", data?: unknown, draft = false) =>
      app.fetch(
        new Request(`http://localhost/api/pages${path}`, {
          method,
          headers: { "Content-Type": "application/json", "X-Draft": String(draft) },
          ...(data ? { body: JSON.stringify(data) } : {}),
        }),
      );
    const created = await request("", "POST", {
      title: "Studio test",
      slug: "studio-test",
      content: [hero],
      status: "draft",
    });
    expect(created.status).toBe(201);
    const draft = (await created.json()).data;
    expect(draft.content[0].id).toBe("hero-1");
    expect(draft.content[0].singleSlide.title).toBe("First heading");
    const published = await request(`/${draft.id}`, "PATCH", { ...draft, status: "published" });
    expect(published.status).toBe(200);
    const live = (await published.json()).data;
    expect(live.status).toBe("published");
    const changed = { ...hero, singleSlide: { ...hero.singleSlide, title: "Draft-only heading" } };
    const updatedDraft = await request(`/${draft.id}`, "PATCH", { ...live, content: [changed] }, true);
    expect(updatedDraft.status).toBe(200);
    const publicRead = await request(`/${draft.id}?draft=false`);
    expect(publicRead.status).toBe(200);
    expect((await publicRead.json()).data.content[0].singleSlide.title).toBe("First heading");
    const draftRead = await request(`/${draft.id}?draft=true`);
    expect(draftRead.status).toBe(200);
    const latestDraft = (await draftRead.json()).data;
    expect(latestDraft.content[0].singleSlide.title).toBe("Draft-only heading");
    expect(latestDraft.content[0].id).toBe("hero-1");
  });
  it("round-trips nested layout nodes and inline elements without storing rendered HTML", async () => {
    const content = [
      {
        id: "section-1",
        blockType: "section",
        children: [
          {
            id: "container-1",
            blockType: "container",
            children: [
              {
                id: "row-1",
                blockType: "row",
                children: [
                  {
                    id: "column-1",
                    blockType: "column",
                    children: [{ id: "text-1", blockType: "textElement", content: "Nested content" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const response = await app.fetch(
      new Request("http://localhost/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nested page", slug: "nested-page", status: "draft", content }),
      }),
    );
    expect(response.status).toBe(201);
    const created = (await response.json()).data;
    const read = await app.fetch(new Request(`http://localhost/api/pages/${created.id}?draft=true`));
    expect(read.status).toBe(200);
    const document = (await read.json()).data;
    expect(document.content).toEqual(content);
    expect(document.studioContent).toBeUndefined();
  });
});
