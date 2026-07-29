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
    ],
    define: {
      global: "globalThis",
    },
    resolve: {
      alias: {
        "@kyro-cms/core": path.resolve(process.cwd(), "..", "src"),
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
      ],
    },
    optimizeDeps: {
      include: [
        "@tiptap/core", "@tiptap/react", "@tiptap/starter-kit",
        "@tiptap/extension-link", "@tiptap/extension-image", "@tiptap/extension-text-align",
        "@tiptap/extension-underline", "@tiptap/extension-highlight",
        "@tiptap/extension-task-list", "@tiptap/extension-task-item",
        "@tiptap/extension-text-style", "@tiptap/extension-color",
        "recharts",
        "recharts > recharts-scale",
        "recharts > recharts-scale > decimal.js-light",
        "recharts > react-smooth",
        "recharts > react-smooth > react-transition-group",
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
  },
});
