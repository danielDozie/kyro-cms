---
name: kyro-admin-field-strategy
description: Conventions for extending @kyro-cms/admin UI, using FieldStrategyRegistry, React.lazy code-splitting, and compact modal dialogs.
---

# Kyro Admin UI & Field Strategy Guide

Use this skill when modifying React dashboard views in `admin/` or adding custom field renderers.

## 1. Field Strategy Registry Pattern

Custom field renderers in `@kyro-cms/admin` use the Strategy Pattern via `FieldStrategyRegistry` (`admin/src/services/FieldStrategyRegistry.ts`).

Never add gigantic `switch(field.type)` statements to render form inputs. Instead, register field strategies:

```tsx
import { FieldStrategyRegistry } from '../services/FieldStrategyRegistry';

FieldStrategyRegistry.register('location', {
  render: ({ field, value, onChange }) => (
    <LocationPickerInput field={field} value={value} onChange={onChange} />
  ),
});
```

## 2. Code-Splitting Admin Views

Heavy admin views (MediaGallery, WebhookManager, DeveloperCenter, BrandingHub, UserManagement) must be loaded dynamically using `React.lazy()` + `<Suspense>` in `Admin.tsx`:

```tsx
const MediaGallery = React.lazy(() => import('./views/MediaGallery'));
const WebhookManager = React.lazy(() => import('./views/WebhookManager'));

export function AdminRouter() {
  return (
    <React.Suspense fallback={<AdminLoadingSpinner />}>
      <Routes>
        <Route path="/media" element={<MediaGallery />} />
        <Route path="/webhooks" element={<WebhookManager />} />
      </Routes>
    </React.Suspense>
  );
}
```

## 3. Glassmorphism & UI Aesthetics

- **Theme Colors**: Curated HSL colors, sleek dark modes, smooth gradients.
- **Glassmorphism**: Backdrop filters (`backdrop-filter: blur(12px)`), dark translucent cards (`background: rgba(18, 18, 24, 0.75)`), subtle glowing borders (`1px solid rgba(255, 255, 255, 0.18)`).
- **Disabled Buttons**: Use explicit disabled styling (`opacity: 0.45`, `cursor: not-allowed`, `pointer-events: none`).
