# Kyro CMS Project — AI Agent Guidelines

This project is built using **Kyro CMS** packages installed from npm:
- `@kyro-cms/core`: Headless CMS engine & API handlers
- `@kyro-cms/admin`: React Admin Dashboard UI

Official Documentation: https://kyro-cms.com

---

## 🏗️ Configuration & Architecture

- **`kyro.config.ts`**: The single configuration file defining collections, fields, database adapters, auth, and storage settings.
- **`src/pages/api/[...kyro].ts`**: Auto-generated API route handler for REST, GraphQL, tRPC, and WebSocket endpoints.
- **`http://localhost:4321/admin`**: The Admin Dashboard URL.

---

## 🛠️ Common Commands

- **`npm run dev`**: Start the Astro & Kyro dev server
- **`npm run build`**: Build for production

---

## 📝 Recent Architectural Decisions & Changes (Aug 2026)

- **`defineKyroConfig` Standardization**: All user configuration examples in `kyro.config.ts` are standardized on `defineKyroConfig` instead of `defineConfig` to prevent collisions with Astro/Vite configuration utilities.
- **Local DB Path Standard**: Replaced complex Node.js `path`/`fs` lazy-loading code block boilerplate with standard path parameter: `createLocalAdapter({ path: "./data/kyro.db" })`.
- **Bulletproof Non-Interactive Scaffolding**: Added automatic Non-TTY terminal fallback checks (`!process.stdout.isTTY` detection) and manual option scanning inside `create-kyro` CLI parsing so background/automated deployment servers never hang waiting for stdin prompts.
- **Coming Soon Mode & Deployment Pause**:
  - Halted active development on user deployment features.
  - Disabled the `Deploy to Cloudflare` button with visual disabled styling (`opacity: 0.45`, `cursor: not-allowed`, `pointer-events: none`).
  - Added an absolute-positioned, subtle purple notification badge (`COMING SOON` with a pulsing dot) to the trigger button in `DeployModal.vue`.
  - Removed the `Deployment` option and links from the documentation sidebar navigation (`.vitepress/config.ts`).
- **Core Engine & API Performance Optimizations**:
  - **Batched Relationship Population**: Optimized `populateRelationships` (`src/utils/populate.ts`) to use single batched `in` queries per collection layer instead of $O(N)$ sequential DB lookups per document ID.
  - **Zero-Latency Access Control Checks**: Replaced per-request async DB queries in `checkAccessEnabled()` (`src/api-handler.ts`) with synchronous reads from cached instance settings.
  - **Single-Pass Config Overrides**: Refactored `updateFieldByPath()` (`src/createKyro.ts`) to combine exact-match and structural wrapper traversals into a single-pass loop.
  - **Field Helper Consolidation**: Extracted field data normalization (`normalizeEmptyStrings`, `convertRichtextFields`, `clearUniqueFields`) from `hono-app.ts` into reusable `src/utils/field-helpers.ts` exports.
  - **Type Assertion Safety**: Replaced loose `as any` type casts in `src/createKyro.ts` with explicit TypeScript interface assertions (`KyroConfig`, `DrizzleAdapter`, `createKyroServer`).
  - **Configurable Logger System**: Implemented `Logger` utility (`src/utils/logger.ts`) supporting level-gated output (`debug`, `info`, `warn`, `error`) driven by `KYRO_LOG_LEVEL`.
  - **Deduplicated Integration Externals**: Consolidated external dependencies in `src/integration.ts` into shared module constants (`KYRO_PACKAGES`, `NATIVE_BINARY_EXTERNALS`, `NODE_BUILTINS`).
