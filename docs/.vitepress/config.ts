import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    title: "Kyro CMS",
    description: "Astro-Native Headless CMS with Multi-Database Adapters",

    ignoreDeadLinks: true,
    lastUpdated: true,
    appearance: true,

    head: [
      ["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
      ["meta", { name: "theme-color", content: "#6366f1" }],
      [
        "meta",
        {
          name: "og:title",
          content: "Kyro CMS — Astro-Native Headless CMS",
        },
      ],
      [
        "meta",
        {
          name: "og:description",
          content:
            "Build content apps with one TypeScript config: auto-generated REST, GraphQL, tRPC, WebSocket APIs, and an admin dashboard.",
        },
      ],
      ["meta", { name: "og:type", content: "website" }],
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ],

    markdown: {
      theme: {
        light: "github-light-default",
        dark: "github-dark-default",
      },
      lineNumbers: false,
    },

    themeConfig: {
      logo: { light: "/logo.svg", dark: "/logo-white.svg" },
      siteTitle: "Kyro CMS",

      search: {
        provider: "local",
        options: {
          translations: {
            button: {
              buttonText: "Search docs...",
            },
          },
        },
      },

      nav: [
        { text: "Getting Started", link: "/getting-started" },
        { text: "Guides", link: "/guides/configuration" },
        { text: "Reference", link: "/reference/api-overview" },
        { text: "Changelog", link: "/changelog" },
      ],

      socialLinks: [
        {
          icon: "github",
          link: "https://github.com/danielDozie/kyro-cms",
        },
      ],

      sidebar: {
        "/": [
          {
            text: "Getting Started",
            collapsed: false,
            items: [
              { text: "Introduction", link: "/index" },
              { text: "Quick Start", link: "/getting-started" },
              { text: "Architecture", link: "/architecture" },
            ],
          },
          {
            text: "Guides",
            collapsed: false,
            items: [
              { text: "Astro Integration", link: "/guides/astro-integration" },
              { text: "Configuration", link: "/guides/configuration" },
              { text: "Database Adapters", link: "/guides/database-adapters" },
              { text: "Authentication", link: "/guides/authentication" },
              { text: "Access Control", link: "/guides/access-control" },
              { text: "Field Types", link: "/guides/field-types" },
              { text: "GraphQL API", link: "/guides/graphql" },
              { text: "REST API", link: "/guides/rest-api" },
              { text: "Blocks Builder", link: "/guides/blocks-builder" },
              { text: "Globals (Singletons)", link: "/guides/globals" },
              { text: "Drafts & Versioning", link: "/guides/drafts-versions" },
              { text: "Lifecycle Hooks", link: "/guides/hooks" },
              { text: "Webhooks", link: "/guides/webhooks" },
              { text: "Media Storage", link: "/guides/media-storage" },
              { text: "E-Commerce", link: "/guides/ecommerce" },
              { text: "Admin Customization", link: "/guides/admin-customization" },
              { text: "Plugins & Extensions", link: "/guides/plugins" },
              { text: "Localization & i18n", link: "/guides/localization" },
              { text: "Deployment", link: "/guides/deployment" },
            ],
          },
          {
            text: "Developer Tools",
            collapsed: true,
            items: [
              { text: "create-kyro CLI", link: "/packages/create-kyro" },
              { text: "kyro-connect SDK", link: "/packages/kyro-connect" },
              { text: "Rich Text React", link: "/packages/kyro-rich-text-react" },
              { text: "Kyro AI SDK", link: "/packages/kyro-ai" },
            ],
          },
          {
            text: "Production & Scale",
            collapsed: true,
            items: [
              { text: "SaaS Provisioning", link: "/saas-plan" },
            ],
          },
          {
            text: "Reference",
            collapsed: false,
            items: [
              { text: "API Overview", link: "/reference/api-overview" },
              { text: "CLI Reference", link: "/reference/cli" },
              { text: "Upgrade Guide", link: "/reference/upgrade-guide" },
              { text: "Changelog", link: "/changelog" },
              { text: "Roadmap", link: "/roadmap" },
            ],
          },
        ],
      },

      outline: {
        level: [2, 3],
        label: "On this page",
      },

      editLink: {
        pattern:
          "https://github.com/danielDozie/kyro-cms/edit/Stable/docs/:path",
        text: "Edit this page on GitHub",
      },

      footer: {
        message: "Released under the MIT License.",
        copyright: "Copyright © 2024-present Kyro CMS Team",
      },
    },

    mermaid: {
      theme: "dark",
      themeVariables: {
        fontSize: "13px",
        fontFamily: "'Inter', sans-serif",
        primaryColor: "#1a1a1a",
        primaryTextColor: "#ededed",
        primaryBorderColor: "rgba(255, 255, 255, 0.08)",
        lineColor: "#666666",
        secondaryColor: "#111111",
        tertiaryColor: "#0a0a0a",
      },
    },
  }),
);
