import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import { createRESTAPI } from "../src/api/index.js";
import { createRegistry } from "../src/index.js";
import type { CollectionConfig } from "../src/registry/types.js";

const testCollection: CollectionConfig = {
  slug: "api_posts",
  label: "API Posts",
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "body", type: "richtext" },
    { name: "status", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Published", value: "published" }] },
  ],
  timestamps: true,
};

describe("REST API Integration", () => {
  let adapter: LocalAdapter;
  let app: any;

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

  it("creates a post via API", async () => {
    const request = new Request("http://localhost/api/api_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "API Test Post", body: "Content here", status: "published" }),
    });

    const response = await app.fetch(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.data.title).toBe("API Test Post");
  });

  it("lists posts via API", async () => {
    const request = new Request("http://localhost/api/api_posts");
    const response = await app.fetch(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.docs).toBeDefined();
    expect(Array.isArray(data.docs)).toBe(true);
  });

  it("finds post by ID via API", async () => {
    const createRequest = new Request("http://localhost/api/api_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Find Me API", status: "published" }),
    });

    const createResponse = await app.fetch(createRequest);
    const created = await createResponse.json();

    const findRequest = new Request(`http://localhost/api/api_posts/${created.data.id}`);
    const findResponse = await app.fetch(findRequest);
    expect(findResponse.status).toBe(200);

    const data = await findResponse.json();
    expect(data.data.title).toBe("Find Me API");
  });

  it("updates post via API", async () => {
    const createRequest = new Request("http://localhost/api/api_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Update Me API", status: "draft" }),
    });

    const createResponse = await app.fetch(createRequest);
    const created = await createResponse.json();

    const updateRequest = new Request(`http://localhost/api/api_posts/${created.data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated API Post", status: "published" }),
    });

    const updateResponse = await app.fetch(updateRequest);
    expect(updateResponse.status).toBe(200);

    const data = await updateResponse.json();
    expect(data.data.title).toBe("Updated API Post");
  });

  it("deletes post via API", async () => {
    const createRequest = new Request("http://localhost/api/api_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Delete Me API" }),
    });

    const createResponse = await app.fetch(createRequest);
    const created = await createResponse.json();

    const deleteRequest = new Request(`http://localhost/api/api_posts/${created.data.id}`, {
      method: "DELETE",
    });

    const deleteResponse = await app.fetch(deleteRequest);
    expect(deleteResponse.status).toBe(200);

    const findRequest = new Request(`http://localhost/api/api_posts/${created.data.id}`);
    const findResponse = await app.fetch(findRequest);
    expect(findResponse.status).toBe(404);
  });

  it("filters posts via API", async () => {
    const request = new Request("http://localhost/api/api_posts?where[status]=published");
    const response = await app.fetch(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.docs).toBeDefined();
  });

  it("paginates posts via API", async () => {
    const request = new Request("http://localhost/api/api_posts?limit=2&page=1");
    const response = await app.fetch(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.limit).toBe(2);
    expect(data.page).toBe(1);
  });
});
