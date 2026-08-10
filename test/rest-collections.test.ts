import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import { createRegistry } from "../src/registry/index.js";
import { createRESTAPI } from "../src/api/rest/index.js";
import type { CollectionConfig } from "../src/registry/types.js";

const testCollection: CollectionConfig = {
  slug: "rest_test_posts",
  label: "REST Test Posts",
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "state", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Published", value: "published" }], defaultValue: "draft" },
    { name: "views", type: "number", integer: true, defaultValue: 0 },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
};

describe("REST Collections API", () => {
  let adapter: LocalAdapter;
  let app: any;
  let createdId: string;

  beforeAll(async () => {
    adapter = new LocalAdapter({ path: ":memory:" });
    await adapter.connect();
    await adapter.init([testCollection]);
    const registry = createRegistry();
    registry.addCollection(testCollection);
    app = await createRESTAPI(registry, adapter);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it("creates a document", async () => {
    const res = await app.fetch(new Request("http://localhost/api/rest_test_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Post", state: "published", status: "published" }),
    }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.data.title).toBe("Test Post");
    expect(data.data.state).toBe("published");
    createdId = data.data.id;
  });

  it("lists documents", async () => {
    const res = await app.fetch(new Request("http://localhost/api/rest_test_posts?draft=true"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.docs).toBeDefined();
    expect(data.docs.length).toBeGreaterThanOrEqual(1);
  });

  it("filters documents with ?where=", async () => {
    const res = await app.fetch(new Request("http://localhost/api/rest_test_posts?draft=true&where=" + encodeURIComponent(JSON.stringify({ title: { equals: "Test Post" } }))));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.docs.length).toBeGreaterThanOrEqual(1);
    expect(data.docs[0].title).toBe("Test Post");
  });

  it("rejects invalid JSON in ?where=", async () => {
    const res = await app.fetch(new Request("http://localhost/api/rest_test_posts?where=not-json"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid JSON");
  });

  it("finds document by ID", async () => {
    const res = await app.fetch(new Request(`http://localhost/api/rest_test_posts/${createdId}?draft=true`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.id).toBe(createdId);
  });

  it("updates a document and creates versions", async () => {
    const res = await app.fetch(new Request(`http://localhost/api/rest_test_posts/${createdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Post" }),
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.title).toBe("Updated Post");

    // Check version list
    const versionsRes = await app.fetch(new Request(`http://localhost/api/rest_test_posts/${createdId}/versions`));
    expect(versionsRes.status).toBe(200);
    const versionsData = await versionsRes.json();
    expect(versionsData.docs.length).toBeGreaterThanOrEqual(2);
  });

  it("compares two versions", async () => {
    const versionsRes = await app.fetch(new Request(`http://localhost/api/rest_test_posts/${createdId}/versions`));
    const versionsData = await versionsRes.json();
    const v1 = versionsData.docs[1].id;
    const v2 = versionsData.docs[0].id;

    const compareRes = await app.fetch(new Request(`http://localhost/api/rest_test_posts/${createdId}/versions?compareA=${v1}&compareB=${v2}`));
    expect(compareRes.status).toBe(200);
    const compareData = await compareRes.json();
    expect(compareData.diffs).toBeDefined();
    expect(compareData.diffs.some((d: any) => d.field === "title")).toBe(true);
  });

  it("restores a historical version", async () => {
    const versionsRes = await app.fetch(new Request(`http://localhost/api/rest_test_posts/${createdId}/versions`));
    const versionsData = await versionsRes.json();
    const oldestVersionId = versionsData.docs[versionsData.docs.length - 1].id;

    const restoreRes = await app.fetch(new Request(`http://localhost/api/rest_test_posts/${createdId}/versions/${oldestVersionId}/restore`, {
      method: "POST",
    }));
    expect(restoreRes.status).toBe(200);
    const restoreData = await restoreRes.json();
    expect(restoreData.data.title).toBe("Test Post");
  });

  it("deletes a document", async () => {
    const res = await app.fetch(new Request(`http://localhost/api/rest_test_posts/${createdId}`, { method: "DELETE" }));
    expect(res.status).toBe(200);
  });
});
