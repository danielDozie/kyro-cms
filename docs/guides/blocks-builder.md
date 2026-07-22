---
title: Blocks Builder
description: Build modular, structured, and flat page layouts in Kyro CMS using premium semantic content blocks.
---

# Blocks Builder

The **Blocks Builder** is Kyro CMS's powerful visual layout engine. Instead of nesting visual grid layouts inside layout containers (which causes "editor paralysis" and heavy database queries), Kyro utilizes a flat, modern **Semantic Content Modeling** architecture. 

All pages are composed of a flat array of highly structured, content-rich blocks that translate cleanly into high-performance frontend components.

---

## 1. Top-Level Compact Row View

To keep the page editing canvas clear, focused, and organized, the Blocks Builder uses a compact **tree-row listing** for all top-level blocks:

* **Distraction-Free Workspace:** Blocks are presented as neat horizontal rows showing their status, type label, and category icon.
* **Content Previews:** Each row displays a live text snippet preview of the block's current input (such as headings or descriptions).
* **Drag-and-Drop Reordering:** Top-level rows feature grab-handles allowing you to reorder sections instantly on the canvas.
* **Slide-Out Edit Drawer (`SlidePanel`):** Clicking on any row slides open a focused, full-height editing panel from the right-hand side of the screen. All content inputs are safely edited inside this sidebar drawer.
* **Visual Identity (Theming):** Every block row and its editing panel is dynamically color-coded based on the block's category and semantic purpose (using the built-in `blockTheme` system).
* **Picker Modes:** Main semantic blocks use the slide-out **drawer** (`BlockDrawer`) for block selection. The inline content elements field uses a **dropdown** context menu instead — click `+ Add Element` to see available primitives in a compact dropdown, then click to insert.
* **Auto-Open on Creation:** Clicking **"+ Add Block"** instantly adds a new block to your page and automatically slides open its editing drawer, letting you write content immediately.

---

## 2. Global Utility Block Fields

Every block in the Blocks Builder automatically inherits three standardized utility configuration fields. These represent **semantic intent and inline content composition**, keeping styling concerns fully decoupled from the CMS data:

