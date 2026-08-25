# @kyro-cms/field-locations

> Geographic and location field extension for Kyro CMS — featuring cascading Region and Country selectors with ISO 3166-1 dataset integration.

[![npm version](https://img.shields.io/npm/v/@kyro-cms/field-locations.svg)](https://www.npmjs.com/package/@kyro-cms/field-locations)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## 🌟 Overview

`@kyro-cms/field-locations` provides pre-configured, dependency-aware location fields for **Kyro CMS**. Easily attach ISO-compliant country and region dropdowns to any collection with automatic cascading filtering.

---

## ✨ Features

- 🌍 **Cascading Country Selection**: `CountryField` automatically filters its available options based on the value selected in `RegionField`.
- 📋 **Comprehensive ISO Dataset**: Built-in list of global regions and 240+ countries with standard ISO 3166-1 alpha-2 codes.
- ⚡ **Zero-Boilerplate**: Drop-in helper functions that return standard Kyro `SelectField` configurations.
- 🗂️ **Data Utilities**: Direct access to raw dataset arrays (`REGIONS`, `COUNTRIES`) and query helper functions (`getCountriesByRegion`, `getAllCountries`).

---

## 📦 Installation

```bash
pnpm add @kyro-cms/field-locations @kyro-cms/core
# or
npm install @kyro-cms/field-locations @kyro-cms/core
# or
bun add @kyro-cms/field-locations @kyro-cms/core
```

---

## 🚀 Usage

Import `RegionField` and `CountryField` into your `kyro.config.ts`:

```typescript
// kyro.config.ts
import { defineKyroConfig, createLocalAdapter } from "@kyro-cms/core";
import { RegionField, CountryField } from "@kyro-cms/field-locations";

export default defineKyroConfig({
  adapter: createLocalAdapter({ path: "./data/kyro.db" }),
  collections: [
    {
      slug: "destinations",
      label: "Destinations",
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
        },
        // 1. Region Selector
        RegionField({
          name: "region",
          label: "Geographic Region",
          required: true,
        }),
        // 2. Cascading Country Selector (filters when Region changes)
        CountryField({
          name: "country",
          label: "Country",
          dependsOn: "region", // Matches the field name of RegionField
          required: true,
        }),
        {
          name: "city",
          type: "text",
        },
      ],
    },
  ],
});
```

---

## ⚙️ Field Options

### `RegionField(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `"region"` | Field name in the document data schema. |
| `label` | `string` | `"Region"` | UI display label in the Admin panel. |
| `required` | `boolean` | `false` | Whether selecting a region is mandatory. |

### `CountryField(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `"country"` | Field name in the document data schema. |
| `label` | `string` | `"Country"` | UI display label in the Admin panel. |
| `dependsOn` | `string` | `"region"` | Name of sibling field to watch for dynamic country filtering. |
| `required` | `boolean` | `false` | Whether selecting a country is mandatory. |

---

## 🛠️ Data Utilities

If you need programmatic access to countries and regions in your frontend components or APIs:

```typescript
import {
  REGIONS,
  COUNTRIES,
  getCountriesByRegion,
  getAllCountries,
} from "@kyro-cms/field-locations";

// List all European countries as { label, value } options:
const europeanCountries = getCountriesByRegion("Europe");

// List all countries globally:
const allCountries = getAllCountries();
```

---

## 📄 License

MIT © [Daniel Dozie](https://github.com/danielDozie)
