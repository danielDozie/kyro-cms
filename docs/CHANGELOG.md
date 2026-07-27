# Changelog

## v0.12.21 (2026-07-27)

- **Collapsible Sidebar & Icon Rail**: Interactive minimization toggle for the admin sidebar with smooth transitions to a compact 76px icon rail mode.
- **Hover Context Tooltips**: Instant floating context tooltips on hover for minimized navigation items.
- **React Portal Dropdowns**: Upgraded `Dropdown.tsx` to mount menus via `createPortal`, floating user account menus cleanly to the right of the minimized rail without clipping.
- **Role-Based Navigation & Explorer Pruning**: Automatic filtering of sidebar links and dashboard quick-actions based on active user role permissions (`super_admin`, `admin`, `editor`, `author`, `customer`).
- **React Hydration & Vite Optimization**: Resolved React hydration mismatch errors in `UserDetail.tsx` and optimized client directives (`client:only="react"`) for dynamic dashboard metric cards and charts.

## v0.12.20 (2026-07-27)

- **Registration Controls**: Added `Enable User Registration` toggle in System Settings global (`/admin/settings/system`) to enable/disable public sign-ups on `/admin/register` and `POST /api/auth/register`.
- **Configurable Default Registration Role**: Added `Default Registration Role` setting allowing administrators to set the automatic role (`customer`, `author`, `editor`, `admin`) for newly registered users.
- **RBAC & Role Assignment Protection**: Restricted user role modifications exclusively to `super_admin` users across REST API endpoints (`POST /api/users`, `PATCH /api/users/:id`) and Admin UI components (`UserDetail`, `UserManagement`).
- **Users REST API Fix**: Fixed `GET /api/users` endpoint to query `sessionAuthAdapter.findUsers()` directly from auth storage.

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
