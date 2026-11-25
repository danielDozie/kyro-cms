# Kyro Studio: visual composition, headless content

Studio edits the existing page document's blocks. The Admin editor remains available for structured content. There is no separate Studio database, HTML content store, or publishing pipeline.

## Enable a page collection

```ts
const pages = {
  slug: "pages",
  admin: { studio: { field: "content" } },
  fields: [{ name: "content", type: "blocks", blocks: [heroBlock] }],
  versions: { drafts: true },
};
```

Studio requires `versions: { drafts: true }` so saving work cannot silently publish it. The built-in Pages template opts in. Other collections stay in the structured editor unless explicitly enabled. `studio.field` supports nested paths through named tabs and groups. Authentication and the collection's read/create/update permissions still apply.

## Render on a React frontend

```tsx
import { StudioPage } from "@kyro-cms/studio";

export function Page({ page }) {
  return <StudioPage blocks={page.content || []} />;
}
```

Fetch `page` using the existing Kyro SDK/API. The shared Hero renderer implements the existing `hero` schema (`isMultiScreen`, `singleSlide`, `multiSlides`). No editor metadata is emitted unless `editing` is enabled. Hero carousel controls are available in Interact mode and in the hydrated frontend renderer. Extra semantic elements render alongside their owning block and remain editable in the inspector.

In an Astro website with `@astrojs/react` installed, the same renderer can be server rendered:

```astro
---
import { StudioPage } from "@kyro-cms/studio";
// Fetch a published page through your existing Kyro client.
const { page } = Astro.props;
---
<StudioPage blocks={page.content || []} />
```

## Use your own website components

Register the same component definition in the website and the admin's browser plugin entry. Keep this module browser-safe; never import server configuration, database adapters, or secrets.

```tsx
import { registerStudioComponent } from "@kyro-cms/studio";
import { WebsiteHero } from "./WebsiteHero";

registerStudioComponent({
  type: "hero", // matches the collection's block slug
  label: "Hero",
  defaults: { isMultiScreen: false, singleSlide: { title: "Hello" } },
  editableFields: ["singleSlide"],
  Component: ({ block, editing }) => (
    <WebsiteHero
      data={block.singleSlide}
      titleAttributes={editing ? { "data-kyro-field": "singleSlide.title" } : {}}
    />
  ),
});
```

Your component owns its website styles. Inline component styles or styles loaded inside that component work in the iframe. For CSS files, the integration must include those styles in the iframe too; the canvas does not inherit the admin or host document's styles. `data-kyro-field` is a path relative to a block, not a database identifier. Runtime registration updates the admin component library. Blocks absent from the page schema cannot be inserted.

For isolated rendering, `createStudioRegistry([...definitions])` and `<StudioPage registry={registry} ... />` avoid mutating the shared default registry. If you have other block types, register their renderers or supply `renderUnknown`; the built-in registry implements the complete library listed below.

## First version boundaries

- Independent canvas, section selection, schema-backed inspector, insertion, up/down ordering, removal, undo/redo, desktop/tablet/mobile canvas sizes.
- Ordinary structured blocks with stable IDs; existing draft/publish APIs and conflict handling.
- Shared React components, not automatic conversion of arbitrary HTML or Astro components.
- Structured nested layout editing and drag/drop are supported; arbitrary CSS design and a remote website bridge remain separate integrations.
- Canvas sizes represent layout widths, not a mobile browser emulator.

The shared renderer makes the registered library usable on a frontend today. Integrating a complete existing website requires registering its actual components and styles; a generic rendering of fields is not a substitute for that integration.

## Expanded library and unified workflow

The built-in library now covers all core semantic blocks, their inline elements, and basic layout/content additions (38 registered types). Use `studioPageBlocks` from the core templates export in your collection schema to allow the complete library; the registry never bypasses a collection's allowed block list.

```ts
import { studioPageBlocks } from "@kyro-cms/core/templates";
// In a server-side collection configuration:
const page = {
  slug: "pages",
  admin: { studio: { field: "content" } },
  fields: [{ name: "content", type: "blocks", blocks: studioPageBlocks }],
  versions: { drafts: true },
};
```

- Layout: Section, Container, Row, Column, Grid, Spacer, Divider.
- Content: Heading, Paragraph, Rich text, Button, List, Quote, Icon, Badge, Notice.
- Media: Image, Gallery, Video, Video showcase.
- Marketing: Hero, Cards, Feature split/grid, CTA, Testimonials, Stats, Logos, Pricing, Team, Process steps.
- Interactive: FAQ, Accordion, Tabs.
- Dynamic: Content feed and Form (require permitted resolved references and, for forms, a real submission adapter).

The Section → Container/Row/Grid → Column → content hierarchy is finite and serializable. Components have stable IDs across moves, duplicate operations generate fresh IDs, and the Layers tree supports nested selection and drag/drop into allowed containers. Up/down controls are also available. Search and grouped insertion respect the selected container. Property arrays expand the item selected on the canvas.

Design, Content, Settings, and History are views of ONE canonical document. Content exposes the structured fields, Settings excludes the composition and slug controls while retaining other page metadata, and History reuses the CMS version actions. Published rendering is independent of which editor last changed the document.

## Theme and frontend adapter

