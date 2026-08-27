import { defineConfig, sessionDrivers } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";
import fs from "fs";
import path from "path";
import kyro from "@kyro-cms/core/integration";
import { kyroAdmin } from "./src/integration";

const isCloudflare = !!(process.env.CLOUDFLARE || process.env.CF_PAGES || process.env.PAGES);

// Node builtins that must stay external so rolldown emits ESM imports
// (bare + node: forms). Wrangler rewrites them to node: under nodejs_compat.
const NODE_BUILTINS = [
  "assert", "assert/strict", "async_hooks", "buffer", "child_process",
  "cluster", "console", "constants", "crypto", "dgram", "diagnostics_channel",
  "dns", "dns/promises", "domain", "events", "fs", "fs/promises", "http",
  "http2", "https", "module", "net", "os", "path", "path/posix", "path/win32",
  "perf_hooks", "process", "punycode", "querystring", "readline", "repl",
  "stream", "stream/consumers", "stream/promises", "stream/web",
  "string_decoder", "sys", "timers", "timers/promises", "tls",
  "trace_events", "tty", "url", "util", "util/types", "v8", "vm", "wasi",
  "worker_threads", "zlib",
];
const NODE_BUILTINS_PREFIXED = NODE_BUILTINS.map((b) => `node:${b}`);

const UPLOADS_SRC = path.join(process.cwd(), "src", "uploads");
const UPLOADS_DEST = path.join(process.cwd(), "public", "uploads");

if (fs.existsSync(UPLOADS_SRC) && !fs.existsSync(UPLOADS_DEST)) {
  fs.cpSync(UPLOADS_SRC, UPLOADS_DEST, { recursive: true });
}

