import type { KyroConfig, CollectionConfig, GlobalConfig } from "./types.js";

function normalizeCollections(
  collections:
    | CollectionConfig[]
    | Record<string, CollectionConfig>
    | undefined,
): CollectionConfig[] {
  if (!collections) return [];
  if (Array.isArray(collections)) return collections;
  return Object.values(collections);
}

function normalizeGlobals(
  globals: GlobalConfig[] | Record<string, GlobalConfig> | undefined,
): GlobalConfig[] {
  if (!globals) return [];
  if (Array.isArray(globals)) return globals;
  return Object.values(globals);
}

export type UserKyroConfig = Omit<KyroConfig, "collections" | "globals"> & {
  collections?: CollectionConfig[] | Record<string, CollectionConfig>;
  globals?: GlobalConfig[] | Record<string, GlobalConfig>;
};

export function defineConfig(config: UserKyroConfig): KyroConfig {
  return {
    ...config,
    collections: normalizeCollections(config.collections),
    globals: normalizeGlobals(config.globals),
  };
}

export const defineKyroConfig = defineConfig;
