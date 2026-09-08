import { describe, it, expect } from "vitest";
import { collectionToDrizzleSchema, DrizzleAdapter } from "../src/database/drizzle/adapter.js";
import { postsCollection } from "../src/templates/posts.js";
import { pageCollection } from "../src/templates/pages.js";
import type { CollectionConfig } from "../src/registry/types.js";

describe("DrizzleAdapter Tabbed Fields & Schema Mapping", () => {
  it("generates SQL schema including fields from unnamed tabs", () => {
    const schema = collectionToDrizzleSchema(postsCollection, "postgres");
    expect(schema).toContain("title: pg.varchar('title')");
    expect(schema).toContain("content: pg.jsonb('content')");
    expect(schema).toContain("excerpt: pg.text('excerpt')");
  });

  it("createTableFromConfig includes tabbed fields in the Drizzle table schema", () => {
    const adapter = new DrizzleAdapter({ type: "postgres" });
    const table = (adapter as any).createTableFromConfig(postsCollection);
    
    expect(table.title).toBeDefined();
    expect(table.content).toBeDefined();
    expect(table.excerpt).toBeDefined();
    expect(table.slug).toBeDefined();
    expect(table.status).toBeDefined();
  });

  it("generateCreateColumns includes tabbed columns", () => {
    const adapter = new DrizzleAdapter({ type: "postgres" });
    const cols = (adapter as any).generateCreateColumns(postsCollection);
    
    expect(cols).toContain('"title"');
    expect(cols).toContain('"content"');
    expect(cols).toContain('"excerpt"');
  });

  it("getExpectedColumnDefs includes tabbed columns", () => {
    const adapter = new DrizzleAdapter({ type: "postgres" });
    const defs = (adapter as any).getExpectedColumnDefs(postsCollection, "posts");
    
    expect(defs["title"]).toBeDefined();
    expect(defs["content"]).toBeDefined();
    expect(defs["excerpt"]).toBeDefined();
  });

  it("prepareData and processResult process fields inside unnamed tabs", () => {
    const adapter = new DrizzleAdapter({ type: "postgres" });
    const data = {
      title: "My Post",
      slug: "my-post",
      content: { type: "doc", content: [] },
      excerpt: "",
    };

    const prepared = (adapter as any).prepareData(data, postsCollection);
    expect(prepared.title).toBe("My Post");
    expect(prepared.slug).toBe("my-post");
    expect(prepared.content).toEqual({ type: "doc", content: [] });

    const rawDbRow = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "My Post",
      slug: "my-post",
      content: { type: "doc", content: [] },
      excerpt: "Sample excerpt",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const processed = (adapter as any).processResult(rawDbRow, postsCollection);
    expect(processed.title).toBe("My Post");
    expect(processed.content).toEqual({ type: "doc", content: [] });
    expect(processed.excerpt).toBe("Sample excerpt");
  });
});
