import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
    "trpc/index": "src/api/trpc/index.ts",
    "graphql/index": "src/api/graphql/index.ts",
    "rest/index": "src/api/rest/index.ts",
    "ws/index": "src/api/ws/index.ts",
    "drizzle/index": "src/database/drizzle/index.ts",
    "mongodb/index": "src/database/mongodb/index.ts",
    "cli/index": "src/cli/index.ts",
    "templates/index": "src/templates/index.ts",
    "fields/index": "src/fields/index.ts",
    integration: "src/integration.ts",
    "api-handler": "src/api-handler.ts",
    "api-handler-graphql": "src/api-handler-graphql.ts",
    "api-handler-trpc": "src/api-handler-trpc.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  minify: true,
  target: "es2022",
  noExternal: [
    "recharts",
    "react-i18next",
    "i18next",
    "i18next-browser-languagedetector",
    "eventemitter3"
  ],
  platform: "node",
  external: [
    // Database clients
    "pg",
    "mongodb",
    "better-sqlite3",
    // ORMs / query builders
    "drizzle-orm",
    // API / transport
    "@trpc/server",
    "@trpc/client",
    "hono",
    "ws",
    // Auth / crypto
    "ioredis",
    "bcrypt",
    "bcryptjs",
    "jsonwebtoken",
    // Email
    "nodemailer",
    // Storage
    "sharp",
    "ssh2",
    "ssh2-sftp-client",
    "basic-ftp",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    // CLI
    "commander",
    "ora",
    "chalk",
    // Misc
    "glob",
    "esbuild",
    // Node built-ins (shouldn't be bundled)
    "crypto",
    "fs",
    "path",
    "os",
    "stream",
    "http",
    "https",
    "net",
    "tls",
    "url",
    "module",
    "node:sqlite",
    // Virtual modules
    "kyro:config",
    "virtual:kyro-plugins",
    "astro:transitions/client",
  ],
});
