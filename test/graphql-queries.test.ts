import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import { createRegistry } from "../src/registry/index.js";
import { graphql } from "graphql";
import { buildGraphQLSchema, RelationLoader } from "../src/api/graphql/index.js";
import type { CollectionConfig } from "../src/registry/types.js";

const testCollection: CollectionConfig = {
  slug: "gql_posts",
  label: "GraphQL Posts",
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "state", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Published", value: "published" }], defaultValue: "draft" },
  ],
  timestamps: true,
};

describe("GraphQL API", () => {
  let adapter: LocalAdapter;
  let schema: ReturnType<typeof buildGraphQLSchema>;
  let registry: ReturnType<typeof createRegistry>;

  function makeContext() {
    return {
      db: adapter,
      registry,
      relationLoader: new RelationLoader({ db: adapter }),
    };
  }

  beforeAll(async () => {
    adapter = new LocalAdapter({ path: ":memory:" });
    await adapter.connect();
    await adapter.init([testCollection]);
    registry = createRegistry();
    registry.addCollection(testCollection);
    schema = buildGraphQLSchema({ registry, db: adapter, settings: {} });
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it("generates schema with idiomatic names", () => {
    const typeMap = schema.getTypeMap();
    expect(typeMap["GqlPost"]).toBeDefined();
    expect(typeMap["GqlPostInput"]).toBeDefined();
    expect(typeMap["GqlPostFindResult"]).toBeDefined();
  });

  it("supports create mutation", async () => {
    const query = `mutation { createGqlPost(data: { title: "Test" }) { doc { id title } message } }`;
    const result = await graphql({ schema, source: query, contextValue: makeContext() });
    expect(result.errors).toBeUndefined();
    expect(result.data?.createGqlPost?.doc?.title).toBe("Test");
  });

  it("supports findAll query", async () => {
    const query = `{ gqlPosts { docs { id title } totalDocs } }`;
    const result = await graphql({ schema, source: query, contextValue: makeContext() });
    expect(result.errors).toBeUndefined();
    expect(result.data?.gqlPosts?.docs).toBeDefined();
  });

  it("supports findById query", async () => {
    const createQuery = `mutation { createGqlPost(data: { title: "FindMe" }) { doc { id } } }`;
    const createResult = await graphql({ schema, source: createQuery, contextValue: makeContext() });
    const id = createResult.data?.createGqlPost?.doc?.id;

    const query = `{ gqlPost(id: "${id}", draft: true) { id title } }`;
    const result = await graphql({ schema, source: query, contextValue: makeContext() });
    expect(result.errors).toBeUndefined();
    expect(result.data?.gqlPost?.id).toBe(id);
  });

  it("supports count query", async () => {
    const query = `{ countGqlPosts { totalDocs } }`;
    const result = await graphql({ schema, source: query, contextValue: makeContext() });
    expect(result.errors).toBeUndefined();
    expect(typeof result.data?.countGqlPosts?.totalDocs).toBe("number");
  });

  it("supports update mutation", async () => {
    const createQuery = `mutation { createGqlPost(data: { title: "BeforeUpdate" }) { doc { id } } }`;
    const createResult = await graphql({ schema, source: createQuery, contextValue: makeContext() });
    const id = createResult.data?.createGqlPost?.doc?.id;

    const query = `mutation { updateGqlPost(id: "${id}", data: { title: "AfterUpdate" }) { doc { id title } message } }`;
    const result = await graphql({ schema, source: query, contextValue: makeContext() });
    expect(result.errors).toBeUndefined();
    expect(result.data?.updateGqlPost?.doc?.title).toBe("AfterUpdate");
  });

  it("supports delete mutation", async () => {
    const createQuery = `mutation { createGqlPost(data: { title: "ToDelete" }) { doc { id } } }`;
    const createResult = await graphql({ schema, source: createQuery, contextValue: makeContext() });
    const id = createResult.data?.createGqlPost?.doc?.id;

    const query = `mutation { deleteGqlPost(id: "${id}") { doc { id } message } }`;
    const result = await graphql({ schema, source: query, contextValue: makeContext() });
    expect(result.errors).toBeUndefined();
    expect(result.data?.deleteGqlPost?.message).toBe("Deleted successfully");
  });
});
