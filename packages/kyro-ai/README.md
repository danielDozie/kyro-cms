# @kyro-cms/ai

> Official AI plugin pack for Kyro CMS — automated SEO metadata generation, in-editor writing assistant, vector embeddings & semantic search, vision-powered alt-text, and prompt-to-schema synthesis.

[![npm version](https://img.shields.io/npm/v/@kyro-cms/ai.svg)](https://www.npmjs.com/package/@kyro-cms/ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## 🌟 Overview

`@kyro-cms/ai` provides a suite of modular AI plugins and utilities designed to bring modern LLM and Vision capabilities into **Kyro CMS** and Astro applications. Built on top of the [Vercel AI SDK](https://sdk.vercel.ai/), it supports OpenAI, Anthropic, Google Gemini, Ollama, and any custom provider.

---

## ✨ Key Features

- 🔍 **Auto-SEO Generation (`AiAutoSeoPlugin`)**: Generates optimized SEO titles, descriptions, and keyword tags automatically upon document creation or publishing.
- ✍️ **In-Editor Writing Assistant (`AiAssistantPlugin`)**: Integrates directly into Kyro's RichText editor toolbar for on-the-fly rewriting, summarizing, grammar polishing, and content expansion.
- 🧠 **Vector Embeddings & Semantic Search (`AiVectorPlugin`)**: Hooks into document lifecycles to automatically calculate vector embeddings on content updates, complete with cosine similarity search ranking for RAG in Astro.
- 👁️ **Vision Alt-Text Generator (`generateImageAltText`)**: Analyzes uploaded media with multimodal vision models to generate accessible alt-text, captions, and keyword tags.
- 🏗️ **Prompt-to-Schema Synthesizer (`generateKyroSchemaFromPrompt`)**: Generates production-ready TypeScript `CollectionConfig` definitions from natural language prompts.

---

## 📦 Installation

```bash
pnpm add @kyro-cms/ai @kyro-cms/core
# or
npm install @kyro-cms/ai @kyro-cms/core
# or
bun add @kyro-cms/ai @kyro-cms/core
```

Ensure your environment variables are configured with your AI provider key (e.g. `OPENAI_API_KEY`):

```bash
# .env
OPENAI_API_KEY="sk-..."
```

---

## 🚀 Plugins & Usage

### 1. Auto SEO Plugin (`AiAutoSeoPlugin`)

Automatically extracts text content from specified collections and synthesizes high-ranking SEO metadata before saving:

```typescript
// kyro.config.ts
import { defineKyroConfig, createLocalAdapter } from "@kyro-cms/core";
import { AiAutoSeoPlugin } from "@kyro-cms/ai";

export default defineKyroConfig({
  adapter: createLocalAdapter({ path: "./data/kyro.db" }),
  plugins: [
    new AiAutoSeoPlugin({
      collections: ["posts", "pages", "products"],
      modelName: "gpt-4o-mini", // Optional (default: "gpt-4o-mini")
    }),
  ],
  collections: [
    {
      slug: "posts",
      label: "Posts",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "content", type: "richtext" },
        // The plugin will populate metaTitle, metaDescription, and keywords
        { name: "metaTitle", type: "text" },
        { name: "metaDescription", type: "textarea" },
        { name: "keywords", type: "text" },
      ],
    },
  ],
});
```

---

### 2. AI Writing Assistant Plugin (`AiAssistantPlugin`)

Injects an AI completion and assistance endpoint into your Kyro server middleware and mounts a trigger button in the RichText toolbar:

```typescript
// kyro.config.ts
import { defineKyroConfig } from "@kyro-cms/core";
import { AiAssistantPlugin } from "@kyro-cms/ai";

export default defineKyroConfig({
  plugins: [
    new AiAssistantPlugin({
      modelName: "gpt-4o-mini",
      apiRoute: "/api/kyro/ai/completion", // Default endpoint
    }),
  ],
});
```

---

### 3. Vector Embeddings & Semantic Search (`AiVectorPlugin`)

Generates semantic vector embeddings whenever documents in target collections are created or updated:

```typescript
// kyro.config.ts
import { defineKyroConfig } from "@kyro-cms/core";
import { AiVectorPlugin } from "@kyro-cms/ai";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

const vectorPlugin = new AiVectorPlugin({
  collections: ["articles", "documentation"],
  embedFields: ["title", "content", "summary"],
  targetField: "_embedding", // Stored in document payload
  embedFunction: async (text) => {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });
    return embedding;
  },
});

export default defineKyroConfig({
  plugins: [vectorPlugin],
});
```

#### Performing Semantic Similarity Search in Astro:

```astro
---
// src/pages/search.astro
import { kyroLoader } from "@kyro-cms/astro";
import { cosineSimilarity } from "@kyro-cms/ai";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

const query = Astro.url.searchParams.get("q") || "";
const articles = await kyroLoader({ collection: "articles" }).load();

let results = [];
if (query) {
  const { embedding: queryVector } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });

  results = articles
    .filter((doc) => Array.isArray(doc._embedding))
    .map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryVector, doc._embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
---

<form method="GET">
  <input name="q" value={query} placeholder="Ask anything in natural language..." />
  <button type="submit">Search</button>
</form>

<ul>
  {results.map((item) => (
    <li>
      <h3>{item.title} (Match: {Math.round(item.score * 100)}%)</h3>
      <p>{item.summary}</p>
    </li>
  ))}
</ul>
```

---

### 4. Vision Alt-Text Generation (`generateImageAltText`)

Generates concise alt-text for screen readers, SEO captions, and tags from image URLs:

```typescript
import { generateImageAltText } from "@kyro-cms/ai";
import { openai } from "@ai-sdk/openai";

const result = await generateImageAltText(
  "https://my-site.com/uploads/photo-123.jpg",
  {
    model: openai("gpt-4o-mini"),
  }
);

console.log(result);
// {
//   altText: "A developer working on a laptop in a modern brightly lit coffee shop",
//   caption: "Remote software engineer coding in an urban workspace.",
//   tags: ["developer", "laptop", "workspace", "coffee"]
// }
```

---

### 5. Natural Language Prompt-to-Schema (`generateKyroSchemaFromPrompt`)

Synthesizes valid, strongly-typed Kyro collection schemas using LLMs:

```typescript
import { generateKyroSchemaFromPrompt } from "@kyro-cms/ai";
import { openai } from "@ai-sdk/openai";

const { collections, explanation } = await generateKyroSchemaFromPrompt({
  model: openai("gpt-4o"),
  prompt: "A SaaS marketing website with Case Studies, Testimonials, and Pricing Tiers with feature lists.",
});

console.log(explanation);
console.log(JSON.stringify(collections, null, 2));
```

---

## 📄 License

MIT © [Daniel Dozie](https://github.com/danielDozie)
