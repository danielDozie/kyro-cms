# Astro 5+ Native Integration

Kyro CMS is built ground-up to be the **#1 Astro-Native Headless CMS**. It seamlessly integrates into Astro 5+ projects via the dedicated `@kyro-cms/astro` package, using native Content Layer loaders, Astro Actions, Middleware, Dev Toolbar apps, and Zero-JS `.astro` rendering components.

---

## Installation

Install `@kyro-cms/core` and `@kyro-cms/astro` in your Astro project:

```bash
pnpm add @kyro-cms/core @kyro-cms/astro
```

---

## 1. <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Core Astro Integration (`kyro`)

The core integration automatically configures Vite aliases (`kyro:config`), externalizes native database drivers, and injects API route handlers.

### Setup (`astro.config.mjs`):

```javascript
import { defineConfig } from 'astro/config';
import kyro from '@kyro-cms/astro';

export default defineConfig({
  integrations: [
    kyro({
      configPath: './kyro.config.ts', // Path to your Kyro configuration
      apiPath: '/api',                // Base path for REST API endpoints
      adminPath: '/admin',            // Base path for Admin Dashboard
      enableGraphQL: true,            // Enable GraphQL at /api/graphql
      enableTRPC: false,              // Enable tRPC at /api/trpc
      enableWebSocket: false,         // Enable WebSockets for live subscriptions
    }),
  ],
});
```

---

## 2. <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px;"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/></svg> Astro Content Layer Loader (`kyroLoader`)

Astro 5+ introduced custom Content Layer loaders. Use `kyroLoader()` in `src/content.config.ts` to feed your Kyro CMS collections directly into Astro's `getCollection()` store with full type-safety and sub-second HMR store sync.

### Setup (`src/content.config.ts`):

```typescript
import { defineCollection } from 'astro:content';
import { kyroLoader } from '@kyro-cms/astro';

export const blog = defineCollection({
  loader: kyroLoader({
    collection: 'posts',
    drafts: import.meta.env.DEV, // Automatically include draft entries in dev mode
  }),
});

export const collections = { blog };
```

### Querying in Astro Pages (`src/pages/blog/index.astro`):

```astro
---
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
---

<h1>Blog Posts</h1>
<ul>
  {posts.map((post) => (
    <li>
      <a href={`/blog/${post.id}`}>{post.data.title}</a>
    </li>
  ))}
</ul>
```

---

## 3. <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> Astro Dev Toolbar Widget (`kyroDevToolbarIntegration`)

Kyro CMS provides a custom widget inside Astro's bottom Dev Toolbar. It lets you monitor live database connection status, inspect active collections, toggle draft mode preview, and jump straight to `/admin` with a single click.

### Enabling the Dev Toolbar Widget (`astro.config.mjs`):

```javascript
import { defineConfig } from 'astro/config';
import { kyroDevToolbarIntegration } from '@kyro-cms/astro';

export default defineConfig({
  integrations: [
    kyroDevToolbarIntegration({ enabled: true }),
  ],
});
```

---

## 4. <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Astro Actions for CMS Forms (`kyroAction`)

Astro Actions (`astro:actions`) handle type-safe server-side form submissions and RPC calls. `kyroAction` automatically validates form data against your Kyro collection Zod schemas and saves documents straight into your database.

### Creating an Action (`src/actions/index.ts`):

```typescript
import { kyroAction } from '@kyro-cms/astro';
import { z } from 'zod';

export const server = {
  submitContact: kyroAction({
    collection: 'submissions',
    action: 'create',
    schema: z.object({
      name: z.string().min(2),
      email: z.string().email(),
      message: z.string().min(10),
    }),
  }),
};
```

### Submitting from an Astro Component (`src/components/ContactForm.astro`):

```astro
---
import { actions } from 'astro:actions';
---

<form action={actions.submitContact}>
  <input name="name" type="text" placeholder="Your Name" required />
  <input name="email" type="email" placeholder="Your Email" required />
  <textarea name="message" placeholder="Your message..." required></textarea>
  <button type="submit">Submit Form</button>
</form>
```

---

## 5. <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Astro Auth Middleware (`kyroAuthMiddleware`)

Injects current authenticated Kyro user sessions into `Astro.locals.kyroUser` and protects routes automatically.

### Setup (`src/middleware.ts`):

```typescript
import { kyroAuthMiddleware } from '@kyro-cms/astro';

export const onRequest = kyroAuthMiddleware({
  protectedRoutes: ['/dashboard/**', '/profile/**'],
  loginPath: '/admin/login',
});
```

### Accessing User Session in Astro Pages:

```astro
---
const user = Astro.locals.kyroUser;
---

{user ? (
  <p>Welcome back, <strong>{user.email}</strong>!</p>
) : (
  <a href="/admin/login">Log in</a>
)}
```

---

## 6. <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px;"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg> Pure Astro Zero-JS Component Renderers

Ship zero client-side JavaScript to your users by using native `.astro` components for content rendering.

### `<KyroRichText />` — Zero-JS Rich Text Renderer

Converts Kyro Rich Text AST into clean, semantic static HTML without loading React or client hydration runtimes.

```astro
---
import KyroRichText from '@kyro-cms/astro/components/KyroRichText.astro';

const { post } = Astro.props;
---

<KyroRichText content={post.content} class="prose dark:prose-invert" />
```

### `<KyroImage />` — Responsive Media Renderer

Wraps Kyro media items into responsive, accessible images with lazy loading and optimized attributes.

```astro
---
import KyroImage from '@kyro-cms/astro/components/KyroImage.astro';

const { heroImage } = Astro.props;
---

<KyroImage src={heroImage} width={1200} height={630} loading="eager" alt="Hero banner" />
```

### `<KyroServerIsland />` — Astro Server Islands Helper

For hybrid / SSG sites, use Astro 5 Server Islands (`server:defer`) to defer dynamic Kyro CMS content with automatic animated skeleton fallbacks:

```astro
---
import KyroServerIsland from '@kyro-cms/astro/components/KyroServerIsland.astro';
---

<KyroServerIsland collection="comments" id={Astro.params.id} server:defer>
  <div slot="fallback" class="animate-pulse bg-stone-100 p-4 rounded-lg">
    Loading real-time comments...
  </div>
</KyroServerIsland>
```

---

## 7. <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px;"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg> CLI & TypeGen Commands

Kyro provides command-line tools for database operations and TypeScript generation:

* **`npx kyro typegen`**: Scans your `kyro.config.ts` and updates type definitions in `src/env.d.ts` or `kyro-types.d.ts`.
* **`npx kyro migrate`**: Runs Drizzle / ORM database migrations based on configured collections.
* **`npx kyro dev`**: Starts the Astro dev server with full Kyro CMS API and Admin dashboard routes active.
