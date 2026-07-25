---
title: Rich Text React Renderer
description: Learn how to render Kyro CMS rich text JSON content into React components using kyro-rich-text-react.
---

# `@kyro-cms/kyro-rich-text-react`

A lightweight, headless React renderer for [Kyro CMS](https://kyro.dev) rich text content.

When you use the `richText` field in Kyro CMS, it stores the content as structured Tiptap/ProseMirror JSON (not raw HTML). This package allows you to easily render that JSON structure into React components.

By default, it is **completely headless and unstyled**, outputting clean semantic HTML (`<p>`, `<h1>`, `<strong>`). You have full control over the rendering by passing in custom components.

---

## Installation

```bash
npm install kyro-rich-text-react
# or
pnpm add kyro-rich-text-react
# or
yarn add kyro-rich-text-react
```

---

## Quick Start

Import the `KyroRichTextRenderer` component and pass the JSON array from your Kyro API to the `content` prop.

```tsx
import React from 'react';
import { KyroRichTextRenderer } from 'kyro-rich-text-react';

export default function BlogPost({ post }) {
  // post.content is the JSON array from Kyro
  return (
    <article className="blog-content">
      <KyroRichTextRenderer content={post.content} />
    </article>
  );
}
```

---

## Customizing Components (Advanced)

Because the renderer is headless, it doesn't come with CSS classes. If you use a CSS framework like Tailwind, or if you simply want to use your own custom React components for specific nodes (like links or headings), use the `components` prop.

The `components` prop accepts an object with two keys:
- `types`: For block-level nodes (paragraphs, headings, blockquotes, images)
- `marks`: For inline text formatting (bold, italic, links)

### Example: Tailwind CSS & Custom Components

```tsx
import React from 'react';
import { KyroRichTextRenderer, KyroRichTextComponents } from 'kyro-rich-text-react';
import Link from 'next/link';

const customComponents: KyroRichTextComponents = {
  types: {
    // Override headings to include Tailwind classes
    heading: ({ node, children }) => {
      const level = node.attrs?.level || 1;
      const classes = {
        1: 'text-4xl font-extrabold mb-6 mt-8',
        2: 'text-2xl font-bold mb-4 mt-6',
        3: 'text-xl font-semibold mb-3 mt-4',
      };
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      
      return <Tag className={classes[level] || ''}>{children}</Tag>;
    },
    
    // Custom Paragraphs
    paragraph: ({ children }) => (
      <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
    ),

    // Render Kyro uploads as responsive images
    image: ({ node }) => (
      <img 
        src={node.attrs?.src} 
        alt={node.attrs?.alt || 'Image'} 
        className="w-full rounded-xl shadow-lg my-6"
      />
    ),
  },
  
  marks: {
    // Map links to Next.js Link component for internal routing
    link: ({ mark, children }) => {
      const href = mark.attrs?.href || '#';
      const isInternal = href.startsWith('/') || href.startsWith('#');

      if (isInternal) {
        return <Link href={href} className="text-blue-600 hover:underline">{children}</Link>;
      }

      // External link
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {children}
        </a>
      );
    },
    
    // Style bold text
    bold: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>
  }
};

export default function BlogPost({ post }) {
  return (
    <KyroRichTextRenderer 
      content={post.content} 
      components={customComponents} 
    />
  );
}
```

---

## Using with Tailwind Typography

If you use the Tailwind `@tailwindcss/typography` plugin, you don't even need to write custom overrides. You can simply wrap the default headless output in a `.prose` class, and Tailwind will style all the semantic HTML automatically:

```tsx
import { KyroRichTextRenderer } from 'kyro-rich-text-react';

export default function BlogPost({ post }) {
  return (
    <div className="prose prose-blue lg:prose-xl mx-auto">
      <KyroRichTextRenderer content={post.content} />
    </div>
  );
}
```

---

## Supported Nodes and Marks

By default, the renderer supports mapping these Tiptap formats to standard HTML tags:

**Types (Blocks):**
- `doc` -> `<React.Fragment>`
- `paragraph` -> `<p>`
- `heading` -> `<h1>` - `<h6>`
- `blockquote` -> `<blockquote>`
- `bulletList` -> `<ul>`
- `orderedList` -> `<ol>`
- `listItem` -> `<li>`
- `codeBlock` -> `<pre><code>`
- `horizontalRule` -> `<hr />`
- `hardBreak` -> `<br />`
- `image` -> `<img>`

**Marks (Inline):**
- `bold` -> `<strong>`
- `italic` -> `<em>`
- `strike` -> `<s>`
- `code` -> `<code>`
- `underline` -> `<u>`
- `link` -> `<a>`

If your Kyro CMS uses custom blocks in the rich text editor, you can handle them by adding a new key to the `types` object in your `components` prop matching your custom block's `type` string.
