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

export function defineConfig(config: {
  collections?: CollectionConfig[] | Record<string, CollectionConfig>;
  globals?: GlobalConfig[] | Record<string, GlobalConfig>;
  adapter: KyroConfig["adapter"];
  plugins?: KyroConfig["plugins"];
  auth?: KyroConfig["auth"];
  cors?: KyroConfig["cors"];
  admin?: KyroConfig["admin"];
  upload?: KyroConfig["upload"];
  graphQL?: KyroConfig["graphQL"];
  typescript?: KyroConfig["typescript"];
  localization?: KyroConfig["localization"];
  rateLimit?: KyroConfig["rateLimit"];
  debug?: KyroConfig["debug"];
}): KyroConfig {
  return {
    collections: normalizeCollections(config.collections),
    globals: normalizeGlobals(config.globals),
    adapter: config.adapter,
    plugins: config.plugins,
    auth: config.auth,
    cors: config.cors,
    admin: config.admin,
    upload: config.upload,
    graphQL: config.graphQL,
    typescript: config.typescript,
    localization: config.localization,
    rateLimit: config.rateLimit,
    debug: config.debug,
  };
}

export const defineKyroConfig = defineConfig;
