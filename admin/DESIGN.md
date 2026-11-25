# Kyro admin interface

The admin uses the website's orange, peach, neutral surfaces, and Geist typography. The goal is a focused content workspace with clear publishing actions and room for the work itself.

## Shared foundations

- `src/styles/main.css` defines theme tokens. Keep light and dark semantic colors together.
- `src/styles/workspace.css` defines shared workspace layouts and component refinements. Avoid recreating individual page card systems.
- `PageHeader` owns titles, breadcrumbs, descriptions, metadata, and page actions.
- `FieldLayout` owns field labels, helper text, and validation presentation.
- `Modal` owns dialog semantics, keyboard focus containment, Escape dismissal, and focus restoration. `PromptModal` reuses it.
- Use orange for primary actions and selected tabs. Use the darker accent token for readable accent text. Use semantic status colors for publishing and errors.
- Prefer whitespace and shared alignment over nested panels. Use 6px control radii and 8px panel radii. Keep text at regular or medium weights.

## Navigation and workflows

- Overview and Media stay visible. Active collection groups expand even if previously collapsed.
- Collection tables have readable headers, visible row actions, keyboard-accessible title links, filters, and pagination.
- The document browser is optional; it no longer permanently consumes editing width. The editor header contains document identity and publishing actions, followed by Content, History, and API views.
- Sidebar fields stack below the editor until there is room for a 280px inspector.
- Settings opens a directory of site globals and workspace tools. Individual globals use a vertical settings rail, which scrolls horizontally on narrow screens.
- Media has a quieter folder rail and a thumbnail grid with visible filenames and selection buttons. Opening and selecting assets are separate keyboard-accessible actions.
- The dashboard prioritizes recent website content. Catalog items remain available through its collection selector. The chart provides recorded-period controls; the all-time order distribution is labeled separately.
- Recent-content filters describe a bounded set of recent API results, not the complete database. Missing update dates are not invented. Hide the date column when no visible record supplies a timestamp.

## Studio integration boundary

Studio is an independent visual page workspace at `/admin/studio/[collection]/[id]`. It has its own full-width canvas, Layers/Insert rail, component inspector, viewport controls, and undo/redo. It reuses `AutoForm` only as a document lifecycle controller: existing authentication, drafts, publishing, and conflict handling remain the owners of persistence. Do not add a second content store or publishing pipeline.

Collections explicitly opt in with `admin.studio: { field: "content" }`, pointing to an existing blocks field. The Pages template opts in; posts, commerce records, and rich-text collections do not implicitly opt in. The ordinary structured editor remains available, with an Open Studio action on eligible collections and documents.

`@kyro-cms/studio` provides the shared browser-safe React renderer and component registry. The shared renderer implements the semantic content library and finite layout primitives. Both the canvas and consuming frontend use this component. Canvas-only field annotations map selections to inspector fields; stable block IDs survive reordering and saving. Unknown blocks remain in the document, expose schema fields, and show a renderer-unavailable message. New inserts are limited to blocks present in both the collection schema and visual registry. Block inspectors expose schema-driven content and compact Design / Misc groups. Layout insertion, design controls and Open Studio require global Studio enablement.

The canvas is isolated in a script-disabled iframe, rendered through a React portal using the shared components. It is not an iframe of an arbitrary remote website. Custom frontend components must be registered in both frontend and admin browser entry points. Connecting an external website's complete layout remains a separate preview integration; do not describe the built-in canvas as automatically reproducing an unrelated site's styles. See `packages/kyro-studio/README.md`.

Backend follow-up: some existing page and post records do not return `updatedAt`. The UI can only accurately order and display dates supplied by the existing API.

## Compact density

`src/styles/compact.css` is the final shared density layer, loaded by both admin and authentication layouts. `body.kyro-workspace` scopes its controls and portal styling.

| Purpose | Token | Default |
| --- | --- | --- |
| Standard button | `--kyro-control-height` | 32px |
| Input / large action | `--kyro-control-height-lg` | 36px |
| Small button | `.kyro-btn-sm` | 28px |
| Icon action | `.kyro-btn-icon` | 32px square |
| Control radius | `--kyro-control-radius` | 6px |
| Panel radius | `--kyro-panel-radius` | 8px |
| Panel padding | `--kyro-panel-padding` | 16px |
| Field separation | `--kyro-field-gap` | 16px |
| Caption | `--kyro-text-caption` | 12px |