1. **`sectionTheme` (Section Theme):** A semantic theme identifier (`default`, `subtle`, `accent`) indicating visual contrast hierarchy. The frontend maps this selection to its local styling classes (e.g. background variables).
2. **`isActive` (Active Toggle):** A simple checkbox that allows content creators to publish or temporarily draft/hide individual blocks without deleting their configured content records.
3. **`elements` (Extra Content Elements):** A blocks field that lets you compose inline content inside any structural block. See [Inline Content Elements](#6-inline-content-elements) below.

---

## 3. Core Semantic Content Blocks

Kyro provides 15 highly-optimized blocks out of the box, plus 7 inline content elements. These are grouped into 4 semantic layout categories, plus basic elements and utilities.

> [!NOTE]
> The `+ Add Block` UI drawer is completely dynamic. The categories and blocks you see are generated directly from the JSON schema configuration (`field.blocks`). If you define a custom block in your schema with an `admin.group`, Kyro will automatically render it in the drawer under that group!
> 
> You can also set `admin: { pickerMode: "dropdown" }` on a blocks-type field to render a compact dropdown menu instead of the slide-out drawer — ideal for small sets of inline primitives.

### 1. Structural Sections
Foundational components for establishing page hierarchy and core messaging.
* **Hero Section (`hero`):** A full-width landing section containing `title`, `subtitle`, background uploads, and call-to-actions. Supports single or multi-slide modes.
* **Feature Split (`feature-split`):** Text and media split layouts with selectable image alignment (left or right).
* **CTA Banner (`cta-banner`):** Centered call-to-action banners with `title`, `subtitle`, and buttons.
* **Card (`card`):** A modular block featuring title, text description, icon, and clickable hyperlinks.
* **Logo Cloud (`logo-cloud`):** Horizontal showcases for partner company logos with a `title` heading.
* **Video Showcase (`video-showcase`):** Cinematic video player with `title`, `subtitle`, cover image, and video URL.

### Marketing Grids
Complex lists mapped elegantly to CSS Grid layouts on the frontend.
* **Feature Grid (`feature-grid`):** Grid layouts with `title`, `subtitle`, and multiple items composed of title, description, and custom icon names.
* **Testimonials (`testimonials`):** Carousel with `title`, `subtitle`, and quote/author items.
* **Stats & Metrics (`stats`):** Grid with `title`, `description`, and value/label items (e.g. `99.9% Uptime`).
* **Pricing Grid (`pricing`):** Tiered plans with `title`, `subtitle`, billing frequency toggle, feature checklists, and buttons.
* **Team Showcase (`team`):** Member grids with `title`, `subtitle`, avatar uploads, role titles, and bios.

### Lead Capture & Interactive
Blocks requiring direct user interaction or input.
* **FAQ Section (`faq`):** Expandable list of question and textarea answer pairs with a `title` heading and optional `footerTitle`.
* **Process Timeline (`process-steps`):** Numbered steps with `title` and `subtitle`.
* **Form Embed (`form-embed`):** Interactive opt-in forms loaded from the forms collection.

### Dynamic Content
Blocks that aggregate their content directly from the Kyro CMS database via backend APIs.
* **Content Feed (`recent-feed`):** Manual curation block with `title` and `subtitle`. Hand-picks items from any collection to showcase on the page.

### Basic Content Elements & Utility
Primitive components nested within semantic blocks or used for unstyled generic content.
* **Rich Text (`richtext`) & Paragraph (`paragraph`):** Standard prose content fields.
* **Media (`image` / `video`):** Base media uploads.
* **System Utilities (`array`, `relationship`, `code`, `file`):** Database relationship managers and raw data inputs.

---

## 4. Inline Content Elements

Every structural block automatically includes an **Extra Content Elements** field at the bottom of its edit panel. This field lets you compose inline content primitives — heading, text, image, richtext, button, video, and list — inside any block using a compact **dropdown menu** (`+ Add Element`):

* **Heading:** Single-line text heading.
* **Text:** Multi-line plain text paragraph.
* **Image:** Uploaded image from the media library (no alt text required).
* **Rich Text:** Full TipTap rich text editor output.
* **Button:** Compact inline group with Label and URL fields (rendered side-by-side).
* **Video:** Video URL or uploaded video file, with optional caption.
* **List:** Dynamic array of text items (rendered as a compact inline list — no accordion).

Elements render as **compact inline chips** in a horizontal row (not full-width cards). Drag-and-drop reordering, duplication, and deletion are available on each chip. Clicking a chip opens its edit panel.

Elements are defined as regular `Block` objects in the schema and are composed via the `elementsField` utility field, injected into every block by `withUtilityFields()`. You can define your own element blocks by adding them to the `elementBlocks` array.

```typescript
import { elementBlocks, elementsField } from "@kyro-cms/core/client";

// elementsField is automatically added to every block via:
function withUtilityFields(block) {
  return { ...block, fields: [...block.fields, elementsField] };
}
```

> [!TIP]
> The elements field uses `admin: { pickerMode: "dropdown" }` to render a dropdown menu instead of the full drawer — ideal for the small set of inline primitives.

---

## 5. Repeating List Support (Array Fields)

To support complex lists (such as pricing plans, timeline steps, or features checklists), Kyro CMS supports dynamic **Array Fields**:

```typescript
// Example: Schema definition using an Array field type
{
  name: "plans",
  type: "array",
  label: "Pricing Plans",
  fields: [
    { name: "name", type: "text", label: "Plan Name" },
    { name: "price", type: "text", label: "Price" },
    { name: "features", type: "list", label: "Checklist" }
  ]
}
```

When an array field is defined in a block's template configuration, the focused slide-out drawer automatically mounts a nested compact list interface. Creators can dynamically **add, remove, and expand individual list items** directly inside the drawer form, with all nested state managed automatically.

### Compact Inline Array Mode

For simple arrays with **4 or fewer sub-fields** where every field is a primitive type (`text`, `textarea`, `number`, `checkbox`, `select`, `radio`, `color`, `email`, `password`, `code`, `markdown`, `upload`), the array field automatically renders in **compact inline mode** — no accordion, no expand/collapse. Each item appears as a single numbered row with all fields visible inline, plus a remove button. This is the default for lists like the List element's `items` field or the Feature Split block's `images` array.

```typescript
// Example: This array has 1 text field → renders as compact inline rows
{
  name: "items",
  type: "array",
  label: "Items",
  fields: [
    { name: "text", type: "text", label: "Item Text" }
  ]
}
```

No opt-in required — the detection is automatic based on the sub-field count and types.

---

## 6. Block Field Naming Convention

Block fields follow a standardized naming convention aligned with industry CMS platforms (Strapi, Sanity, Contentful):

| Pattern | Field Name | Used In |
|---------|-----------|---------|
| Section heading | `title` | All blocks with a heading |
| Section subheading | `subtitle` | hero, feature-grid, cta-banner, testimonials, pricing, team, recent-feed, process-steps, video-showcase |
| Rich text body | `content` | richtext, text-block |
| FAQ footer heading | `footerTitle` | faq |

```typescript
// Example: Hero block with standardized fields
{
  name: "hero",
  type: "blocks",
  blocks: [{
    slug: "hero",
    fields: [
      { name: "title", type: "text", label: "Heading" },
      { name: "subtitle", type: "textarea", label: "Subheading" },
      { name: "backgroundImage", type: "upload", relationTo: "media" },
      { name: "buttons", type: "array", fields: [
        { name: "label", type: "text" },
        { name: "url", type: "text" },
      ]},
    ],
  }],
}
```

> [!NOTE]
> Standardized field names use `title`/`subtitle` across all content blocks.

---

## 6. Inline Group Layout

Groups with `admin: { inline: true }` render their sub-fields in a horizontal flex row instead of the default vertical stack. This is used for compact field combinations like the Button element's Label + URL:

```typescript
{
  name: "buttonData",
  type: "group",
  label: "Button",
  admin: { inline: true },
  fields: [
    { name: "text", type: "text", label: "Label" },
    { name: "url", type: "text", label: "URL" },
  ],
}
```

When `inline: true` is set, fields render side-by-side with `gap-4` spacing, making them visually compact while remaining fully editable.

---

## 7. Visual Identity (`blockTheme`)

To help editors quickly identify complex page structures at a glance, Kyro CMS enforces a strict visual identity across blocks via the internal `blockTheme` registry. 

When you register a semantic block, it is automatically assigned:
1. **A Unique Accent Color**: (e.g., `amber-500` for CTA Banners, `red-500` for Video Showcases).
2. **List Active States**: When an editor clicks a block in the hierarchy, the entire block container border glows with its designated accent color.
3. **Modal Accent Lines**: The slide-out editor (`SlidePanel`) applies a 2px vertical border line (`border-l-2`) perfectly matching the block's color, cementing a premium, cohesive editing experience.

---

## 8. Block Copy & Paste Support

The Blocks Builder supports direct copy-and-paste functionality to speed up layout generation and section duplication across fields, columns, and pages.

* **How it works:** When you focus a block card or are editing a block, you can copy the block's current JSON data structure to your system clipboard using standard browser Copy controls.
* **Keyboard Shortcuts:**
  * **Paste Block:** Focus the blocks field container and press `Ctrl + V` (Windows/Linux) or `Cmd + V` (macOS). Kyro will parse the clipboard content and automatically append the block to the list if the structural JSON is valid.
* **Format validation:** When pasting, Kyro validates that the clipboard data matches the block schema. If you copy a block and try to paste it into a blocks field that doesn't support that block slug, the paste operation is safely ignored to maintain data integrity.
