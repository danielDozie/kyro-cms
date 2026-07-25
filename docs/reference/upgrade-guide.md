---
title: Upgrade Guide
description: Migration instructions for upgrading between major and minor versions of Kyro CMS.
---

# Upgrade Guide

Kyro CMS follows [semantic versioning](https://semver.org/). Future breaking changes and migration steps will be documented here.

---

## v0.12.18

- **Dynamic Content Overrides**: Full support for `"<blocksFieldName>.<blockSlug>.<fieldInBlock>"` syntax in `collectionOverrides`.
- **Form State & React Deduplication**: Updated `@kyro-cms/astro` integration to deduplicate `react` and `react-dom` in Vite config.
- **Array Item Titles**: Excluded discriminator keys (`linkType`, `type`, `blockType`, etc.) from being selected as tab titles.

## v0.12.17

- **Dynamic Content Overrides**: Supports path syntax `"<blocksFieldName>.<blockSlug>.<fieldInBlock>"` in `collectionOverrides`.
- **Array Item Tab Titles**: Discriminators (`linkType`, `type`, `blockType`, etc.) are automatically ignored in favor of real title/label/relationship targets.
- **Legacy Tabs Migration**: If migrating from legacy nested tab structures, use `node scripts/flatten-tabs.mjs --execute`.

## v0.12.16

Release of Kyro CMS v0.12.16.
