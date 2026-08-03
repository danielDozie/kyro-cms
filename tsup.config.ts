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
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  minify: true,
  target: "es2022",
  esbuildPlugins: [
    {
      name: "stub-node-modules",
      setup(build) {
        const filter = /^(fs|node:fs|fs\/promises|node:fs\/promises|child_process|node:child_process|net|node:net|tls|node:tls)$/;
        build.onResolve({ filter }, (args) => ({ path: args.path, namespace: "stub-node" }));
        build.onLoad({ filter: /.*/, namespace: "stub-node" }, (args) => {
          if (args.path.includes("child_process")) {
            return { contents: 'export default {}; export const execSync = () => ""; export const exec = () => {}; export const spawn = () => {};', loader: "js" };
          }
          if (args.path.includes("net") || args.path.includes("tls")) {
            return { contents: 'export default {}; export const isIP = () => 0; export const isIPv4 = () => false; export const isIPv6 = () => false; export const connect = () => {}; export const Socket = class {};', loader: "js" };
          }
          return {
            contents: `
              export default {};
              export const readFileSync = () => "";
              export const writeFileSync = () => {};
              export const existsSync = () => false;
              export const mkdirSync = () => {};
              export const readdirSync = () => [];
              export const statSync = () => ({ isDirectory: () => false });
              export const lstatSync = () => ({ isDirectory: () => false });
              export const readlinkSync = () => "";
              export const realpathSync = () => "";
              export const mkdir = async () => {};
              export const readdir = async () => [];
              export const stat = async () => ({ isDirectory: () => false });
              export const lstat = async () => ({ isDirectory: () => false });
              export const rename = async () => {};
              export const unlink = async () => {};
              export const writeFile = async () => {};
              export const readFile = async () => "";
              export const promises = { mkdir: async () => {}, readdir: async () => [], stat: async () => ({ isDirectory: () => false }), rename: async () => {}, unlink: async () => {}, writeFile: async () => {}, readFile: async () => "" };
            `,
            loader: "js"
          };
        });
      }
    }
  ],
  esbuildOptions(options) {
    options.conditions = ["style", "import", "module", "default"];
  },
  noExternal: [
    /^(?!(kyro:config|virtual:kyro-plugins|astro:transitions\/client|cloudflare:workers)$).*/
  ],
  platform: "node",
  external: [
    // Node built-ins (provided by Cloudflare Workers nodejs_compat)
    "crypto",
    "path",
    "os",
    "stream",
    "http",
    "https",
    "url",
    "module",
    "buffer",
    "events",
    "util",
    "process",
    "node:sqlite",
    "node:crypto",
    "node:path",
    "node:stream",
    "node:buffer",
    // Native binary C++ Node addons (optional runtime fallbacks)
    "pg-native",
    "better-sqlite3",
    "sharp",
    // Virtual modules
    "kyro:config",
    "virtual:kyro-plugins",
    "astro:transitions/client",
    "cloudflare:workers"
  ],
});
