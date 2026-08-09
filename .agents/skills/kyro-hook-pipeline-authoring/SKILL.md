---
name: kyro-hook-pipeline-authoring
description: Rules for authoring collection & field lifecycle hooks using HookPipeline and zero-latency access control checks.
---

# Kyro Hook Pipeline & Access Control Guide

Use this skill when authoring collection lifecycle hooks or implementing authorization checks.

## 1. Lifecycle Hook Execution Order

Kyro CMS executes hooks using the `HookPipeline` pattern (`src/hooks/HookPipeline.ts`) in the following sequence:

1. `beforeOperation`
2. `beforeValidate`
3. `beforeChange` (Data Mutation)
4. *Database Write*
5. `afterChange`
6. `afterOperation`

Read operations trigger:
1. `beforeRead`
2. *Database Query*
3. `afterRead` (Data Normalization & Population)

## 2. Defining Lifecycle Hooks in Config

```ts
export default defineKyroConfig({
  collections: [
    {
      slug: 'posts',
      hooks: {
        beforeChange: [
          async ({ data, req, operation }) => {
            if (operation === 'create') {
              data.author = req.user.id;
            }
            return data;
          },
        ],
        afterChange: [
          async ({ doc, previousDoc, operation }) => {
            // Trigger webhooks or search indexing
          },
        ],
      },
      fields: [...],
    },
  ],
});
```

## 3. Zero-Latency Access Control Checks

- Use `checkAccessEnabled()` (`src/api-handler.ts`) for synchronous reads from cached instance settings.
- Avoid firing per-request asynchronous DB queries to check global security settings.
