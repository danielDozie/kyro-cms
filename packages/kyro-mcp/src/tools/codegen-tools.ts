import { z } from 'zod';
import type { McpToolDefinition, McpToolResult, McpExecutionContext } from '../types.js';

export const scaffoldAstroComponentTool: McpToolDefinition<{
  collection: string;
  componentType?: 'list' | 'detail' | 'card';
  clientMethod?: 'content-layer' | 'connect-sdk';
}> = {
  name: 'kyro_scaffold_astro_component',
  description: 'Generates production-ready Astro components tailored to a Kyro CMS collection schema.',
  inputSchema: {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        description: 'Slug of the collection to generate the component for.',
      },
      componentType: {
        type: 'string',
        enum: ['list', 'detail', 'card'],
        description: 'Type of component to scaffold.',
        default: 'list',
      },
      clientMethod: {
        type: 'string',
        enum: ['content-layer', 'connect-sdk'],
        description: 'Data fetching method (Astro Content Layer vs Kyro Connect SDK).',
        default: 'content-layer',
      },
    },
    required: ['collection'],
  },
  zodSchema: z.object({
    collection: z.string(),
    componentType: z.enum(['list', 'detail', 'card']).optional().default('list'),
    clientMethod: z.enum(['content-layer', 'connect-sdk']).optional().default('content-layer'),
  }),
  handler: async (args, context: McpExecutionContext): Promise<McpToolResult> => {
    const { config } = context;
    const collections: any[] = Array.isArray(config.collections)
      ? config.collections
      : Object.values(config.collections || {});

    const target = collections.find((c: any) => c.slug === args.collection);
    if (!target) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Collection '${args.collection}' not found. Available collections: ${collections.map((c: any) => c.slug).join(', ')}`,
          },
        ],
      };
    }

    const colSlug = target.slug;
    const colName = (target.label || target.slug).replace(/[^a-zA-Z0-9]/g, '');
    const fields = target.fields || [];

    let componentCode = '';

    if (args.componentType === 'list') {
      if (args.clientMethod === 'content-layer') {
        componentCode = `---
// src/components/${colName}List.astro
import { getCollection } from 'astro:content';

const items = await getCollection('${colSlug}');
---

<section class="${colSlug}-list-section">
  <div class="container">
    <h2 class="title">${target.label || colSlug}</h2>
    <div class="grid">
      {items.map((item) => (
        <article class="card" key={item.id}>
          <h3>{item.data.title || item.data.name || item.id}</h3>
          ${fields.some((f: any) => f.name === 'description' || f.name === 'excerpt') ? '<p>{item.data.description || item.data.excerpt}</p>' : ''}
          <a href={\`/${colSlug}/\${item.data.slug || item.id}\`}>View Details &rarr;</a>
        </article>
      ))}
    </div>
  </div>
</section>

<style>
  .${colSlug}-list-section {
    padding: 2rem 0;
  }
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  .card {
    background: #111;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 1.5rem;
    color: #fff;
  }
  .card a {
    display: inline-block;
    margin-top: 1rem;
    color: #38bdf8;
    text-decoration: none;
  }
</style>
`;
      } else {
        componentCode = `---
// src/components/${colName}List.astro
import { createClient } from '@kyro-cms/connect';

const client = createClient({
  url: import.meta.env.KYRO_API_URL || 'http://localhost:4321/api/trpc',
  apiKey: import.meta.env.KYRO_API_KEY,
});

const { docs: items } = await client['${colSlug}'].find.query({ page: 1, limit: 12 });
---

<section class="${colSlug}-list-section">
  <div class="container">
    <h2 class="title">${target.label || colSlug}</h2>
    <div class="grid">
      {items.map((item: any) => (
        <article class="card" key={item.id}>
          <h3>{item.title || item.name || item.id}</h3>
          <a href={\`/${colSlug}/\${item.slug || item.id}\`}>Read more &rarr;</a>
        </article>
      ))}
    </div>
  </div>
</section>
`;
      }
    } else if (args.componentType === 'detail') {
      componentCode = `---
// src/pages/${colSlug}/[slug].astro
import { getCollection, getEntry } from 'astro:content';

export async function getStaticPaths() {
  const entries = await getCollection('${colSlug}');
  return entries.map((entry) => ({
    params: { slug: entry.data.slug || entry.id },
    props: { entry },
  }));
}

const { entry } = Astro.props;
---

<article class="${colSlug}-detail">
  <header>
    <h1>{entry.data.title || entry.data.name}</h1>
    {entry.data.createdAt && <time>{new Date(entry.data.createdAt).toLocaleDateString()}</time>}
  </header>

  <main class="content">
    {entry.data.content}
  </main>
</article>
`;
    } else {
      componentCode = `---
// src/components/${colName}Card.astro
interface Props {
  data: {
    id: string;
    title?: string;
    slug?: string;
    [key: string]: any;
  };
}

const { data } = Astro.props;
---

<div class="${colSlug}-card">
  <h3>{data.title || data.id}</h3>
  <a href={\`/${colSlug}/\${data.slug || data.id}\`}>View</a>
</div>
`;
    }

    return {
      content: [
        {
          type: 'text',
          text: componentCode,
        },
      ],
    };
  },
};

export const scaffoldSchemaTool: McpToolDefinition<{
  slug: string;
  label: string;
  folder?: string;
  fields: Array<{ name: string; type: string; required?: boolean; relationTo?: string }>;
  drafts?: boolean;
}> = {
  name: 'kyro_scaffold_schema',
  description: 'Synthesizes a TypeScript CollectionConfig definition for kyro.config.ts following strict Kyro CMS schema standards.',
  inputSchema: {
    type: 'object',
    properties: {
      slug: { type: 'string', description: 'Collection slug (e.g. "products").' },
      label: { type: 'string', description: 'Human readable label (e.g. "Products").' },
      folder: { type: 'string', description: 'Virtual folder group name (e.g. "E-Commerce").' },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            required: { type: 'boolean' },
            relationTo: { type: 'string' },
          },
          required: ['name', 'type'],
        },
      },
      drafts: { type: 'boolean', default: true },
    },
    required: ['slug', 'label', 'fields'],
  },
  zodSchema: z.object({
    slug: z.string(),
    label: z.string(),
    folder: z.string().optional().default('General'),
    fields: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().optional(),
        relationTo: z.string().optional(),
      })
    ),
    drafts: z.boolean().optional().default(true),
  }),
  handler: async (args): Promise<McpToolResult> => {
    const fieldsFormatted = args.fields
      .map((f) => {
        let line = `    { name: '${f.name}', type: '${f.type}'`;
        if (f.required) line += `, required: true`;
        if (f.relationTo) line += `, relationTo: '${f.relationTo}'`;
        line += ` },`;
        return line;
      })
      .join('\n');

    const code = `import { defineKyroConfig, type CollectionConfig } from '@kyro-cms/core';

export const ${args.slug}Collection: CollectionConfig = {
  slug: '${args.slug}',
  label: '${args.label}',
  folder: '${args.folder}',
  timestamps: true,
  versions: {
    drafts: ${args.drafts ? 'true' : 'false'},
    maxPerDoc: 10,
  },
  fields: [
${fieldsFormatted}
  ],
};
`;

    return {
      content: [
        {
          type: 'text',
          text: code,
        },
      ],
    };
  },
};
