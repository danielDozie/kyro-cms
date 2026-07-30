import type { AstroIntegration } from "astro";
import path from "path";
import fs from "fs";

export interface KyroIntegrationOptions {
  configPath?: string;
  apiPath?: string;
  adminPath?: string;
  admin?: boolean;
  enableGraphQL?: boolean;
  enableTRPC?: boolean;
  enableWebSocket?: boolean;
}

export function kyro(options: KyroIntegrationOptions = {}): AstroIntegration {
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
    name: "@kyro-cms/astro",
    hooks: {
      "astro:config:setup": async ({ config, updateConfig, injectRoute, logger }) => {
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
              external: [
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
              ],
            },
            build: {
              rollupOptions: {
                external: [
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
                ],
              },
            },
            optimizeDeps: {
              exclude: [
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
              ],
            },
            server: {
              watch: {
                ignored: ["**/*.db", "**/*.db-journal", "**/data/**"],
              },
            },
            resolve: {
              alias: {
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
