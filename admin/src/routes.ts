export const ADMIN_ROUTES = [
  { pattern: "/", entrypoint: "@kyro-cms/admin/src/pages/admin/index.astro" },
  {
    pattern: "/api-explorer",
    entrypoint: "@kyro-cms/admin/src/pages/admin/api-explorer.astro",
  },
  {
    pattern: "/graphql",
    entrypoint: "@kyro-cms/admin/src/pages/admin/graphql.astro",
  },
  {
    pattern: "/graphql-explorer",
    entrypoint: "@kyro-cms/admin/src/pages/admin/graphql-explorer.astro",
  },
  {
    pattern: "/rest-playground",
    entrypoint: "@kyro-cms/admin/src/pages/admin/rest-playground.astro",
  },
  {
    pattern: "/webhooks",
    entrypoint: "@kyro-cms/admin/src/pages/admin/webhooks.astro",
  },
  {
    pattern: "/keys",
    entrypoint: "@kyro-cms/admin/src/pages/admin/keys.astro",
  },
  {
    pattern: "/login",
    entrypoint: "@kyro-cms/admin/src/pages/auth/login.astro",
  },
  {
    pattern: "/register",
    entrypoint: "@kyro-cms/admin/src/pages/auth/register.astro",
  },
  { pattern: "/media", entrypoint: "@kyro-cms/admin/src/pages/media.astro" },
  {
    pattern: "/users",
    entrypoint: "@kyro-cms/admin/src/pages/users/index.astro",
  },
  {
    pattern: "/users/new",
    entrypoint: "@kyro-cms/admin/src/pages/users/new.astro",
  },
  {
    pattern: "/users/[id]",
    entrypoint: "@kyro-cms/admin/src/pages/users/[id].astro",
  },
  {
    pattern: "/roles",
    entrypoint: "@kyro-cms/admin/src/pages/roles/index.astro",
  },
  {
    pattern: "/audit",
    entrypoint: "@kyro-cms/admin/src/pages/audit/index.astro",
  },
  {
    pattern: "/settings",
    entrypoint: "@kyro-cms/admin/src/pages/settings/index.astro",
  },
  {
    pattern: "/settings/[slug]",
    entrypoint: "@kyro-cms/admin/src/pages/settings/[slug].astro",
  },
  {
    pattern: "/sessions",
    entrypoint: "@kyro-cms/admin/src/pages/sessions.astro",
  },
  {
    pattern: "/preview/[collection]/[id]",
    entrypoint: "@kyro-cms/admin/src/pages/preview/[collection]/[id].astro",
  },
  {
    pattern: "/[collection]",
    entrypoint: "@kyro-cms/admin/src/pages/[collection]/index.astro",
  },
  {
    pattern: "/[collection]/[id]",
    entrypoint: "@kyro-cms/admin/src/pages/[collection]/[id].astro",
  },
];
