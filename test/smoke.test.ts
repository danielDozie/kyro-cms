/**
 * ESM Import Smoke Test
 *
 * This test verifies that the built @kyro-cms/core package can be loaded
 * via ESM import() in Node without runtime errors such as:
 *   - "Dynamic require of 'path' is not supported"
 *   - "Cannot find package 'sqlite'"
 *   - "Cannot find module 'better-sqlite3'"
 *
 * Run AFTER a successful build of the core package.
 */
import { describe, it, expect } from "vitest";

describe("ESM import smoke tests", () => {
  let core: any;

  beforeAll(async () => {
    core = await import("@kyro-cms/core");
  });

  it("@kyro-cms/core index loads without errors", () => {
    expect(core).toBeDefined();
  });

  it("exports defineConfig", () => {
    expect(typeof core.defineConfig).toBe("function");
  });

  it("exports adapter factories", () => {
    expect(typeof core.createLocalAdapter).toBe("function");
    expect(typeof core.createDrizzleAdapter).toBe("function");
    expect(typeof core.createMongoDBAdapter).toBe("function");
  });

  it("exports nothing that belongs to admin", () => {
    expect(core.registerPlugin).toBeUndefined();
    expect(core.registerBlock).toBeUndefined();
    expect(core.registerField).toBeUndefined();
  });

  it("@kyro-cms/core/client loads without errors", async () => {
    let err: Error | null = null;
    try {
      await import("@kyro-cms/core/client");
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeNull();
  });

  it("@kyro-cms/core/templates loads without errors", async () => {
    let err: Error | null = null;
    try {
      await import("@kyro-cms/core/templates");
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeNull();
  });

  it("templates export collections and globals", async () => {
    const mod = await import("@kyro-cms/core/templates");
    expect(mod.minimalCollections).toBeDefined();
    expect(mod.blogCollections).toBeDefined();
    expect(mod.ecommerceCollections).toBeDefined();
    expect(mod.kitchenSinkCollections).toBeDefined();
    expect(mod.allGlobalSettings).toBeDefined();
    expect(mod.coreGlobalSettings).toBeDefined();
  });

  it("@kyro-cms/core/integration loads without errors", async () => {
    let err: Error | null = null;
    try {
      await import("@kyro-cms/core/integration");
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeNull();
  });

  it("integration exports default Astro integration factory", async () => {
    const mod = await import("@kyro-cms/core/integration");
    expect(typeof mod.default).toBe("function");
  });

  it("@kyro-cms/core/api-handler loads (expected error: kyro:config missing)", async () => {
    // API handler imports kyro:config which is a Vite alias — it only
    // works when running inside an Astro project. The test verifies the
    // error is specifically about the missing alias, not a crash.
    let err: Error | null = null;
    try {
      await import("@kyro-cms/core/api-handler");
    } catch (e) {
      err = e as Error;
    }
    expect(err).not.toBeNull();
    expect(err!.message).toContain("kyro:config");
  });

  it("defineConfig returns a valid config object", () => {
    const cfg = core.defineConfig({ adapter: {}, collections: [], auth: true });
    expect(cfg).toBeDefined();
    expect(cfg.auth).toBe(true);
    expect(Array.isArray(cfg.collections)).toBe(true);
    expect(cfg.adapter).toBeDefined();
  });

  it("defineConfig normalizes collections to array", () => {
    const cfg = core.defineConfig({
      adapter: {},
      collections: { posts: { slug: "posts", fields: [] } },
    });
    expect(Array.isArray(cfg.collections)).toBe(true);
    expect(cfg.collections).toHaveLength(1);
    expect(cfg.collections[0].slug).toBe("posts");
  });

  it("createLocalAdapter returns an adapter object", () => {
    const adapter = core.createLocalAdapter({ path: ":memory:" });
    expect(adapter).toBeDefined();
    expect(typeof adapter.init).toBe("function");
  });

  it("createDrizzleAdapter returns an adapter object", () => {
    const adapter = core.createDrizzleAdapter({ type: "sqlite", client: {}, schema: {} });
    expect(adapter).toBeDefined();
    expect(typeof adapter.init).toBe("function");
  });

  it("createMongoDBAdapter returns an adapter object", () => {
    const adapter = core.createMongoDBAdapter({ type: "mongodb", client: {}, database: "test" });
    expect(adapter).toBeDefined();
    expect(typeof adapter.init).toBe("function");
  });
});
