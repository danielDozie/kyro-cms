# @kyro-cms/mcp

> Official Model Context Protocol (MCP) server for Kyro CMS — introspect schemas, query and mutate live data, scaffold Astro components, and orchestrate AI agents.

[![npm version](https://img.shields.io/npm/v/@kyro-cms/mcp.svg)](https://www.npmjs.com/package/@kyro-cms/mcp)
[![Status: Experimental](https://img.shields.io/badge/Status-Experimental-orange.svg)](https://kyro-cms.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [!WARNING]
> **Status: Experimental / Beta** — `@kyro-cms/mcp` is under active development. Tools, resource URIs (`kyro://...`), and prompt schemas may evolve as the Model Context Protocol specification matures.

---

## 🌟 Overview

`@kyro-cms/mcp` bridges **Kyro CMS** with AI coding environments like **Cursor**, **Claude Desktop**, **Antigravity**, **Windsurf**, and **Claude Code** via the standard [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

With this MCP server running in your IDE, your AI assistant can:
- 🔍 **Introspect Schemas**: View collections, field types, validation rules, and relationship graphs.
- ⚡ **Query & Mutate Data**: Read and write content directly into your configured database adapter (SQLite, PostgreSQL, MongoDB).
- 🧩 **Scaffold Astro Components**: Generate zero-JS Astro components and Content Layer loaders tailored to your exact CMS schema.
- 🛡️ **Validate & Lint Configurations**: Catch missing relations, circular dependencies, and duplicate slugs.
- 📚 **Read MCP Resources**: Expose real-time collection schemas directly into AI context windows.

---

## 📦 Installation

You can run the server directly via `npx` (recommended) or install it locally:

```bash
# Direct execution with npx
npx -y @kyro-cms/mcp@latest

# Or install in your Kyro CMS workspace
pnpm add @kyro-cms/mcp
```

---

## ⚙️ Setup & Configuration

### 1. Claude Desktop

Add `@kyro-cms/mcp` to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kyro": {
      "command": "npx",
      "args": ["-y", "@kyro-cms/mcp@latest", "--config", "./kyro.config.ts"]
    }
  }
}
```

### 2. Cursor

Create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "kyro": {
      "command": "npx",
      "args": ["-y", "@kyro-cms/mcp@latest"]
    }
  }
}
```

### 3. Antigravity & Windsurf

Add to your workspace or global MCP settings (`mcp_config.json`):

```json
{
  "mcpServers": {
    "kyro": {
      "command": "npx",
      "args": ["-y", "@kyro-cms/mcp@latest"]
    }
  }
}
```

---

## 🛠️ MCP Tools Reference

The server exposes 7 powerful tools for AI workflows:

### 1. `kyro_get_schema`
Returns full schema definitions, field rules, folder structures, and relational metadata.
- **Parameters**:
  - `collection` *(optional)*: Specific collection slug.
  - `global` *(optional)*: Specific global singleton slug.
  - `includeRelations` *(optional, default: `true`)*: Whether to include relation targets.

### 2. `kyro_list_collections`
Provides a fast overview of all collections and globals with virtual folder groupings and field names.

### 3. `kyro_query`
Queries records from any collection using your active database adapter.
- **Parameters**:
  - `collection` *(required)*: Target collection slug.
  - `where` *(optional)*: Filter condition object (e.g., `{"status": "published"}`).
  - `page` *(optional, default: `1`)*: Page number.
  - `limit` *(optional, default: `10`)*: Records per page.
  - `sort` *(optional)*: Sort field (e.g., `"-createdAt"`).
  - `populate` *(optional, default: `false`)*: Whether to resolve relational document references.

### 4. `kyro_mutate`
Performs `create`, `update`, or `delete` document operations.
- **Parameters**:
  - `collection` *(required)*: Collection slug.
  - `action` *(required)*: `"create"` | `"update"` | `"delete"`.
  - `id` *(required for update/delete)*: Target document ID.
  - `data` *(optional)*: Payload for creation or update.

### 5. `kyro_scaffold_astro_component`
Generates clean, production-ready Astro component code based on the collection schema.
- **Parameters**:
  - `collection` *(required)*: Target collection slug.
  - `componentType` *(optional, default: `"list"`)*: `"list"` | `"detail"` | `"card"`.
  - `clientMethod` *(optional, default: `"content-layer"`)*: `"content-layer"` (Astro 5+) or `"connect-sdk"` (`@kyro-cms/connect`).

### 6. `kyro_scaffold_schema`
Synthesizes a TypeScript `CollectionConfig` adhering to Kyro CMS conventions.
- **Parameters**:
  - `slug` *(required)*: Collection slug (e.g. `"products"`).
  - `label` *(required)*: Collection label (e.g. `"Products"`).
  - `folder` *(optional, default: `"General"`)*: Virtual sidebar folder.
  - `fields` *(required)*: Array of field definitions (`name`, `type`, `required`, `relationTo`).
  - `drafts` *(optional, default: `true`)*: Enable draft versioning.

### 7. `kyro_validate_config`
Statically audits `kyro.config.ts` for configuration issues.
- **Checks**: Missing database adapters, duplicate slugs, broken relationship targets, and empty field arrays.

---

## 📖 MCP Resources

`@kyro-cms/mcp` provides read-only URI resources for AI context injection:

- **`kyro://collections`**: JSON summary of all collections and globals.
- **`kyro://collections/{slug}`**: Dynamic JSON schema for a specific collection.

---

## 💬 MCP Prompts

- **`scaffold_collection`**: Pre-engineered prompt template that guides AI in architecting new collections with correct TypeScript types, folder groupings, and relational fields.

---

## 💻 Programmatic Usage (Node.js & TS SDK)

You can also embed the MCP server directly into custom applications or scripts:

```typescript
import { createMcpServer } from '@kyro-cms/mcp';
import config from './kyro.config';

// Initialize MCP Server
const server = createMcpServer({
  config,
  serverInfo: {
    name: 'my-custom-mcp-server',
    version: '1.0.0',
  },
});

// Register custom tools
server.tools.register({
  name: 'custom_sync_tool',
  description: 'Custom synchronization routine',
  inputSchema: { type: 'object', properties: {} },
  handler: async (args, context) => {
    return {
      content: [{ type: 'text', text: 'Custom tool completed successfully.' }],
    };
  },
});

// Start standard I/O listener
server.startStdio();
```

---

## 🚩 CLI Flags

```bash
kyro-mcp [options]

Options:
  --config <path>   Explicit path to kyro.config.ts / kyro.config.js / kyro.config.mjs
```

---

## 📄 License

MIT © [Daniel Dozie](https://github.com/danielDozie)
