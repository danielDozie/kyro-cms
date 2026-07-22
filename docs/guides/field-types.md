---
title: Field Types Reference
description: Comprehensive reference for all 25+ field types available in Kyro CMS collection schemas.
---

# Field Types Reference

Kyro provides 25+ field types for defining collection schemas. Each field type supports common options like `required`, `unique`, `defaultValue`, `admin`, `access`, `validate`, `hooks`, and `deprecated`.

## Common Options

All field types share these configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `required` | `boolean` | `false` | Whether the field must have a value |
| `unique` | `boolean` | `false` | Whether the value must be unique across all documents |
| `defaultValue` | `any` | `undefined` | Default value assigned to new documents |
| `index` | `boolean` | `false` | Add a database index for this field |
| `admin` | `AdminOptions` | `{}` | Admin UI configuration |
| `access` | `AccessOptions` | `{}` | Field-level access control |
| `validate` | `(value, options) => true \| string` | `undefined` | Custom validation function |
| `hooks` | `FieldHooks` | `{}` | Lifecycle hooks (`beforeChange`, `afterChange`, `afterRead`) |
| `deprecated` | `boolean \| { message }` | `false` | Mark the field as deprecated in the admin UI |

### Admin Options

The `admin` object supports:

| Option | Type | Description |
|--------|------|-------------|
| `readOnly` | `boolean` | Field is visible but not editable |
| `hidden` | `boolean` | Field is hidden from the admin UI entirely |
| `placeholder` | `string` | Placeholder text for the input |
| `description` | `string` | Help text shown below the field |
| `condition` | `(data) => boolean` | Conditionally show/hide the field |
| `width` | `string` | CSS width (e.g., `"50%"`) |
| `columns` | `number` | Grid columns for tab/group layout |

### Field-Level Access

```ts
access: {
  read: ({ doc, user }) => boolean,
  update: ({ doc, data, user }) => boolean,
}
```

---

## text

Single-line text input.

```ts
TextConfig: {
  type: 'text',
  minLength?: number
  maxLength?: number
  pattern?: RegExp | string
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minLength` | `number` | `undefined` | Minimum character length |
| `maxLength` | `number` | `undefined` | Maximum character length |
| `pattern` | `RegExp \| string` | `undefined` | Regex pattern the value must match |

```ts
{
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  pattern: "^[a-z0-9-]+$",
  admin: { placeholder: "my-post-slug" }
}
```

> [!WARNING]
> The `pattern` option must match the **entire** string. Use `^` and `$` anchors in your regex.

## textarea

Multi-line text input.

```ts
TextareaConfig: {
  type: 'textarea',
  minLength?: number
  maxLength?: number
  rows?: number
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minLength` | `number` | `undefined` | Minimum character length |
| `maxLength` | `number` | `undefined` | Maximum character length |
| `rows` | `number` | `5` | Visible row count in the textarea |

```ts
{
  name: "bio",
  type: "textarea",
  rows: 8,
  maxLength: 500,
  admin: { description: "Brief biography (max 500 chars)" }
}
```

## number

Numeric input supporting integers and floats.

