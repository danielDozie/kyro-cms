# @kyro-cms/rich-text-react

> Lightweight, headless React renderer for Kyro CMS ProseMirror / TipTap RichText JSON structures.

[![npm version](https://img.shields.io/npm/v/@kyro-cms/rich-text-react.svg)](https://www.npmjs.com/package/@kyro-cms/rich-text-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## 🌟 Overview

When you use the `richtext` field in **Kyro CMS**, content is stored as clean, structured ProseMirror/TipTap JSON rather than raw unescaped HTML strings.

`@kyro-cms/rich-text-react` renders that structured JSON into React components with **zero runtime overhead**. By default, it is **100% headless and unstyled**, generating clean semantic HTML (`<p>`, `<h1>`, `<strong>`, `<blockquote>`, `<ul>`, etc.) while allowing you to override any node or mark with custom React components and CSS classes.

---

## 📦 Installation

```bash
pnpm add @kyro-cms/rich-text-react
# or
npm install @kyro-cms/rich-text-react
# or
bun add @kyro-cms/rich-text-react
```

---

## 🚀 Quick Start

Pass the JSON `content` from your Kyro API document directly into `<KyroRichTextRenderer />`:

```tsx
import React from 'react';
import { KyroRichTextRenderer } from '@kyro-cms/rich-text-react';

export default function BlogPost({ post }) {
  return (
    <article className="prose max-w-none">
      <h1>{post.title}</h1>
      <KyroRichTextRenderer content={post.content} />
    </article>
  );
}
```

---

## 🎨 Custom Node & Mark Components

You can completely customize how any node or inline mark is rendered using the `components` prop:

```tsx
import React from 'react';
import { KyroRichTextRenderer, type KyroRichTextComponents } from '@kyro-cms/rich-text-react';

const customComponents: KyroRichTextComponents = {
  types: {
    // Custom Heading with Tailwind styling & anchor links
    heading: ({ node, children }) => {
      const level = node.attrs?.level || 1;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const headingStyles: Record<number, string> = {
        1: 'text-4xl font-extrabold tracking-tight text-slate-900 my-6',
        2: 'text-2xl font-bold text-slate-800 my-4',
        3: 'text-xl font-semibold text-slate-800 my-3',
      };

      return <Tag className={headingStyles[level] || ''}>{children}</Tag>;
    },

    // Custom Paragraphs
    paragraph: ({ children }) => (
      <p className="text-base leading-7 text-slate-600 mb-4">{children}</p>
    ),

    // Custom Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-indigo-500 pl-4 my-4 italic text-slate-700 bg-slate-50 py-2 rounded-r">
        {children}
      </blockquote>
    ),

    // Custom Code Blocks
    codeBlock: ({ node }) => (
      <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-sm my-4">
        <code>{node.attrs?.code || node.content?.[0]?.text}</code>
      </pre>
    ),

    // Custom Media / Image Node
    image: ({ node }) => (
      <figure className="my-6">
        <img
          src={node.attrs?.src}
          alt={node.attrs?.alt || 'Content image'}
          className="rounded-xl shadow-md w-full object-cover"
        />
        {node.attrs?.caption && (
          <figcaption className="text-center text-sm text-slate-500 mt-2">
            {node.attrs.caption}
          </figcaption>
        )}
      </figure>
    ),
  },

  marks: {
    // Custom Links (e.g. Next.js router link or external target)
    link: ({ mark, children }) => {
      const href = mark.attrs?.href || '#';
      const isExternal = href.startsWith('http');

      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-indigo-600 hover:text-indigo-800 underline font-medium"
        >
          {children}
        </a>
      );
    },

    // Custom Bold / Strong
    bold: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,

    // Inline Code
    code: ({ children }) => (
      <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-sm text-pink-600">
        {children}
      </code>
    ),
  },
};

export function PostContent({ content }: { content: any }) {
  return <KyroRichTextRenderer content={content} components={customComponents} />;
}
```

---

## 🛠️ Supported Nodes & Marks

| Node Type | Default Tag | Custom Component Key |
|---|---|---|
| Paragraph | `<p>` | `types.paragraph` |
| Headings 1–6 | `<h1>` – `<h6>` | `types.heading` |
| Blockquote | `<blockquote>` | `types.blockquote` |
| Code Block | `<pre><code>` | `types.codeBlock` |
| Bullet List | `<ul><li>` | `types.bulletList`, `types.listItem` |
| Ordered List | `<ol><li>` | `types.orderedList`, `types.listItem` |
| Image | `<img>` | `types.image` |
| Horizontal Rule | `<hr>` | `types.horizontalRule` |
| Bold / Strong | `<strong>` | `marks.bold` |
| Italic / Em | `<em>` | `marks.italic` |
| Underline | `<u>` | `marks.underline` |
| Strike | `<s>` | `marks.strike` |
| Link | `<a>` | `marks.link` |
| Inline Code | `<code>` | `marks.code` |

---

## 📄 License

MIT © [Daniel Dozie](https://github.com/danielDozie)
