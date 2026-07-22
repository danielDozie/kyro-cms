---
title: Localization & i18n
description: Learn how to localize the Kyro CMS Admin Dashboard and manage multilingual content.
---

# Localization & i18n

Kyro CMS provides out-of-the-box support for internationalization (i18n) across both the Admin Dashboard UI and your content schemas. This guide explains how to translate the Admin interface and configure your default language settings.

## Setting the Default Language

You can control the default language used by the Kyro CMS Admin Dashboard directly from the interface:

1. Navigate to **Settings > Site** in the Admin Dashboard.
2. Look for the **Default Language** field.
3. Select your preferred language (e.g., "English (en)", "French (fr)", etc.).
4. Save your changes.

The CMS will automatically inject the `defaultLanguage` setting and apply it to the Admin UI layout using `i18next`.

## Localizing the Admin UI

> [!IMPORTANT]
> **Contributor Guide:** The following section is intended for **core contributors** to Kyro CMS. Because translations are currently baked directly into the `@kyro-cms/admin` package, end users cannot add custom languages via configuration yet. If you want to add a new language, you must submit a Pull Request to the core repository!

Kyro CMS leverages the widely popular `i18next` and `react-i18next` libraries to power its localized Admin Dashboard.

### 1. Translating Components

Inside the `@kyro-cms/admin` workspace, most core UI components (such as the Sidebar, Layouts, and standard buttons) wrap their text nodes using the `i18next.t()` function or the `useTranslation()` hook.

```tsx
import { useTranslation } from "react-i18next";

export function CustomButton() {
  const { t } = useTranslation();
  return <button>{t("actions.save")}</button>;
}
```

Or within Astro components:
```astro
---
import i18next from "i18next";
---
<span>{i18next.t('nav.home', 'Home')}</span>
```

### 2. Extracting Translation Keys

Kyro CMS includes an automated extraction script configured via `i18next-parser`. To extract all hardcoded `t()` strings into the translation JSON files:

```bash
cd packages/admin
npx i18next -c i18next-parser.config.cjs
```

This command scans all `.ts`, `.tsx`, and `.astro` files and automatically populates `src/locales/en.json` (and other languages) with the newly discovered translation keys.

### 3. Adding New Languages

To add a new language translation file:

1. Create a new JSON file in `@kyro-cms/admin/src/locales/` (e.g., `fr.json`).
2. Add the JSON structure corresponding to your extracted keys.
3. Update `src/lib/i18n.ts` to import the new JSON file and add it to the `resources` object:

```typescript
import translationEN from "../locales/en.json";
import translationFR from "../locales/fr.json";

const resources = {
  en: { translation: translationEN },
  fr: { translation: translationFR },
};
```

Kyro CMS handles the language detection in the browser automatically based on the user's preferences, falling back to the Site Settings' `defaultLanguage`.