```ts
NumberConfig: {
  type: 'number',
  min?: number
  max?: number
  step?: number
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `min` | `number` | `undefined` | Minimum allowed value |
| `max` | `number` | `undefined` | Maximum allowed value |
| `step` | `number` | `1` | Increment step for stepper controls |

```ts
{
  name: "price",
  type: "number",
  min: 0,
  step: 0.01,
  required: true
}
```

## email

Email input with built-in validation.

```ts
EmailConfig: {
  type: 'email',
  unique?: boolean
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `unique` | `boolean` | `false` | Enforce unique email addresses across documents |

```ts
{
  name: "email",
  type: "email",
  required: true,
  unique: true
}
```

## url

URL input with built-in URL validation.

```ts
UrlConfig: {
  type: 'url'
}
```

```ts
{
  name: "website",
  type: "url",
  admin: { placeholder: "https://example.com" }
}
```

> [!TIP]
> URLs are validated client-side and server-side. The value must include a protocol (`http://` or `https://`).

## password

Password field. Passwords are **automatically hashed** before storage and are **never** returned via any API.

```ts
PasswordConfig: {
  type: 'password'
}
```

```ts
{
  name: "password",
  type: "password",
  required: true
}
```

> [!WARNING]
> Password fields are **write-only**. The stored hash is never exposed through REST, GraphQL, or tRPC responses. Attempting to read a password field via `access.read` will still return `null`.

## select

Dropdown select from a predefined list of options.

```ts
SelectConfig: {
  type: 'select',
  options: { label: string, value: string }[]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `options` | `{ label: string, value: string }[]` | `[]` | Available options shown in the dropdown |

```ts
{
  name: "status",
  type: "select",
  required: true,
  options: [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" }
  ],
  defaultValue: "draft"
}
```

## radio

Radio button group for selecting a single option.

```ts
RadioConfig: {
  type: 'radio',
  options: { label: string, value: string }[]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `options` | `{ label: string, value: string }[]` | `[]` | Available radio options |

```ts
{
  name: "layout",
  type: "radio",
  options: [
    { label: "Full Width", value: "full" },
    { label: "Boxed", value: "boxed" },
    { label: "Sidebar", value: "sidebar" }
  ],
  defaultValue: "full"
}
```

## checkbox

Boolean checkbox toggle.

```ts
CheckboxConfig: {
  type: 'checkbox'
}
```

```ts
{
  name: "published",
  type: "checkbox",
  defaultValue: false
}
```

## date

Date picker storing values in `YYYY-MM-DD` format.

```ts
DateConfig: {
  type: 'date',
  minDate?: string
  maxDate?: string
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minDate` | `string` | `undefined` | Earliest selectable date (ISO 8601) |
| `maxDate` | `string` | `undefined` | Latest selectable date (ISO 8601) |

```ts
{
  name: "publishDate",
  type: "date",
  required: true,
  minDate: "2024-01-01"
}
```

## datetime

DateTime picker storing values in ISO 8601 format.

```ts
DateTimeConfig: {
  type: 'datetime',
  minDate?: string
  maxDate?: string
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minDate` | `string` | `undefined` | Earliest selectable datetime (ISO 8601) |
| `maxDate` | `string` | `undefined` | Latest selectable datetime (ISO 8601) |

```ts
{
  name: "scheduledAt",
  type: "datetime",
  minDate: new Date().toISOString()
}
```

## richText

Rich text editor powered by TipTap/ProseMirror. Stores content as structured JSON (not HTML).

```ts
RichTextConfig: {
  type: 'richText',
  toolbar?: string[]
  blocks?: Block[]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `toolbar` | `string[]` | `all` | Array of toolbar button names to show |
| `blocks` | `Block[]` | `[]` | Inline block schemas embeddable in the editor |

```ts
{
  name: "content",
  type: "richText",
  toolbar: ["bold", "italic", "heading", "link", "image"],
  blocks: [
    { name: "callout", fields: [{ name: "text", type: "text" }] }
  ]
}
```

> [!TIP]
> Rich text content is stored as ProseMirror JSON, not raw HTML. Use the `kyro-rich-text-react` package to convert it to React components on the frontend, or build your own custom renderer.

## markdown

Markdown editor with live preview.

```ts
MarkdownConfig: {
  type: 'markdown'
}
```

```ts
{
  name: "body",
  type: "markdown",
  admin: { description: "Write in Markdown with live preview" }
}
```

## code

Code editor with syntax highlighting.

```ts
CodeConfig: {
  type: 'code',
  language?: string
  theme?: 'light' | 'dark'
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `language` | `string` | `"plaintext"` | Syntax highlighting language (e.g., `"javascript"`, `"python"`) |
| `theme` | `"light" \| "dark"` | `"dark"` | Editor color theme |

```ts
{
  name: "snippet",
  type: "code",
  language: "typescript",
  theme: "dark"
}
```

## json

JSON editor. Stores parsed JSON objects and validates on input.

```ts
JsonConfig: {
  type: 'json'
}
```

```ts
{
  name: "metadata",
  type: "json"
}
```

> [!WARNING]
> If the input is not valid JSON, the API returns a validation error. The stored value is always a parsed JSON object or array, never a string.

## relationship

Single document reference (belongs-to relationship). Stores the referenced document's ID.

```ts
RelationshipConfig: {
  type: 'relationship',
  ref: string
  multiple?: false
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ref` | `string` | required | Collection slug being referenced |
| `multiple` | `false` | `false` | Must be `false` for single relationship |

```ts
{
  name: "author",
  type: "relationship",
  ref: "users",
  required: true
}
```

## hasMany

Multiple document references (has-many relationship). Stores an array of document IDs.

```ts
HasManyConfig: {
  type: 'hasMany',
  ref: string
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ref` | `string` | required | Collection slug being referenced |

```ts
{
  name: "tags",
  type: "hasMany",
  ref: "tags"
}
```

> [!TIP]
> The difference between `relationship` and `hasMany` is simple: `relationship` stores a **single** ID (belongs-to), while `hasMany` stores an **array** of IDs (has-many).

## upload

File and media upload with MIME type and size restrictions.

```ts
UploadConfig: {
  type: 'upload',
  mimeTypes?: string[]
  maxSize?: number
  multiple?: boolean
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mimeTypes` | `string[]` | `["image/*"]` | Allowed MIME types (e.g., `"image/png"`, `"application/pdf"`, `"image/*"`) |
| `maxSize` | `number` | `10485760` | Maximum file size in bytes (default 10 MB) |
| `multiple` | `boolean` | `false` | Allow multiple file uploads |

```ts
{
  name: "heroImage",
  type: "upload",
  mimeTypes: ["image/png", "image/jpeg", "image/webp"],
  maxSize: 5242880, // 5 MB
  required: true
}
```

## blocks

Content blocks builder for composing structured, nested layouts. Used extensively in the Blocks Builder system.

```ts
BlocksConfig: {
  type: 'blocks',
  blocks: Block[]
  blockCategories?: BlockCategory[]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `blocks` | `Block[]` | `[]` | Array of block definitions with `name`, `label`, `fields` |
| `blockCategories` | `BlockCategory[]` | `[]` | Group blocks into categories in the admin UI picker |

```ts
{
  name: "sections",
  type: "blocks",
  blocks: [
    {
      name: "hero",
      label: "Hero Section",
      fields: [
        { name: "heading", type: "text", required: true },
        { name: "subheading", type: "textarea" },
        { name: "background", type: "upload", mimeTypes: ["image/*"] }
      ]
    },
    {
      name: "cta",
      label: "CTA Banner",
      fields: [
        { name: "text", type: "text", required: true },
        { name: "buttonUrl", type: "url" }
      ]
    }
  ],
  blockCategories: [
    { label: "Header", blocks: ["hero"] },
    { label: "Conversion", blocks: ["cta"] }
  ]
}
```

> [!WARNING]
> The `blocks` field type requires `blockCategories` for the admin UI to display the block picker. Without it, blocks cannot be added through the dashboard. Set `admin: { pickerMode: "dropdown" }` for a compact dropdown instead of the drawer.

## group

Nested field group. Stored as a JSON object (or JSONB in PostgreSQL) in a single database column.

```ts
GroupConfig: {
  type: 'group',
  fields: Field[]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fields` | `Field[]` | `[]` | Array of sub-fields in the group |

### Reusable Example

```ts
// src/fields/seo.ts
import type { Field } from "@kyro-cms/core";

export const seoGroup: Field = {
  name: "seo",
  type: "group",
  label: "SEO Settings",
  fields: [
    { name: "title", type: "text", maxLength: 60, admin: { placeholder: "SEO Title" } },
    { name: "description", type: "textarea", maxLength: 160 },
    { name: "ogImage", type: "upload", relationTo: "media" }
  ]
};
```

---

### Advantages of Grouping

Using `group` fields provides significant architectural and usability benefits:

1. **Database Schema Cleanliness**: Grouping related fields stores them as a nested JSON object in a single column (`jsonb` on PostgreSQL, `text` on SQLite). This keeps the root table schema clean and prevents hitting maximum column limits in databases.
2. **Encapsulation & Reusability**: You can define a group field in a separate module and import it into multiple collections (e.g., repeating the same Address, Social Links, or SEO block across collections).
3. **Copy & Paste Productivity**: Group fields include built-in Copy/Paste UI buttons in the admin panel header. Content creators can copy the entire group's dataset to their clipboard as a serialized JSON payload and paste it into any matching group field structure.
4. **Custom Group Layouts**: Groups support `admin: { inline: true }` which collapses all nested primitive fields horizontally into a side-by-side flex layout — perfect for related inputs like `width` + `height` or `firstName` + `lastName`.

---

### Gotchas & Limitations

> [!WARNING]
> While group fields are powerful, be aware of these common database and validation gotchas:
>
> 1. **Indexing Nested Fields**: Because group fields store values in a JSON blob, you cannot easily create standard SQL indexes on nested properties (e.g., indexing `seo.title` to speed up searches). If you need to query or sort records frequently by a sub-field, keep it at the top level instead.
> 2. **Query Filtering complexity**: Filtering API requests by nested properties (e.g., `where[seo.title][equals]=value`) requires database-specific JSON path queries which can be slower than querying standard columns.
> 3. **Validation and Required Fields**: If a sub-field within a group is marked as `required: true`, the group itself must have a value for validation to run. If the entire group is omitted or null, nested validation might be skipped or fail silently depending on the database adapter.
> 4. **Layout-Only Alternatives**: Do not confuse `group` with layout containers like `tabs`, `row`, or `collapsible`. Layout fields do **not** nest data in the database — they keep fields flat at the root level of the document and only change how they are grouped visually in the admin UI. Use `group` only when you explicitly want nested object output in your JSON payload.

---

## array

Repeating field group. Stored as a JSON array of objects in the database.

```ts
ArrayConfig: {
  type: 'array',
  fields: Field[]
  minRows?: number
  maxRows?: number
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fields` | `Field[]` | `[]` | Sub-fields for each array item |
| `minRows` | `number` | `0` | Minimum number of items required |
| `maxRows` | `number` | `undefined` | Maximum number of items allowed |

```ts
{
  name: "teamMembers",
  type: "array",
  minRows: 1,
  maxRows: 20,
  fields: [
    { name: "name", type: "text", required: true },
    { name: "role", type: "text" },
    { name: "avatar", type: "upload", mimeTypes: ["image/*"] }
  ]
}
```

> [!TIP]
> Arrays with **4 or fewer primitive sub-fields** automatically render in compact inline mode in the admin UI — no accordion, no expand/collapse.

## tabs

Tabbed field layout for organizing fields into labeled tabs in the admin UI. No effect on data storage.

```ts
TabsConfig: {
  type: 'tabs',
  tabs: { label: string, fields: Field[] }[]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tabs` | `{ label: string, fields: Field[] }[]` | `[]` | Tab definitions with label and fields |

```ts
{
  name: "content",
  type: "tabs",
  tabs: [
    {
      label: "Main",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "body", type: "richText" }
      ]
    },
    {
      label: "SEO",
      fields: [
        { name: "metaTitle", type: "text" },
        { name: "metaDescription", type: "textarea" }
      ]
    }
  ]
}
```

> [!NOTE]
> `tabs` is a **layout-only** field type. It does not affect how data is stored in the database — it only organizes the admin UI form. Use `group` when you want data nesting.
> 
> **Copy & Paste:** Tab fields support Copy/Paste UI buttons in the tab bar. Even though tabs are layout-only, you can copy the fields within all tabs to your clipboard and paste them into another tab field layout that shares a matching tabs/fields definition.

## row

Inline horizontal row layout. Renders sub-fields side by side in a single row.

```ts
RowConfig: {
  type: 'row',
  fields: Field[]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fields` | `Field[]` | `[]` | Sub-fields rendered horizontally |

```ts
{
  type: "row",
  fields: [
    { name: "firstName", type: "text", required: true, admin: { width: "50%" } },
    { name: "lastName", type: "text", required: true, admin: { width: "50%" } }
  ]
}
```

> [!TIP]
> Use `row` inside a `group` or at the top level of a collection to create compact form layouts with fields displayed side by side.

## collapsible

Collapsible field group. Fields can be expanded/collapsed in the admin UI.

```ts
CollapsibleConfig: {
  type: 'collapsible',
  fields: Field[]
  label: string
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fields` | `Field[]` | `[]` | Sub-fields inside the collapsible |
| `label` | `string` | `""` | Label shown in the collapsible header |

```ts
{
  type: "collapsible",
  label: "Advanced Settings",
  fields: [
    { name: "customCSS", type: "code", language: "css" },
    { name: "customJS", type: "code", language: "javascript" }
  ]
}
```

> [!TIP]
> **Copy & Paste:** Collapsible accordion fields feature Copy/Paste UI buttons in the header row, allowing content creators to duplicate complex settings configurations across collapsible sections instantly.

## ui

UI-only field that renders a custom component without storing any data in the database.

```ts
UiConfig: {
  type: 'ui',
  component: string
  path?: string
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `component` | `string` | required | Path to a custom React component |
| `path` | `string` | `undefined` | Admin route path for the component |

```ts
{
  name: "dashboardPreview",
  type: "ui",
  component: "@/components/CustomDashboardPreview",
  path: "preview"
}
```

> [!WARNING]
> `ui` fields are **not stored** in the database and are **not returned** by any API. They only exist in the admin dashboard UI. They are useful for custom dashboards, preview panels, or embedded tools.

---

## Comparison Guide

| Need | Use |
|------|-----|
| Single text input | `text` |
| Multi-line text | `textarea` |
| Numeric value | `number` |
| Rich formatting | `richText` or `markdown` |
| Document reference (single) | `relationship` |
| Document reference (multiple) | `hasMany` |
| Nested JSON data | `group` |
| Repeating items | `array` |
| Composable layout | `blocks` |
| Tabbed admin UI | `tabs` |
| File upload | `upload` |
| Non-stored custom UI | `ui` |
