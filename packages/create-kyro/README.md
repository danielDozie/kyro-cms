# create-kyro

Interactive scaffolding for Kyro CMS projects.

## Usage

```bash
pnpm create @kyro-cms@latest
```

Or directly:

```bash
npx @kyro-cms/create
```

### Non-Interactive Setup (CI/CD & Headless Environments)

`create-kyro` includes automatic Non-TTY terminal detection (`!process.stdout.isTTY`) and manual option scanning. Pass parameters directly to bypass stdin prompts in background jobs or automated deployment scripts:

```bash
npx @kyro-cms/create my-app --db sqlite --template blog --yes
```

## What it does

1. **Interactive Setup** - Prompts for:
   - Project name
   - Database (SQLite, PostgreSQL, MongoDB)
   - Starting template (Minimal, Blog, E-commerce, Kitchen Sink)

2. **Project Generation** - Creates:
   - `package.json` with dependencies (`@kyro-cms/core`, `@kyro-cms/admin`, `astro`)
   - `kyro.config.ts` with your selections (collections, globals, database adapter, auth)
   - `astro.config.mjs` with `kyro()` integration configured
   - `tsconfig.json`
   - `.env.example` with configuration hints
   - Welcome page and project structure

3. **Installation** - Runs `npm install`

4. **Git Init** - Initializes git repository with first commit

## What you get

- **Kyro Core** - Full CMS backend (REST, GraphQL, auth, sessions, keys, audit, webhooks)
- **Kyro Admin** - Modern admin dashboard via Astro integration
- **Zero boilerplate** - No manual auth routes, no middleware, no admin page setup
- **Built-in auth** - JWT-based authentication with session management, API keys, RBAC
- **First-user super admin** - The first registered user automatically gets super admin privileges

## Programmatic Usage

```typescript
import { promptUser } from '@kyro-cms/create';

const answers = await promptUser();
// { projectName, database, template }
```

## License

MIT
