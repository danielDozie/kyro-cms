# Changelog

## v0.12.18 (2026-07-25)

- **Collection Overrides & Dynamic Content**: Full support for overriding dynamic content & block fields (e.g. `"content.recentFeed.selectedItems"`).
- **Admin UI & Layout Fixes**: Fixed `TabsLayout` key preservation during hot reload, excluded discriminator field names from tab item headers, and improved dynamic relationship target title resolution.
- **Astro Integration**: Added React deduplication in Astro Vite configuration and fixed SEO tab selector for collection fields.
- **Templates**: Updated `menuCollection` template to include an optional label field for external links.

## v0.12.17 (2026-07-24)

- **Collection Overrides**: Added support for overriding dynamic content & block fields (e.g. `"content.recentFeed.selectedItems"`).
- **Admin UI Enhancements**: Improved array item header resolution (dynamic relationship target title fetching, discriminator name filtering).
- **SEO Tabs Integration**: Automatic injection of SEO Settings tab for collections with `seo: true`.
- **Database Migrations**: Added database-agnostic legacy tabs flattening utility (`scripts/flatten-tabs.mjs`).

## v0.12.16 (2026-07-21)

- Rebuild and release of Kyro CMS v0.12.16.