Use `Button`, `IconButton`, `PageHeader`, `Dropdown`, `Modal`, and `SlidePanel` rather than independent button and overlay styles. Avoid decorative shadows and scale effects on routine controls. Borders and selection colors should carry state. Keep focus outlines.

Keep dates and other secondary columns in the Columns control. Keep advanced field groups collapsed where the schema permits. Native disclosures and native buttons must remain keyboard accessible. Dropdowns support Arrow keys and Escape; dialogs and overlay panels contain focus and restore it on dismissal. Preserve explicit schema choices about field visibility and grouping.

## Organizations, projects, folders, and appearance

- `/admin/workspaces` is an admin-only overview of configured organizations and projects. It explains the organization → project → collections relationship and links to the associated content.
- The project picker groups projects by organization, includes standalone projects, supports search, and uses compact environment abbreviations. The selected organization and full environment are available in the trigger tooltip. It filters navigation only; it does not imply database isolation or override role permissions. Only explicitly project-scoped collection links are filtered. Account, settings, and monitoring links remain role-controlled.
- Sidebar collection groups show their available collection count. Their expanded state is keyboard accessible and the active group is revealed automatically.
- Media folders have their own labeled navigation, selected-folder breadcrumb, expandable directory, and clear empty state. Folder counts describe folders, not inferred file totals. No folders or files are created by the UI redesign.
- The compact Appearance selector supports System, Light, and Dark. `src/lib/theme-client.ts` is the shared client-side owner of the saved preference, OS changes, cross-tab synchronization, and selector state. Command-palette theme changes use the same setter.

## Expanded visual composition

Pages use `studioPageBlocks`: the core semantic blocks, inline elements, layout primitives, and content/media/interactive additions. The registry currently has 38 types. Nested layout grammar is finite; no circular schema references or saved HTML are introduced. The canvas and frontend share `StudioPage` and semantic light/dark themes. Unresolved references, unknown renderers, invalid nesting, and missing form adapters block local publish preflight while draft recovery remains available.

Design, Content, Settings, and History operate on the same document controller. Settings omits the composition field. The Library and Inspector are independently collapsible and resizable, with local preference persistence and keyboard-accessible dividers. The canvas has no outer border. The backend implementation record and remaining integration limits are in `GEMINI_STUDIO_HANDOFF.md`. Browser checks alone do not validate server permissions or remote deployment behavior.

## Official Kyro mark

Use the unmodified official accent SVG from https://kyro-cms.com/logo-accent.svg, vendored at `src/assets/logo-accent.svg`, for default product branding in both themes. Sidebar, authentication, Studio, and the rich-text AI control share this asset. Configured workspace logos and favicons retain their existing precedence. Do not substitute a text-only invented mark or recolor the official asset.

## Main sidebar hierarchy

The admin sidebar separates the orange Studio launcher from ordinary workspace navigation. Overview and Media are root links; collection groups use disclosure headers and indented tree connectors without numeric counts. Administration is a separate group below a divider. Parent labels use a medium/semibold weight, leaves are smaller regular text, and the current page has the shared accent treatment. Filtering hides entire leaf rows so connectors end at the visible items.

The collapse/expand control lives at the bottom, after the account icon in the appearance/account utility row. In the collapsed rail, folder icons remain available; selecting one expands the sidebar and reveals that group. Folder expansion and sidebar minimization retain their existing saved preferences. Custom project and role filtering remain the owners of which links appear.

Document identity headers show only the document title. Collection eyebrows and the back arrow are omitted; collection navigation remains in the sidebar/document browser. Account menus use a short identity header and compact actions, with developer tools and help/resources revealed as subviews instead of a tall grouped list.

## Current document tools

Layout setting tabs, diagrams, field selectors and document action menus use square edges and compact spacing. Body labels/statuses stay at regular weight; reserve medium weight for small section titles. Metadata labels use muted color and values use primary text color.

Headless layouts display a small Read-only label above the layout name. New drafts use neutral gray; Published · Modified is reserved for a published baseline with draft changes. Changed block left borders use `--kyro-sidebar-text-active` until publication.

More actions → Convert / recover uses active sidebar surface/text tokens and an Advanced label. Its recovery list has one slot per document. History shows the latest 15 snapshots with compact comparison/restoration. The API tab shows real authenticated saved responses separately from local editor data in a bounded JSON viewer.
