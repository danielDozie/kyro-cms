---
title: Kyro AI
description: Enhance your CMS with AI-powered SEO generation and assistant capabilities.
---

# @kyro-cms/ai

The `@kyro-cms/ai` package provides deep AI integration into Kyro CMS, powered by the Vercel AI SDK. It allows you to easily inject automated SEO metadata generation and a floating conversational AI assistant into your admin panel.

## Installation

```bash
pnpm add @kyro-cms/ai ai
```

You will also need to install the AI provider SDK of your choice (e.g. `@ai-sdk/groq`, `@ai-sdk/openai`, or `@ai-sdk/anthropic`).

## Plugins

### 1. AiAutoSeoPlugin

This plugin listens to document creations and updates. If the target collections contain empty SEO fields (like `metaTitle` and `metaDescription`), it will automatically generate highly optimized SEO copy based on the document's content. It also natively supports extracting content from Kyro's rich text fields.

#### Configuration

In your `kyro.config.ts`, initialize the plugin and provide your preferred AI model:

```typescript
import { defineKyroConfig } from "@kyro-cms/core";
import { AiAutoSeoPlugin } from "@kyro-cms/ai";
import { createGroq } from "@ai-sdk/groq";

// Using Groq for blazingly fast inference
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineKyroConfig({
  // ...
  plugins: [
    new AiAutoSeoPlugin({
      collections: ["posts", "pages", "products"],
      provider: groq,
      modelName: "llama-3.1-8b-instant",
    }),
  ],
});
```

> **Note on Providers:** We strongly recommend using the provider's native SDK (e.g., `createGroq` from `@ai-sdk/groq`) rather than the OpenAI compatibility layer, as native SDKs gracefully handle fallback mechanisms when strict `json_schema` parsing is unsupported by the model.

### 2. AiAssistantPlugin

This plugin injects a conversational AI assistant directly into the Kyro Admin UI. Content editors can ask the assistant for help generating copy, outlining blog posts, or brainstorming ideas.

#### Configuration

```typescript
import { defineKyroConfig } from "@kyro-cms/core";
import { AiAssistantPlugin } from "@kyro-cms/ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export default defineKyroConfig({
  // ...
  plugins: [
    new AiAssistantPlugin({
      provider: groq,
      modelName: "llama-3.1-8b-instant",
    }),
  ],
});
```
