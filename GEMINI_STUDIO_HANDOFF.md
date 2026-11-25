# Studio implementation record — 0.15.0

This replaces the earlier backend handoff checklist. Core/Admin 0.15.0, Studio 0.2.0 and Create 0.12.76 are the prepared workspace versions; this record does not imply npm publication.

## Ownership and document model

- Core owns schema validation, permissions, document versions, persistence, reference resolution, form submission and delivery coordination.
- Admin owns the structured editor, Studio canvas, inspectors, media tools and developer workspace.
- `packages/kyro-studio` owns the shared React/Astro renderer, layout styles, fonts, icons, preview bridge and image framing helpers.
- Both editors use one canonical document and composition field. There is no saved HTML store or separate Studio content table. The editor last used never determines delivery mode.

## Implemented behavior

Global `studio.enabled` controls the mode. Studio enables visual/layout authoring and full API compositions. Headless mode hides layout tools, freezes saved layout structure/settings and projects API delivery to content only. Explicit content representation is available in REST, GraphQL and tRPC; full delivery is rejected in headless mode. Private authenticated admin reads retain canonical data for safe editing.

`/api/:collection/:id/composition` exposes permission-checked conversion summaries, revision checks, conversion and draft recovery. Local, Drizzle and MongoDB adapters support one retention-protected pre-conversion snapshot per document. A later conversion updates that slot. Recovery and conversion create drafts and never publish. Recovery metadata is excluded from normal history, latest-draft selection and autosave reuse. Explicit document/history deletion removes it.

Draft saves, explicit publication, sync status, reload recovery, unpublished block borders and published/draft browser labels use the existing lifecycle. Studio and structured editor switches warn about layouts. New generated posts/pages default to drafts while explicit settings win; generated collection maps use collection slugs.

Layout inspectors use Content / Design / Misc with conditional groups for structure, spacing, appearance, dimensions, typography, positioning, responsiveness and attributes/CSS. Backgrounds support colors, gradients and media; CSS accepts wrapper declarations only. Typography offers 14 Google Fonts, supported weights, previews and deduplicated loading. Icon fields support Lucide/Heroicons.

Media retains original files, saves crop/hotspot metadata, supports selectable framing previews and offers original access. Details animate inside the media library. Sidebar flyouts, appearance/account menus, shared overlays, compact search, diagnostics, API playgrounds and inline audit details follow the admin workspace styles.

Document History shows the latest 15 snapshots with comparison/restore controls; it does not delete older versions. The API tab separates authenticated saved responses from local editor JSON and includes copy/download/refresh/wrap controls.

## Validation and limits

The focused composition tests cover mode projection, layout freezing, permissions, revision rejection, draft-only recovery, single-slot reuse and retention protection. Drizzle SQL retention is exercised against isolated SQLite. Core, Admin and Create have separate automated test suites; source/build checks are part of release preparation.

The built-in canvas is a local shared-renderer preview, not an automatic reproduction of an arbitrary external website. Custom renderers must be registered on both sides. Remote database/deployment integrations require their own environment validation. Conversion flattens document order, not CSS visual order; users review before publishing. Timestamp/revision checks do not constitute a distributed transaction guarantee.

See `packages/kyro-studio/README.md` and the kyro-docs Studio, Admin Workspace, Drafts/Versions, Media Storage and upgrade guides for the maintained product contract.
