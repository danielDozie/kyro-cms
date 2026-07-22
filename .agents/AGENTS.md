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
