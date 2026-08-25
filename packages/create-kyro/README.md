# @kyro-cms/create

> Official interactive and headless project scaffolder for Kyro CMS.

[![npm version](https://img.shields.io/npm/v/@kyro-cms/create.svg)](https://www.npmjs.com/package/@kyro-cms/create)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

---

## 🌟 Overview

`@kyro-cms/create` is the fastest way to bootstrap a production-ready **Kyro CMS** application with Astro. It provisions the project structure, generates your `kyro.config.ts` and `astro.config.mjs`, initializes your database adapters, provisions local Super Admin credentials, and initializes a Git repository.

---

## 🚀 Quick Start

Run the interactive wizard using your favorite package manager:

```bash
# pnpm (recommended)
pnpm create @kyro-cms@latest my-app

# npm
npm create @kyro-cms@latest my-app

# bun
bun create @kyro-cms@latest my-app

# Direct execution with npx
npx @kyro-cms/create@latest my-app
```

---

## 🤖 Non-Interactive Setup (CI/CD & Headless Environments)

`@kyro-cms/create` includes automated Non-TTY terminal fallback detection (`!process.stdout.isTTY`) and manual option parsing. Pass parameters directly to bypass prompts in scripts, Dockerfiles, or background workflows:

```bash
# Scaffold with SQLite (default) and blog template:
npx @kyro-cms/create my-app --db sqlite --template blog --yes

# Scaffold with PostgreSQL:
npx @kyro-cms/create my-app --db postgres --template ecommerce --admin-email admin@example.com -y
```

---

## 🚩 CLI Options

| Flag | Shorthand | Description | Options |
|---|---|---|---|
| `--database <type>` | `--db` | Database adapter configuration | `sqlite`, `postgres`, `mongodb` |
| `--template <name>` | `-t` | Project starter template | `minimal`, `starter`, `blog`, `ecommerce`, `kitchen-sink` |
| `--admin-email <email>` | — | Initial super admin email address | Any valid email (default: `admin@kyro.local`) |
| `--yes` | `-y` | Skip all prompts and use defaults/flags | `true` |
| `--non-interactive` | — | Explicitly force non-interactive mode | `true` |

---

## 📦 What It Generates

1. **`astro.config.mjs`**: Preconfigured with `kyro()` and `kyroAdmin()` integrations.
2. **`kyro.config.ts`**: Standardized with `defineKyroConfig` and pre-populated collections matching your template choice.
3. **Database Configuration**:
   - `sqlite`: Zero-config local SQLite adapter at `./data/kyro.db`.
   - `postgres`: Production-ready PostgreSQL adapter via Drizzle ORM.
   - `mongodb`: MongoDB adapter configuration.
4. **Super Admin Setup**: Generates cryptographically secure initial super admin credentials saved to `.env.local`.
5. **Git Repository**: Initialized with `.gitignore` and an initial commit.

---

## 💻 Programmatic Usage

You can also use `@kyro-cms/create` programmatically in Node.js scripts or custom CLIs:

```typescript
import { promptUser, parseCliArgs } from '@kyro-cms/create';

// Interactive prompt
const answers = await promptUser();

// Or parse CLI arguments
const cliConfig = parseCliArgs();
```

---

## 📄 License

MIT © [Daniel Dozie](https://github.com/danielDozie)
