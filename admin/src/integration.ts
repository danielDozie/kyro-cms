import type { AstroIntegration } from "astro";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { build } from "esbuild";
import { config as loadDotEnv } from "dotenv";
import { Worker } from "worker_threads";
import { useSyncExternalStoreShimPlugin } from "./lib/vite-shim-plugin";

const _shimDir = path.resolve(new URL(".", import.meta.url).pathname, "lib/shim");
const _shimUses = path.join(_shimDir, "use-sync-external-store.js");
const _shimUsesWs = path.join(_shimDir, "use-sync-external-store-with-selector.js");

export interface KyroAdminOptions {
  basePath?: string;
  apiPath?: string;
  configPath?: string;
}

export function kyroAdmin(options: KyroAdminOptions = {}): AstroIntegration {
  const {
    basePath = "/admin",
    apiPath = "/api",
    configPath = "kyro.config.ts",
  } = options;

  return {
    name: "@kyro-cms/admin",
    hooks: {
      "astro:config:setup": async ({ config, updateConfig, injectRoute, logger }) => {
        logger.info(`Kyro Admin mounted at ${basePath} (API: ${apiPath})`);

        const fallbackConfig = path.resolve(
          new URL(".", import.meta.url).pathname,
          "lib/default-kyro-config.ts",
        );

        // Try to resolve config from root first, then admin local
        const rootConfig = path.resolve(config.root.pathname, "..", configPath);
        const localConfig = path.resolve(config.root.pathname, configPath);

        const resolvedConfig = fs.existsSync(rootConfig)
          ? rootConfig
          : fs.existsSync(localConfig)
            ? localConfig
            : fallbackConfig;

        if (resolvedConfig !== fallbackConfig) {
          logger.info(`Loaded config from ${resolvedConfig}`);
        } else {
          logger.warn(`Config file not found. Using defaults.`);
        }

        // Transpile the user's config and write a serialized JSON copy.
        // The JSON path is injected via Vite's define so the admin can read it reliably.
        const configFile = path.join(path.dirname(resolvedConfig), ".kyro-admin-config.json");
        let tmpFile = "";
        try {
          const envPath = path.join(path.dirname(resolvedConfig), ".env");
          if (fs.existsSync(envPath)) {
            loadDotEnv({ path: envPath });
          }
          const result = await build({
            entryPoints: [resolvedConfig],
            bundle: true,
            format: "esm",
            platform: "node",
            target: "es2022",
            write: false,
            sourcemap: false,
            loader: { '.ts': 'ts', '.tsx': 'tsx' },
            resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'],
            external: ['@kyro-cms/*', '@ai-sdk/*'],
          });
          tmpFile = resolvedConfig.replace(/\.ts$/, ".admin.mjs");
          fs.writeFileSync(tmpFile, result.outputFiles[0].text, "utf8");

          // Use a Worker thread to load the config in an isolated context.
          const workerCode = `
            import { parentPort } from 'worker_threads';
            import('${pathToFileURL(tmpFile).href}').then(mod => {
              const cfg = mod.default || mod;
              const serialize = (obj, key) => {
                if (obj === null || obj === undefined) return obj;
                if (typeof obj === 'function') {
                  if (key === 'options') return "__KYRO_DYNAMIC_OPTIONS__";
                  return undefined;
                }
                if (Array.isArray(obj)) return obj.map((v) => serialize(v));
                if (typeof obj === 'object') {
                  const result = {};
                  for (const [k, v] of Object.entries(obj)) {
                    const sv = serialize(v, k);
                    if (sv !== undefined) result[k] = sv;
                  }
                  return result;
                }
                return obj;
              };
              parentPort.postMessage({
                collections: serialize(cfg?.collections) || [],
                globals: serialize(cfg?.globals) || [],
                collectionOverrides: serialize(cfg?.admin?.collectionOverrides) || {},
                plugins: (cfg?.plugins || []).map((p: any) => ({
                  name: p.name,
                  adminEntry: p.adminEntry
                }))
              });
            }).catch(err => {
              parentPort.postMessage({ error: err.message });
            });
          `;
          const worker = new Worker(workerCode, { eval: true, env: { ...process.env, NODE_OPTIONS: '' } });
          const configResult = await new Promise<any>((resolve, reject) => {
            worker.on("message", resolve);
            worker.on("error", reject);
            const timer = setTimeout(() => {
              worker.terminate();
              reject(new Error("Config loading timed out"));
            }, 30000);
          });
          worker.terminate();

          if (configResult.error) {
            throw new Error(configResult.error);
          }

          // Mirror the registry's SEO tab injection so the admin schema JSON
          // has the same tabs as the server-side registry at runtime.
          const seoFields = [
            { name: "metaTitle", type: "text", label: "Meta Title", admin: { description: "The title used for search engines (recommended < 60 chars).", autoGenerate: "title" } },
            { name: "metaDescription", type: "textarea", label: "Meta Description", admin: { description: "A brief summary for search engines (recommended < 160 chars).", autoGenerate: "content" } },
            { name: "keywords", type: "text", label: "Keywords", admin: { description: "Comma-separated list of keywords for this page." } },
            { name: "ogImage", type: "upload", label: "OpenGraph Image", relationTo: "media", admin: { description: "The image shown when shared on social media." } },
            {
              name: "twitter", type: "group", label: "Twitter Card", fields: [
                { name: "title", type: "text", label: "Twitter Title" },
                { name: "description", type: "textarea", label: "Twitter Description" },
                { name: "image", type: "upload", label: "Twitter Image", relationTo: "media" },
              ]
            },
            {
              name: "advanced", type: "group", label: "Advanced Search Settings", fields: [
                { name: "noindex", type: "checkbox", label: "Hide from search engines (noindex)", defaultValue: false },
                { name: "nofollow", type: "checkbox", label: "Do not follow links (nofollow)", defaultValue: false },
                { name: "canonicalUrl", type: "text", label: "Canonical URL Override", admin: { description: "Leave empty to use the default canonical URL." } },
                { name: "structuredData", type: "code", label: "JSON-LD Structured Data", admin: { description: "Custom JSON-LD schema for this specific page." } },
              ]
            },
          ];
          for (const col of (configResult.collections || [])) {
            if (col.seo) {
              const tabsField = col.fields?.find((f: any) => f.type === 'tabs');
              if (tabsField?.tabs) {
                // Only add if not already injected (avoid duplicates on hot-reload)
                if (!tabsField.tabs.find((t: any) => t.label === 'SEO Settings')) {
                  tabsField.tabs.push({ label: "SEO Settings", fields: seoFields });
                }
              }
            }
          }

          fs.writeFileSync(configFile, JSON.stringify(configResult, null, 2), "utf8");
          logger.info("Project config loaded for admin");
        } catch (e: any) {
          logger.error(`Could not load project config: ${e.message}`);
        } finally {
          if (tmpFile && fs.existsSync(tmpFile)) { try { fs.unlinkSync(tmpFile); } catch { /* ignore */ } }
        }

        // Set up Vite aliases, defines, and plugins for runtime use
        updateConfig({
          vite: {
            plugins: [
              useSyncExternalStoreShimPlugin(),
              {
                name: "kyro-plugins-virtual",
                resolveId(id: string) {
                  if (id === "virtual:kyro-plugins" || id.endsWith("virtual-kyro-plugins") || id.endsWith("virtual-kyro-plugins.ts") || id.endsWith("virtual-kyro-plugins.js")) {
                    return "\0virtual-kyro-plugins";
                  }
                },
                load(id: string) {
                  if (id === "\0virtual-kyro-plugins") {
                    try {
                      const configData = JSON.parse(fs.readFileSync(configFile, "utf8"));
                      const pluginsWithAdmin = (configData.plugins || []).filter((p: any) => p.adminEntry);

                      let imports = `import { lazy } from 'react';\n`;
                      let views = `export const pluginViews = {\n`;

                      for (const p of pluginsWithAdmin) {
                        // Vite requires absolute paths for local files or bare specifiers for packages
                        views += `  '${p.name}': lazy(() => import('${p.adminEntry}')),\n`;
                      }

                      views += `};\n`;
                      const configExport = `export const projectConfig = ${JSON.stringify(configData)};\n`;
                      return imports + views + configExport;
                    } catch (e) {
                      return `export const pluginViews = {};\nexport const projectConfig = null;\n`;
                    }
                  }
                }
              },
              {
                name: "kyro-admin-tsx-loader",
                enforce: "pre" as const,
                config(_config: any) {
                  return {
                  };
                },
              },
              {
                name: "kyro-cjs-shim",
                enforce: "pre" as const,
                resolveId(id: string) {
                  if (id.includes('react/compiler-runtime')) {
                    return "\0react-compiler-runtime";
                  }
                  if (id === 'debug' || id.includes('debug/src/browser.js')) {
                    return "\0debug-browser";
                  }
                },
                load(id: string) {
                  if (id === "\0react-compiler-runtime") {
                    return `
import React from "react";
export function c(size) {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (!internals || !internals.H) {
    return new Array(size);
  }
  return internals.H.useMemoCache(size);
}
`;
                  }
                  if (id === "\0debug-browser") {
                    return `
function debug(namespace) {
  function d(...args) {
    if (typeof localStorage !== "undefined" && localStorage.getItem("DEBUG")) {
    }
  }
  d.enabled = false;
  return d;
}
debug.enable = function() {};
debug.disable = function() {};
debug.enabled = function() { return false; };
debug.default = debug;
module.exports = debug;
`;
                  }
                },
              },
            ],
            resolve: {
              alias: {
                "kyro:config": resolvedConfig,
              },
              dedupe: ["react", "react-dom"],
            },
            optimizeDeps: {
              include: [
                '@kyro-cms/admin > recharts',
                '@kyro-cms/admin > recharts > decimal.js-light',
                '@kyro-cms/admin > react-i18next',
                '@kyro-cms/admin > react-i18next > html-parse-stringify',
                '@kyro-cms/admin > react-i18next > html-parse-stringify > void-elements',
                '@kyro-cms/admin > use-sync-external-store',
                '@kyro-cms/admin > use-sync-external-store/with-selector.js',
              ],
              needsInterop: [
                '@kyro-cms/admin > recharts > decimal.js-light',
                '@kyro-cms/admin > react-i18next > html-parse-stringify > void-elements',
                '@kyro-cms/admin > use-sync-external-store',
                '@kyro-cms/admin > use-sync-external-store/with-selector.js',
              ],
              exclude: ['debug', 'react/compiler-runtime', '@kyro-cms/admin'],
            },
            define: {
              __KYRO_ADMIN_PATH__: JSON.stringify(basePath),
              __KYRO_API_PATH__: JSON.stringify(apiPath),
              __KYRO_ADMIN_CONFIG_FILE__: JSON.stringify(configFile),
            },
            ssr: {
              noExternal: [
                '@kyro-cms/admin', '@kyro-cms/core',
                '@tiptap/core', '@tiptap/react', '@tiptap/pm', '@tiptap/starter-kit',
                '@tiptap/extension-link', '@tiptap/extension-image', '@tiptap/extension-text-align',
                '@tiptap/extension-underline', '@tiptap/extension-highlight',
                '@tiptap/extension-task-list', '@tiptap/extension-task-item',
                '@tiptap/extension-text-style', '@tiptap/extension-color',
                'prosemirror-model', 'prosemirror-state', 'prosemirror-view',
                'prosemirror-schema-list', 'prosemirror-commands', 'prosemirror-keymap',
                'prosemirror-transform', 'prosemirror-inputrules',
              ],
            },
          },
        });

        // Load the user's config at runtime via the kyro:config alias.
        // We set a placeholder here; the actual config is loaded by
        // admin/lib/config.ts via dynamic import of kyro:config.
        (globalThis as any).__KYRO_ADMIN_PROJECT_CONFIG__ = {
          collections: [],
          globals: [],
          adapter: null,
        };

        // Inject Admin UI Routes
        const pages = [
          { pattern: "", entrypoint: "./pages/index.astro" },
          { pattern: "/login", entrypoint: "./pages/auth/login.astro" },
          { pattern: "/register", entrypoint: "./pages/auth/register.astro" },
          { pattern: "/auth/check-email", entrypoint: "./pages/auth/check-email.astro" },
          { pattern: "/auth/forgot-password", entrypoint: "./pages/auth/forgot-password.astro" },
          { pattern: "/auth/reset-password", entrypoint: "./pages/auth/reset-password.astro" },
          { pattern: "/auth/verify-email", entrypoint: "./pages/auth/verify-email.astro" },
          { pattern: "/media", entrypoint: "./pages/media.astro" },
          { pattern: "/users", entrypoint: "./pages/users/index.astro" },
          { pattern: "/users/new", entrypoint: "./pages/users/new.astro" },
          { pattern: "/users/[id]", entrypoint: "./pages/users/[id].astro" },
          { pattern: "/roles", entrypoint: "./pages/roles/index.astro" },
          { pattern: "/settings", entrypoint: "./pages/settings/index.astro" },
          {
            pattern: "/settings/[slug]",
            entrypoint: "./pages/settings/[slug].astro",
          },
          { pattern: "/audit", entrypoint: "./pages/audit/index.astro" },
          { pattern: "/sessions", entrypoint: "./pages/sessions.astro" },
          { pattern: "/keys", entrypoint: "./pages/keys.astro" },
          { pattern: "/webhooks", entrypoint: "./pages/webhooks.astro" },
          { pattern: "/plugins", entrypoint: "./pages/plugins.astro" },
          { pattern: "/marketplace", entrypoint: "./pages/marketplace.astro" },
          { pattern: "/graphql", entrypoint: "./pages/graphql.astro" },
          {
            pattern: "/rest-playground",
            entrypoint: "./pages/rest-playground.astro",
          },
          { pattern: "/health", entrypoint: "./pages/health.astro" },
          { pattern: "/403", entrypoint: "./pages/403.astro" },
          { pattern: "/graphql-explorer", entrypoint: "./pages/graphql-explorer.astro" },
          {
            pattern: "/[collection]",
            entrypoint: "./pages/_collection/index.astro",
          },
          {
            pattern: "/[collection]/[id]",
            entrypoint: "./pages/_collection/[id].astro",
          },
        ];

        for (const page of pages) {
          const pattern = `${basePath}${page.pattern}`.replace(/\/$/, "");
          injectRoute({
            pattern: pattern || "/",
            entrypoint: path.resolve(
              new URL(".", import.meta.url).pathname,
              page.entrypoint,
            ),
          });
        }

        // API Catch-All Route is now exclusively handled by @kyro-cms/core kyro() integration
      },
      "astro:build:done": ({ logger }) => {
        logger.info("Kyro Admin build complete");
      },
    },
  };
}
