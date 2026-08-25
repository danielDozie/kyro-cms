import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import { createRegistry } from "../src/registry/index.js";
import { createRESTAPI } from "../src/api/rest/index.js";
import type { CollectionConfig } from "../src/registry/types.js";

const postsCollection: CollectionConfig = {
  slug: "audit_posts",
  label: "Audit Posts",
  seo: true,
  access: {
    read: () => true,
    create: () => true,
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "featuredImage", type: "image" },
    { name: "content", type: "textarea", required: true },
    { name: "summary", type: "text", required: true },
  ],
};

describe("Content Health Audit API", () => {
  let adapter: LocalAdapter;
  let app: any;

  beforeAll(async () => {
    adapter = new LocalAdapter({ path: ":memory:" });
    await adapter.connect();
    await adapter.init([postsCollection]);
    const registry = createRegistry();
    registry.addCollection(postsCollection);
    app = await createRESTAPI(registry, adapter, {
      user: {
        id: "admin-user",
        role: "admin",
        email: "admin@example.com",
      } as any,
    });

    // Create a document missing SEO and image alt-text
    const createRes = await app.fetch(
      new Request("http://localhost/api/audit_posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Audit Test Post",
          featuredImage: "/hero.jpg",
          content: "Some content",
        }),
      })
    );
    expect(createRes.status).toBe(201);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it("returns content health audit report with diagnosed issues", async () => {
    const res = await app.fetch(new Request("http://localhost/api/content-health"));
    expect(res.status).toBe(200);

    const report = await res.json();
    expect(report.totalDocuments).toBe(1);
    expect(report.score).toBeLessThan(100);
    expect(Array.isArray(report.issues)).toBe(true);
    expect(report.issues.length).toBeGreaterThan(0);

    // Issues should flag missing SEO title/desc, image alt, and empty required field
    const issueTypes = report.issues.map((i: any) => i.type);
    expect(issueTypes).toContain("seo");
    expect(issueTypes).toContain("accessibility");
    expect(issueTypes).toContain("validation");
  });
});
