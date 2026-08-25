# @kyro-cms/admin

> Official React Admin Dashboard UI and Astro Integration for Kyro CMS.

[![npm version](https://img.shields.io/npm/v/@kyro-cms/admin.svg)](https://www.npmjs.com/package/@kyro-cms/admin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## 🌟 Overview

`@kyro-cms/admin` is the visual dashboard engine for **Kyro CMS**. It automatically reads your `kyro.config.ts` collection schema and generates a modern, production-grade React admin panel inside your Astro application with zero manual routing or boilerplate.

---

## ✨ Features

- **⚡ Instant Schema-Driven UI**: Auto-generates responsive list tables, search filters, pagination, and multi-field forms directly from your collection schemas.
- **👁️ Live Preview**: Side-by-side split view with real-time responsive viewport toggles (Desktop, Tablet, Mobile) and dynamic reload triggers.
- **⏳ Drafts & Version History**: Full visual version timeline with diff comparison, rollback triggers, and draft/publish status indicators.
- **🖼️ Media Asset Manager**: Drag-and-drop file upload interface with image cropping, automated alt-text tagging, metadata editing, and folder grouping.
- **🔐 Built-in Auth & RBAC**: JWT-based authentication, user account management, granular role permissions, and API key management with rate-limiting controls.
- **🧩 Extensible Architecture**:
  - Strategy Pattern Field Registry (`FieldStrategyRegistry`) for pluggable custom input controls.
  - Custom Block renderers for modular page builder schemas.
  - Custom Admin Plugins with dedicated navigation items and full-screen view panels.
- **🌓 Adaptive Theming**: Built-in Dark Mode, Light Mode, System sync, and granular CSS token overrides.
- **🚀 Code-Split & Fast**: Heavy management views (`MediaGallery`, `DeveloperCenter`, `WebhookManager`, `BrandingHub`) load on-demand via `React.lazy()` and `<Suspense>` to keep dashboard bundle sizes negligible.

---

## 📦 Installation

```bash
pnpm add @kyro-cms/admin @kyro-cms/core
# or
npm install @kyro-cms/admin @kyro-cms/core
# or
bun add @kyro-cms/admin @kyro-cms/core
```

---

## 🚀 Quick Start (Astro)

Add the `kyroAdmin()` integration to your `astro.config.mjs` alongside `@astrojs/react` and `@kyro-cms/astro`:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import kyro from '@kyro-cms/astro';
import { kyroAdmin } from '@kyro-cms/admin/integration';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    kyro(),
    kyroAdmin({
      basePath: '/admin',       // Mount path (default: "/admin")
      apiPath: '/api',          // API handler route (default: "/api")
      configPath: 'kyro.config.ts', // CMS config file path
    }),
  ],
});
```

Start the Astro development server:

```bash
pnpm dev
```

Visit `http://localhost:4321/admin` to access the Kyro Admin Dashboard.

---

## ⚙️ Integration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `basePath` | `string` | `"/admin"` | The URL route path where the admin panel is mounted. |
| `apiPath` | `string` | `"/api"` | The backend API prefix where Kyro Core endpoints reside. |
| `configPath` | `string` | `"kyro.config.ts"` | Relative path to your Kyro configuration file. |

---

## 🧩 Extensibility & Customization

### 1. Registering Custom Fields

Create custom form field controls using `registerField`:

```tsx
import { registerField } from '@kyro-cms/admin';

registerField({
  type: 'color-picker',
  displayName: 'Color Picker',
  component: ({ field, value, onChange, disabled }) => (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || '#000000'}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded border"
      />
      <span className="font-mono text-sm">{value || '#000000'}</span>
    </div>
  ),
});
```

Use it in your `kyro.config.ts`:

```typescript
{
  name: 'brandColor',
  type: 'color-picker' as any,
  label: 'Brand Accent Color',
}
```

### 2. Custom Block Components

Extend Kyro's modular blocks builder with custom preview widgets:

```tsx
import { registerBlock } from '@kyro-cms/admin';

registerBlock({
  slug: 'cta-banner',
  label: 'Call to Action Banner',
  category: 'Marketing',
  render: ({ data }) => (
    <div className="p-6 bg-blue-600 text-white rounded-lg text-center">
      <h3 className="text-xl font-bold">{data.heading || 'Ready to start?'}</h3>
      <p className="mt-2 text-blue-100">{data.subheading}</p>
      <button className="mt-4 px-4 py-2 bg-white text-blue-600 rounded font-semibold">
        {data.buttonText || 'Click Here'}
      </button>
    </div>
  ),
});
```

### 3. Custom Admin Plugins

Register custom administrative views and sidebars:

```tsx
import { registerPlugin } from '@kyro-cms/admin';
import { BarChart3 } from 'lucide-react';

registerPlugin({
  id: 'analytics-dashboard',
  name: 'Analytics',
  icon: BarChart3,
  view: () => (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Site Analytics</h1>
      <p className="text-gray-500 mt-2">Real-time visitor traffic and conversion metrics.</p>
    </div>
  ),
});
```

### 4. Theming and Brand Customization

Customize dashboard colors, typography, border radiuses, and shadows:

```tsx
import { ThemeProvider, mergeThemes, DARK_THEME, type KyroTheme } from '@kyro-cms/admin';

const customBrandTheme: Partial<KyroTheme> = {
  colors: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    background: '#0f172a',
    surface: '#1e293b',
    border: '#334155',
    text: '#f8fafc',
    textMuted: '#94a3b8',
  },
  radius: {
    base: '0.5rem',
    large: '0.75rem',
  },
};

const finalTheme = mergeThemes(DARK_THEME, customBrandTheme);
```

---

## 🛠️ Exported UI Primitives & Hooks

`@kyro-cms/admin` exports reusable React components and hooks for building custom admin widgets:

### UI Components
- `<Admin />`: Full standalone Kyro CMS root application component.
- `<AutoForm />`: Automatic form generator for any collection document.
- `<ListView />`, `<DetailView />`, `<CreateView />`: Core view controllers.
- `<Modal />`, `<ConfirmModal />`, `<SlidePanel />`: Accessible modal dialogs.
- `<ActionBar />`, `<BulkActionsBar />`: Save, draft, and batch mutation controls.
- `<VersionHistoryPanel />`: Document audit and rollback sidebar.
- `<Badge />`, `<Button />`, `<Spinner />`, `<Toast />`, `<Dropdown />`.

### Hooks
- `useKyroQuery(options)`: Fetch CMS collection records with caching and pagination.
- `useKyroMutation()`: Execute type-safe document mutations with optimistic UI updates.
- `useTheme()`: Active theme mode (`'light'` | `'dark'` | `'system'`) and switcher.
- `useHotkey(keyCombo, handler)`: Bind keyboard shortcuts.
- `useDebounce(value, delay)`: Debounce search inputs.

---

## 📄 License

MIT © [Daniel Dozie](https://github.com/danielDozie)
