import { defineConfig } from "tsup";
import { builtinModules } from "module";

// Built-in Node.js modules and node: prefixed imports
const NODE_BUILTINS = [
  ...builtinModules,
  ...builtinModules.map((mod) => `node:${mod}`),
  "process",
];

// Native binary C++ Node addons & virtual Astro modules
const NATIVE_AND_VIRTUAL_EXTERNALS = [
  "pg-native",
  "better-sqlite3",
  "sharp",
  "kyro:config",
  "virtual:kyro-plugins",
  "astro:transitions/client",
  "cloudflare:workers",
];

const ALL_EXTERNALS = [...NODE_BUILTINS, ...NATIVE_AND_VIRTUAL_EXTERNALS];

// Escape regex special chars
const externalPattern = ALL_EXTERNALS
  .map((s) => s.replace(/[\/\\^$*+?.()|[\]{}]/g, "\\$&"))
  .join("|");

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
  shims: true,
  banner({ format }) {
    if (format === "esm") {
      return {
        js: `import { createRequire as __createRequire } from "module"; var require = __createRequire(import.meta.url);`,
      };
    }
  },
  splitting: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  minify: true,
  target: "es2022",
  platform: "node",
  esbuildOptions(options) {
    options.conditions = ["style", "import", "module", "default"];
  },
  noExternal: [new RegExp(`^(?!(${externalPattern})$).*`)],
  external: ALL_EXTERNALS,
});