export default defineConfig({
  devToolbar: {
    enabled: true,
  },
  integrations: [
    react(),
    kyro({
      adminPath: "/admin",
      apiPath: "/api",
      configPath: "../kyro.config.ts"
    }),
    kyroAdmin({
      basePath: "/admin",
      apiPath: "/api",
      disableAuth: false,
    }),
  ],
  vite: {
    plugins: [
      tailwindcss(),
      // Rewrite rolldown's __require("node:XXX") calls to proper ESM imports ONLY for Cloudflare Pages/Workers.
      ...(isCloudflare ? [(() => {
        const NODE_BUILTIN_RE = /__require\("(node:(?:buffer|crypto|events|fs|fs\/promises|http|https|module|net|os|path|stream|stream\/consumers|stream\/promises|stream\/web|string_decoder|timers|tls|url|util|util\/types|zlib)|(?:crypto|events|fs|path|stream|url|util|buffer|os|net|http|https|tls|zlib|assert|querystring|child_process|dns|module|readline|tty|vm|string_decoder|assert\/strict|timers\/promises))"\)/g;
        const BARE_TO_NODE = {
          crypto: "node:crypto", events: "node:events", fs: "node:fs",
          path: "node:path", stream: "node:stream", url: "node:url",
          util: "node:util", buffer: "node:buffer", os: "node:os",
          net: "node:net", http: "node:http", https: "node:https",
          tls: "node:tls", zlib: "node:zlib", module: "node:module",
        };
        return {
          name: "fix-node-require",
          enforce: "post",
          apply: "build",
          renderChunk(code, chunk) {
            if (!chunk.fileName.endsWith(".mjs")) return null;
            const matches = [...code.matchAll(NODE_BUILTIN_RE)];
            if (!matches.length) return null;
            const imports = new Map();
            for (const m of matches) {
              let spec = m[1];
              if (BARE_TO_NODE[spec]) spec = BARE_TO_NODE[spec];
              const varName = "__node_" + spec.replace(/[\/:]/g, "_");
              if (!imports.has(spec)) imports.set(spec, varName);
            }
            const importLines = [...imports.entries()]
              .map(([spec, varName]) => `import * as ${varName} from "${spec}";`)
              .join("\n");
            let out = code;
            for (const [spec, varName] of imports) {
              const bareName = spec.replace(/^node:/, "");
              out = out.replaceAll(
                new RegExp(`__require\\("${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\)`, "g"),
                varName
              );
              if (bareName !== spec) {
                out = out.replaceAll(
                  new RegExp(`__require\\("${bareName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\)`, "g"),
                  varName
                );
              }
            }
            // Prepend imports after initial globalThis.process lines
            const insertIdx = out.indexOf("\nimport ");
            if (insertIdx !== -1) {
              out = out.slice(0, insertIdx + 1) + importLines + "\n" + out.slice(insertIdx + 1);
            } else {
              out = importLines + "\n" + out;
            }
            return { code: out, map: null };
          },
        };
      })()] : []),
    ],
    define: {
      global: "globalThis",
    },
    resolve: {
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
      alias: {
        "@kyro-cms/core": path.resolve(process.cwd(), "..", "src"),
      },
    },
    environments: {
      ssr: {
        build: {
          rolldownOptions: {
            external: [
              ...NODE_BUILTINS,
              ...NODE_BUILTINS_PREFIXED,
              "better-sqlite3", "sharp", "ssh2", "cpu-features",
              "ioredis", "nodemailer", "jsonwebtoken", "basic-ftp",
              "aws-sdk", "@mapbox/node-pre-gyp", "mock-aws-s3", "nock",
            ],
          },
        },
      },
    },
    ssr: {
      noExternal: [
        "@tiptap/core", "@tiptap/react", "@tiptap/pm", "@tiptap/starter-kit",
        "@tiptap/extension-link", "@tiptap/extension-image", "@tiptap/extension-text-align",
        "@tiptap/extension-underline", "@tiptap/extension-highlight",
        "@tiptap/extension-task-list", "@tiptap/extension-task-item",
        "@tiptap/extension-text-style", "@tiptap/extension-color",
        "prosemirror-model", "prosemirror-state", "prosemirror-view",
        "prosemirror-schema-list", "prosemirror-commands", "prosemirror-keymap",
        "prosemirror-transform", "prosemirror-inputrules",
      ],
       external: [
         "sharp",
         "ssh2",
         "cpu-features",
         "ssh2-sftp-client",
         "ioredis",
         "nodemailer",
         "jsonwebtoken",
         "@mapbox/node-pre-gyp",
         "mock-aws-s3",
         "aws-sdk",
         "nock",
         "better-sqlite3",
         "basic-ftp",
         ...NODE_BUILTINS,
         ...NODE_BUILTINS_PREFIXED,
       ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tiptap/core", "@tiptap/react", "@tiptap/starter-kit",
        "@tiptap/extension-link", "@tiptap/extension-image", "@tiptap/extension-text-align",
        "@tiptap/extension-underline", "@tiptap/extension-highlight",
        "@tiptap/extension-task-list", "@tiptap/extension-task-item",
        "@tiptap/extension-text-style", "@tiptap/extension-color",
        "recharts",
        "lucide-react",
      ],
      needsInterop: [
        "decimal.js-light",
      ],
      exclude: [
        "sharp",
        "ssh2",
        "cpu-features",
        "ssh2-sftp-client",
        "ioredis",
        "nodemailer",
        "jsonwebtoken",
        "@mapbox/node-pre-gyp",
        "mock-aws-s3",
        "aws-sdk",
        "nock",
        "better-sqlite3",
        "virtual:kyro-plugins",
      ],
    },
  },

  output: "server",
  adapter: isCloudflare ? cloudflare() : node({
    mode: "standalone",
  }),
  session: {
    driver: sessionDrivers.memory(),
  },
  server: {
    port: 4555,
    host: true,
  },
  build: {
    inlineStylesheets: "auto",
    rolldownOptions: {
      external: [
        ...NODE_BUILTINS,
        ...NODE_BUILTINS_PREFIXED,
        "better-sqlite3", "sharp", "ssh2", "cpu-features",
        "ioredis", "nodemailer", "jsonwebtoken", "basic-ftp",
        "aws-sdk", "@mapbox/node-pre-gyp", "mock-aws-s3", "nock",
      ],
    },
  },
});
