import type { BaseAdapter } from "../registry/types.js";
import type { AdapterOptions } from "./types.js";

/**
 * AdapterFactory: Implements the Factory & Lazy Dynamic Import pattern for database adapters.
 * Prevents loading unnecessary heavy database dependencies into memory unless requested.
 */
export class AdapterFactory {
  /**
   * Lazily instantiates and returns a database adapter based on configuration options.
   */
  static async createAdapter(options: AdapterOptions | { type: "local"; path?: string }): Promise<BaseAdapter> {
    const adapterType = options.type || "sqlite";

    switch (adapterType) {
      case "local": {
        const { createLocalAdapter } = await import("./local/index.js");
        const localOpts = options as { path?: string };
        return createLocalAdapter({ path: localOpts.path || "./data/kyro.db" });
      }
      case "mongodb": {
        const { createMongoDBAdapter } = await import("./mongodb/index.js");
        return createMongoDBAdapter(options as any);
      }
      case "postgres":
      case "sqlite": {
        const { createDrizzleAdapter } = await import("./drizzle/index.js");
        return createDrizzleAdapter(options as any);
      }
      default: {
        throw new Error(`[Kyro CMS] Unsupported database adapter type: "${adapterType}"`);
      }
    }
  }
}
