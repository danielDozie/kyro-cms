# Astro 5+ Native Integration

Kyro CMS is built ground-up to be the **#1 Astro-Native Headless CMS**. It seamlessly integrates into Astro 5+ projects using native Content Layer loaders, Astro Actions, Middleware, Dev Toolbar apps, and Zero-JS `.astro` rendering components.

---

## 1. 🔌 Astro Content Layer Loader (`kyroLoader`)

Astro 5+ introduced custom Content Layer loaders. Use `kyroLoader()` in `src/content.config.ts` to feed your Kyro CMS collections directly into Astro's `getCollection()` store with full type-safety and sub-second HMR store sync.

### Setup (`src/content.config.ts`):

```typescript
import { defineCollection } from 'astro:content';
import { kyroLoader } from '@kyro-cms/core';

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

## 2. 🧰 Astro Dev Toolbar Widget

Kyro CMS provides a custom widget inside Astro's bottom Dev Toolbar. It lets you monitor live database connection status, inspect active collections, toggle draft mode preview, and jump straight to `/admin` with a single click.

### Enabling the Dev Toolbar Widget (`astro.config.mjs`):

```javascript
import { defineConfig } from 'astro/config';
import { kyroDevToolbarIntegration } from '@kyro-cms/core';

export default defineConfig({
  integrations: [
    kyroDevToolbarIntegration({ enabled: true }),
  ],
});
```

---

## 3. ⚡ Astro Actions for CMS Forms (`kyroAction`)

Astro Actions (`astro:actions`) handle type-safe server-side form submissions and RPC calls. `kyroAction` automatically validates form data against your Kyro collection Zod schemas and saves documents straight into your database.

### Creating an Action (`src/actions/index.ts`):

```typescript
import { kyroAction } from '@kyro-cms/core';
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

## 4. 🚀 Pure Astro Zero-JS Component Renderers

Ship zero client-side JavaScript to your users by using native `.astro` components for content rendering.

### `<KyroRichText />` — Zero-JS Rich Text Renderer

Converts Kyro Rich Text AST into clean, semantic static HTML without loading React or client hydration runtimes.

```astro
---
import KyroRichText from '@kyro-cms/core/components/KyroRichText.astro';

const { post } = Astro.props;
---

<KyroRichText content={post.content} class="prose dark:prose-invert" />
```

### `<KyroImage />` — Responsive Media Renderer

Wraps Kyro media items into responsive, accessible images.

```astro
---
import KyroImage from '@kyro-cms/core/components/KyroImage.astro';

const { heroImage } = Astro.props;
---

<KyroImage src={heroImage} width={1200} height={630} loading="eager" />
```

### `<KyroBlocks />` — Zero-JS Page Builder

Renders block layout arrays defined in `kyro.config.ts`.

```astro
---
import KyroBlocks from '@kyro-cms/core/components/KyroBlocks.astro';
import HeroBlock from '../components/blocks/HeroBlock.astro';
import CalloutBlock from '../components/blocks/CalloutBlock.astro';

const { page } = Astro.props;
---

<KyroBlocks blocks={page.blocks}>
  <HeroBlock slot="hero" />
  <CalloutBlock slot="callout" />
</KyroBlocks>
```

---

## 5. 🛡️ Astro Auth Middleware (`kyroAuthMiddleware`)

Injects current authenticated Kyro user sessions into `Astro.locals.kyroUser` and protects routes automatically.

### Setup (`src/middleware.ts`):

```typescript
import { kyroAuthMiddleware } from '@kyro-cms/core';

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

## 6. 🔑 Type-Safe Environment Variables (`astro:env`)

Validate Kyro secrets and public URLs using Astro 5's native `astro:env` validator in `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import { envField } from 'astro/config';
import { kyroEnvSchema } from '@kyro-cms/core';

export default defineConfig({
  env: {
    schema: {
      ...kyroEnvSchema({ requireDatabase: true }),
    },
  },
});
```

---

## 🏝️ 7. Astro Server Islands Helper (`KyroServerIsland`)

For hybrid / SSG sites, use Astro 5 Server Islands (`server:defer`) to defer dynamic Kyro CMS content with automatic animated skeleton fallbacks:

```astro
---
import KyroServerIsland from '@kyro-cms/core/components/KyroServerIsland.astro';
---

<KyroServerIsland collection="comments" id={Astro.params.id} server:defer>
  <div slot="fallback" class="animate-pulse bg-stone-100 p-4 rounded-lg">
    Loading real-time comments...
  </div>
</KyroServerIsland>
```
