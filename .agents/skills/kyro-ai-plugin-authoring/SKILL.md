---
name: kyro-ai-plugin-authoring
description: Standards for developing AI plugins in packages/kyro-ai/, automated SEO metadata generation, alt-text generators, and LLM integrations.
---

# Kyro AI Plugin & Extension Guide

Use this skill when developing or extending AI plugins inside `packages/kyro-ai/` (such as `AiAutoSeoPlugin` or `AiAssistantPlugin`).

## 1. Class-Based Plugin Architecture

Kyro plugins extend the `KyroPlugin` base class from `@kyro-cms/core`:

```ts
import { KyroPlugin, type PluginAPI } from '@kyro-cms/core';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface AiAutoSeoPluginOptions {
  provider?: any;
  modelName?: string;
  collections: string[];
}

export class AiAutoSeoPlugin extends KyroPlugin {
  private options: AiAutoSeoPluginOptions;

  constructor(options: AiAutoSeoPluginOptions) {
    super('ai-auto-seo');
    this.displayName = 'AI Auto SEO';
    this.description = 'Automatically generates SEO metadata for specific collections.';
    this.options = options;
  }

  async init(kyro: any): Promise<void> {
    const { collections } = this.options;

    // Attach hook listeners to collection lifecycle events
    kyro.on('beforeChange', async ({ data, collection }: any) => {
      const collectionSlug = typeof collection === 'string' ? collection : collection?.slug;
      if (!collections.includes(collectionSlug)) return data;

      // Extract raw text recursively from TipTap / Slate blocks / target fields
      // Query global site settings (site-settings, brand-settings) for Schema.org context
      // Skip if metaTitle & metaDescription are already present
      return data;
    });
  }
}
```

## 2. Instantiating Plugins in `kyro.config.ts`

Plugins are passed as instantiated class objects inside `kyro.config.ts`:

```ts
import { AiAssistantPlugin, AiAutoSeoPlugin } from "@kyro-cms/ai";
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export default {
  // ...
  plugins: [
    new AiAssistantPlugin({
      provider: groq,
      modelName: 'llama-3.1-8b-instant',
    }),
    new AiAutoSeoPlugin({
      provider: groq,
      modelName: 'llama-3.1-8b-instant',
      collections: ['posts', 'pages'],
    }),
  ],
};
```

## 3. Registering Admin Components & Server Middleware

Plugins can inject admin components or custom backend routes:

```ts
// Inside constructor:
this.adminComponents['KyroRichTextToolbarAI'] = {
  type: 'editor-toolbar-button',
  route: '/api/kyro/ai/completion',
};

// Inside init():
this.serverMiddleware = (app: any) => {
  app.post('/api/kyro/ai/completion', async (req, res) => {
    // Works across Hono and Express context signatures
  });
};
```