The renderer accepts `theme="system" | "light" | "dark"` and uses matching semantic surface, text, accent, and border tokens. Studio follows the workspace preference and offers the compact System/Light/Dark control. Theme preference is not written into the composition.

```astro
---
import KyroStudioPage from "@kyro-cms/studio/components/KyroStudioPage.astro";
import { resolveStudioReferences } from "@kyro-cms/studio";
// `page` must be the published version fetched by your existing frontend route.
const { page, client } = Astro.props;
const references = await resolveStudioReferences(page.content || [], async (collection, id) => {
  // Adapt this callback to your existing SDK read, preserving its auth/access rules.
  const response = await fetch(new URL(`/api/${collection}/${encodeURIComponent(id)}?draft=false`, Astro.url.origin));
  if (!response.ok) return undefined;
  return (await response.json()).data;
});
---
<KyroStudioPage blocks={page.content || []} references={references} theme="system" />
```

The Astro adapter requires the site's React integration and hydrates the shared components for carousel and tab interactions. A custom form integration belongs in a frontend React wrapper that imports/registers its actual form component, not a serialized function prop.

`collectStudioReferences`, `resolveStudioReferences`, and `getStudioIssues` support preflight and rendering. Unresolved references, missing component renderers, invalid nesting, and missing form adapters are explicit issues; the shared public renderer throws rather than silently omitting content. The Studio publish button blocks on these local preflight issues while still allowing draft saves. Server enforcement, connected deployment capabilities, preview sessions, forms, and delivery coordination are implemented in the core Studio routes. See the Studio guide on the documentation site for endpoint details.

The canvas has no outer border. Its Library and Inspector panels open independently, resize by dragging or arrow keys, and remember their sizes. Double-click a divider to reset its width. Smaller screens stack the editing panes instead of forcing desktop widths.

## Layout design controls

Section, Container, Row, Column, and Grid support content width, custom pixel dimensions, direction, alignment, distribution, preset and per-side spacing, individual row/column gaps, and overflow. Grid controls apply to Grid layouts.

Backgrounds support theme presets, custom colors, gradients, images, and muted looping videos. Media is chosen through upload fields. Image fit, media position, and overlay color/opacity are conditional on background type. Videos remain paused during editing. Text color, border style/width/color, radius, and opacity are available under Appearance.

Position controls include normal, absolute, sticky, and fixed positioning, offsets, and stacking order. Responsive overrides apply at tablet widths up to 1024px and mobile widths up to 600px. They cover padding, gap, direction, and grid columns.

HTML IDs and CSS classes attach to the layout wrapper. The CSS editor accepts declarations such as `border-radius: 20px; letter-spacing: 1px;` and custom properties. Declarations apply to that wrapper and override its visual controls. Selectors, braces, at-rules, and `!important` are excluded. Use classes in your frontend stylesheet for selector-based effects. The Icon element supports the admin's searchable Lucide and Heroicons picker.

### Studio mode and content-only delivery

Studio is opt-in: set `studio: { enabled: true }` in `defineKyroConfig`. Collection-level `admin.studio` identifies the composition field; it does not enable Studio globally.

| Global mode | Authoring | Default delivery |
| --- | --- | --- |
| Studio enabled | Content and layout blocks, with design controls | Full composition tree |
| Studio omitted or disabled | Content blocks; existing layouts/settings remain read-only | Content only |

This is a breaking delivery contract: disabling Studio changes API response shape. Restart after changing configuration and update consumers that expect layout wrappers. Merely disabling Studio never rewrites saved documents. Enabling it again exposes their preserved layout settings.

REST supports `?representation=content` (also with Studio enabled). GraphQL uses the same request URL parameter, for example `/api/graphql?representation=content`. tRPC find/findByID accept `representation: "content"`. `full` is rejected in headless mode. Content delivery unwraps Section/Container/Row/Column/Grid in order, drops Spacer/Divider, removes block design groups, and keeps content IDs, media placements and references. Relationship-populated content is projected too. The database adapter remains the internal canonical-data interface. Authenticated admin-session requests use a private canonical representation so editing content cannot inadvertently flatten saved layouts; this is not a public full-output option.

Saved draft-enabled documents have a **More actions → Convert / recover** action in the editor header. Review the wrapper count/type breakdown, then choose **Convert to content only**. The server saves the latest protected recovery snapshot first and creates an unpublished converted draft. Published data is unchanged until you publish. The recovery snapshot is available in the same dialog; restoring it creates a draft and never publishes it. Conversion/recovery requires read and update permission, a current preview revision, and an adapter supporting protected snapshots (Local, Drizzle, MongoDB). Stale previews fail with 409. Adapters without protected recovery cannot convert.

Recovery versions are excluded from ordinary draft selection, autosave reuse, and automatic history retention. Explicitly deleting a document/history still removes its snapshots. Conversion flattens content in document order, not visual CSS order; review multi-column compositions before publishing.

Only one recovery snapshot is offered per document. Each new conversion updates that protected slot to the latest pre-conversion state rather than accumulating recovery entries.

### Package build

Studio 0.2.0 ships React/TypeScript and Astro source for consumer bundlers. `pnpm --filter @kyro-cms/studio build` type-checks its source package before publication. Core/Admin 0.15.0 own the delivery-mode and protected conversion/recovery APIs.
