import type { AstroIntegration } from "astro";
import path from "node:path";
import fs from "node:fs";

const resolveEntrypoint = (fileStem: string) => {
  const pkgRoot = path.join(process.cwd(), 'node_modules', '@kyro-cms', 'core');
  // In a pnpm/yarn workspace, node_modules/@kyro-cms/core is a symlink to the repo root.
  // Prefer the TypeScript source so Vite processes it directly (with @vite-ignore dynamic
  // imports), rather than following the tsup code-split dist/ chunks which have static
  // `import d from 'better-sqlite3'` that Rolldown can't resolve for Cloudflare Workers.
  const tsPath = path.resolve(pkgRoot, 'src', `${fileStem}.ts`);
  if (fs.existsSync(tsPath)) return tsPath;
  // Fallback: installed from npm — only dist/ is present.
  return path.resolve(pkgRoot, 'dist', `${fileStem}.js`);
};
const API_HANDLER_ENTRYPOINT = resolveEntrypoint("api-handler");
const GRAPHQL_HANDLER_ENTRYPOINT = resolveEntrypoint("api-handler-graphql");
const TRPC_HANDLER_ENTRYPOINT = resolveEntrypoint("api-handler-trpc");

export interface KyroIntegrationOptions {
  configPath?: string;
  apiPath?: string;
  adminPath?: string;
  admin?: boolean;
  enableGraphQL?: boolean;
  enableTRPC?: boolean;
  enableWebSocket?: boolean;
}

const KYRO_PACKAGES = [
  "@kyro-cms/core",
  "@kyro-cms/admin",
  "@kyro-cms/astro",
  "@kyro-cms/ai",
  "@kyro-cms/connect",
];

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

const KYRO_EXTERNAL_MODULES = [...KYRO_PACKAGES, ...NATIVE_BINARY_EXTERNALS];
const KYRO_SSR_EXTERNALS = [...KYRO_PACKAGES, ...NODE_BUILTINS, ...NATIVE_BINARY_EXTERNALS];

export default function kyro(options: KyroIntegrationOptions = {}): AstroIntegration {
  const {
    configPath = "./kyro.config.ts",
    apiPath = "/api",
    adminPath = "/admin",
    admin = true,
    enableGraphQL = false,
    enableTRPC = false,
    enableWebSocket = false,
  } = options;

  return {
    name: "@kyro-cms/core",
    hooks: {
      "astro:config:setup": async ({ config, updateConfig, injectRoute, logger }) => {
        logger.info(`Setting up Kyro CMS (API: ${apiPath}, Admin: ${adminPath})`);
 
        if (apiPath === adminPath) {
          throw new Error(`Kyro CMS: apiPath and adminPath cannot be the same ("${apiPath}")`);
        }

        const resolvedConfigPath = path.resolve(config.root.pathname, configPath);
        
        let finalConfigPath = resolvedConfigPath;
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
            plugins: [
              {
                name: "use-sync-external-store-shim-fix",
                enforce: "pre" as const,
                resolveId(id: string) {
                  if (
                    id === "use-sync-external-store/shim" ||
                    id === "use-sync-external-store/shim/index.js"
                  ) {
                    return "\0virtual:use-sync-external-store-shim";
                  }
                  if (
                    id === "use-sync-external-store/shim/with-selector" ||
                    id === "use-sync-external-store/shim/with-selector.js"
                  ) {
                    return "\0virtual:use-sync-external-store-shim-with-selector";
                  }
                },
                load(id: string) {
                  if (id === "\0virtual:use-sync-external-store-shim") {
                    return `export { useSyncExternalStore } from "react";`;
                  }
                  if (id === "\0virtual:use-sync-external-store-shim-with-selector") {
                    return `
import { useSyncExternalStore, useMemo } from "react";
export function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
  const memoizedSelector = useMemo(() => {
    let last, lastSnap, hasMemo = false;
    return (snap) => {
      if (!hasMemo || !Object.is(lastSnap, snap)) {
        const next = selector(snap);
        if (!hasMemo || !(isEqual ? isEqual(last, next) : Object.is(last, next))) {
          last = next; lastSnap = snap; hasMemo = true;
        }
      }
      return last;
    };
  }, [selector, isEqual]);
  const getSelection = () => memoizedSelector(getSnapshot());
  const getServerSelection = getServerSnapshot != null ? () => memoizedSelector(getServerSnapshot()) : undefined;
  return useSyncExternalStore(subscribe, getSelection, getServerSelection);
}
`;
                  }
                },
              },
            ],
            resolve: {
              alias: {
                "kyro:config": finalConfigPath,
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
 
        injectRoute({
          pattern: `${apiPath}/[...path]`,
          entrypoint: API_HANDLER_ENTRYPOINT,
        });

        if (enableGraphQL) {
          injectRoute({
            pattern: `${apiPath}/graphql`,
            entrypoint: GRAPHQL_HANDLER_ENTRYPOINT,
          });
          logger.info(`GraphQL endpoint enabled at ${apiPath}/graphql`);
        }

        if (enableTRPC) {
          injectRoute({
            pattern: `${apiPath}/trpc/[...path]`,
            entrypoint: TRPC_HANDLER_ENTRYPOINT,
          });
          logger.info(`tRPC endpoint enabled at ${apiPath}/trpc`);
        }

        if (enableWebSocket) {
          logger.info(`WebSocket support enabled (auto-starts at first request)`);
        }
      },
    },
  };
}
