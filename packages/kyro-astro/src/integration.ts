import type { AstroIntegration } from "astro";
import path from "path";
import fs from "fs";

export interface KyroIntegrationOptions {
  configPath?: string;
  apiPath?: string;
  adminPath?: string;
  admin?: boolean;
  devToolbar?: boolean;
  enableGraphQL?: boolean;
  enableTRPC?: boolean;
  enableWebSocket?: boolean;
}

/** Packages that are server-only and must be externalized from all builds */
const KYRO_SERVER_PACKAGES = [
  "@kyro-cms/core",
  "@kyro-cms/admin",
  "@kyro-cms/astro",
  "@kyro-cms/ai",
];

/** Packages that may run in the browser */
const KYRO_CLIENT_PACKAGES = [
  "@kyro-cms/connect",
];

const KYRO_ALL_PACKAGES = [...KYRO_SERVER_PACKAGES, ...KYRO_CLIENT_PACKAGES];

const NATIVE_BINARY_EXTERNALS = [
  "better-sqlite3",
  "pg",
  "mongodb",
  "ioredis",
  "sharp",
  "ssh2",
  "cpu-features",
  "ssh2-sftp-client",
  "nodemailer",
  "jsonwebtoken",
  "@mapbox/node-pre-gyp",
  "mock-aws-s3",
  "aws-sdk",
  "nock",
  "cloudflare:workers",
];

const NODE_BUILTINS = [
  "crypto", "node:crypto", "module", "node:module", "fs", "node:fs",
  "fs/promises", "node:fs/promises", "path", "node:path", "util", "node:util",
  "stream", "node:stream", "events", "node:events", "url", "node:url",
  "http", "node:http", "https", "node:https", "os", "node:os",
  "child_process", "node:child_process", "assert", "node:assert",
  "zlib", "node:zlib", "buffer", "node:buffer",
];

/** Used for build.rollupOptions.external and optimizeDeps.exclude */
const KYRO_EXTERNAL_MODULES = [...KYRO_SERVER_PACKAGES, ...NATIVE_BINARY_EXTERNALS];
/** Used for ssr.external (server-side only) */
const KYRO_SSR_EXTERNALS = [...KYRO_ALL_PACKAGES, ...NODE_BUILTINS, ...NATIVE_BINARY_EXTERNALS];

export function kyro(options: KyroIntegrationOptions = {}): AstroIntegration {
  const {
    configPath = "./kyro.config.ts",
    apiPath = "/api",
    adminPath = "/admin",
    admin = true,
    devToolbar = true,
    enableGraphQL = false,
    enableTRPC = false,
    enableWebSocket = false,
  } = options;

  return {
    name: "@kyro-cms/astro",
    hooks: {
      "astro:config:setup": async ({ config, updateConfig, injectRoute, logger, addDevToolbarApp }: any) => {
        logger.info(`Setting up Kyro CMS Astro Integration (API: ${apiPath}, Admin: ${adminPath})`);

        if (apiPath === adminPath) {
          throw new Error(`Kyro CMS: apiPath and adminPath cannot be the same ("${apiPath}")`);
        }

        const resolvedConfigPath = path.resolve(config.root.pathname, configPath);

        if (!fs.existsSync(resolvedConfigPath)) {
          logger.warn(`Kyro config file not found at ${configPath}. The API will fail to boot if collections are needed.`);
        }

        updateConfig({
          security: {
            checkOrigin: false,
          },
          vite: {
            ssr: {
              external: KYRO_SSR_EXTERNALS,
            },
            build: {
              rollupOptions: {
                external: KYRO_EXTERNAL_MODULES,
              },
            },
            optimizeDeps: {
              exclude: KYRO_EXTERNAL_MODULES,
            },
            server: {
              watch: {
                ignored: ["**/*.db", "**/*.db-*", "**/data/**", "**/public/uploads/**", "**/.kyro/**"],
              },
            },
            resolve: {
              alias: {
                debug: "debug/src/node.js",
                "kyro:config": resolvedConfigPath,
              },
            },
            define: {
              __KYRO_API_PATH__: JSON.stringify(apiPath),
              __KYRO_ADMIN_PATH__: JSON.stringify(adminPath),
              __KYRO_ENABLE_GRAPHQL__: JSON.stringify(enableGraphQL),
              __KYRO_ENABLE_TRPC__: JSON.stringify(enableTRPC),
              __KYRO_ENABLE_WS__: JSON.stringify(enableWebSocket),
            },
          },
        });

        if (enableGraphQL) {
          logger.info(`GraphQL endpoint enabled at ${apiPath}/graphql`);
        }

        if (enableTRPC) {
          logger.info(`tRPC endpoint enabled at ${apiPath}/trpc`);
        }

        if (enableWebSocket) {
          logger.info(`WebSocket support enabled`);
        }
      },
    },
  };
}

export default kyro;
