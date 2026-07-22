# create-kyro CLI Scaffolder

`create-kyro` is an interactive scaffolding command-line utility designed to set up a clean, running Kyro CMS workspace in seconds.

---

## 1. Quick Scaffolding

To start the interactive prompt, execute:

```bash
pnpm create kyro@latest my-cms-project
```

### Supported Package Managers
The CLI detects your running terminal manager automatically and scaffolds lockfiles accordingly:
*   `pnpm` (Recommended)
*   `npm`
*   `yarn`
*   `bun`

---

## 2. Interactive Prompts & Setup Flow

When launched, `create-kyro` guides you through a series of structural configurations:

1.  **Project Location**: Specify the directory to initialize (defaults to the current path `./`).
2.  **Starter Template Selection**:
    *   `Blog`: Configures collections for pages, articles, authors, and tag metadata.
    *   `E-commerce`: Sets up products, variants, orders, inventories, and customer accounts.
    *   `Minimal`: Scaffolds a single, simple collection with a title and content field for custom builds.
    *   `Kitchen Sink`: Registers every available collection and template for discovery.
3.  **Database Selection**:
    *   `SQLite (Local)`: Automatically sets up Node's native `DatabaseSync` for immediate offline dev.
    *   `PostgreSQL`: Scaffolds a Drizzle Postgres schema structure.
    *   `MongoDB`: Pre-sets environment variables and configurations for NoSQL.
4.  **Auto-Install Dependencies**: Opt-in to install all `package.json` dependencies automatically.

---

## 3. CLI Command Options

You can bypass interactive prompts by passing direct flags:

```bash
npx create-kyro@latest my-project --template blog --db sqlite --install
```

### Available Command Parameters

| Flag Option | Allowed Inputs | Role |
| :--- | :--- | :--- |
| `-t, --template` | `blog`, `ecommerce`, `minimal`, `kitchen-sink` | Selection for starting collection structures |
| `-d, --db` | `sqlite`, `postgres`, `mongodb` | Selection of database adapter configuration |
| `-i, --install` | None | Installs npm dependencies automatically |
| `-y, --yes` | None | Bypasses all prompt checks and uses default settings |
| `--help` | None | Lists command parameters |
