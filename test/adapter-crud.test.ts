import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import type { CollectionConfig } from "../src/registry/types.js";

const testCollection: CollectionConfig = {
  slug: "test_posts",
  label: "Test Posts",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "textarea" },
    { name: "published", type: "checkbox", defaultValue: false },
    { name: "views", type: "number", integer: true },
  ],
  timestamps: true,
  tenantScoped: false,
};

describe("LocalAdapter CRUD", () => {
  let adapter: LocalAdapter;

  beforeAll(async () => {
    adapter = new LocalAdapter({ path: ":memory:" });
    await adapter.connect();
    await adapter.init([testCollection]);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it("creates a document", async () => {
    const doc = await adapter.create({
      collection: "test_posts",
      data: { title: "Test Post", content: "Hello world", published: true, views: 100 },
    });
    expect(doc).toBeDefined();
    expect(doc.title).toBe("Test Post");
    expect(doc.published).toBe(true);
  });

  it("finds documents", async () => {
    await adapter.create({
      collection: "test_posts",
      data: { title: "Post 1", published: true },
    });
    await adapter.create({
      collection: "test_posts",
      data: { title: "Post 2", published: false },
    });

    const result = await adapter.find({ collection: "test_posts", limit: 10 });
    expect(result.docs.length).toBeGreaterThanOrEqual(2);
    expect(result.totalDocs).toBeGreaterThanOrEqual(2);
  });

  it("finds by ID", async () => {
    const created = await adapter.create({
      collection: "test_posts",
      data: { title: "Find Me", published: true },
    });

    const found = await adapter.findByID({ collection: "test_posts", id: created.id });
    expect(found).toBeDefined();
    expect(found?.title).toBe("Find Me");
  });

  it("updates a document", async () => {
    const created = await adapter.create({
      collection: "test_posts",
      data: { title: "Update Me", published: false },
    });

    const updated = await adapter.update({
      collection: "test_posts",
      id: created.id,
      data: { title: "Updated Title", published: true },
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.published).toBe(true);
  });

  it("deletes a document", async () => {
    const created = await adapter.create({
      collection: "test_posts",
      data: { title: "Delete Me" },
    });

    const deleted = await adapter.delete({
      collection: "test_posts",
      id: created.id,
    });

    expect(deleted).toBeDefined();

    const found = await adapter.findByID({ collection: "test_posts", id: created.id });
    expect(found).toBeNull();
  });

  it("counts documents", async () => {
    const count = await adapter.count({ collection: "test_posts" });
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("supports where clause filtering", async () => {
    await adapter.create({
      collection: "test_posts",
      data: { title: "Filter Test", published: true },
    });

    const result = await adapter.find({
      collection: "test_posts",
      where: { published: true },
      limit: 10,
    });

    expect(result.docs.length).toBeGreaterThanOrEqual(1);
  });

  it("supports pagination", async () => {
    for (let i = 0; i < 5; i++) {
      await adapter.create({
        collection: "test_posts",
        data: { title: `Paginated Post ${i}` },
      });
    }

    const page1 = await adapter.find({ collection: "test_posts", limit: 2, page: 1 });
    const page2 = await adapter.find({ collection: "test_posts", limit: 2, page: 2 });

    expect(page1.docs.length).toBe(2);
    expect(page2.docs.length).toBe(2);
    expect(page1.docs[0].title).not.toBe(page2.docs[0].title);
  });
});
