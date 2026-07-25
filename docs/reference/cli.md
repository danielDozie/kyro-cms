---
title: CLI Reference
description: Complete reference for all Kyro CMS CLI commands available via npx kyro or the installed CLI.
---

# CLI Reference

The Kyro CMS CLI is available as `npx kyro` or as a globally/locally installed command after adding `@kyro-cms/core` to your project.

## `kyro dev`

Start the development server with hot reload.

```bash
kyro dev [--port <port>] [--host <host>]
npx kyro dev --port 3000 --host 0.0.0.0
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port` | `number` | `4321` | Development server port |
| `--host` | `string` | `localhost` | Development server host |

## `kyro build`

Build the project for production. Compiles the admin dashboard, generates static GraphQL schema, and bundles API routes.

```bash
kyro build
npx kyro build
```

No flags required.

## `kyro start`

Start the production server after a successful build.

```bash
kyro start [--port <port>]
npx kyro start --port 8080
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--port` | `number` | `4321` | Production server port |

## `kyro db push`

Push schema changes to the database — creates or alters tables based on your `kyro.config.ts` collections.

```bash
kyro db push
npx kyro db push
```

<Callout type="warning" title="Destructive">
  In production databases, `db push` may alter or drop columns. Review the generated SQL before running.
</Callout>

## `kyro db pull`

Pull the existing database schema into your configuration — useful for reverse-engineering an existing database into Kyro config format.

```bash
kyro db pull
npx kyro db pull
```

## `kyro auth bootstrap`

Create the initial admin user via an interactive prompt. Required on first deployment to a fresh database.

```bash
kyro auth bootstrap
npx kyro auth bootstrap
```

The command interactively prompts for:
- Email address
- Password
- Role (defaults to `super_admin`)

You can also pass values inline:

```bash
kyro auth bootstrap --email admin@example.com --password "SecurePass123!" --role super_admin
```

| Flag | Type | Description |
|------|------|-------------|
| `--email`, `-e` | `string` | Admin email address |
| `--password`, `-p` | `string` | Admin password |
| `--role`, `-r` | `string` | Admin role (default: `super_admin`) |

## `kyro auth create-api-key`

Create a new API key for programmatic access.

```bash
kyro auth create-api-key [--name <name>] [--role <role>]
npx kyro auth create-api-key --name "CI/CD Pipeline" --role editor
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--name` | `string` | — | Human-readable label for the key |
| `--role` | `string` | `admin` | Role assigned to the key |

Outputs the generated API key to stdout. Save it — it is shown only once.

## `kyro generate:types`

Generate TypeScript type definitions from your config. Produces types for your collections that can be used with the `kyro-connect` SDK.

```bash
kyro generate:types [--output <path>]
npx kyro generate:types --output ./src/lib/kyro-types.ts
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--output`, `-o` | `string` | `./src/kyro-types.ts` | Output path for generated types |

## `kyro-codegen`

Generate TypeScript types from a **running Kyro server** via HTTP. Ships as a binary with the `kyro-connect` package — available only if `kyro-connect` is installed.

```bash
npx kyro-codegen \
  --url https://my-cms.example.com \
  --api-key kc_abc123 \
  --output ./src/kyro.generated.d.ts
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--url` | Yes | — | Base URL of a running Kyro CMS server |
| `--api-key` | Yes | — | API key with access to the schema endpoint |
| `--output` | No | `kyro.generated.d.ts` | Output path |

Hits `{url}/kyro/schema`, generates a complete `KyroAppRouter` interface plus per-collection document types, input types, and discriminated unions for blocks and enums.

## `kyro graphql:print-schema`

Print the generated GraphQL SDL (Schema Definition Language) to stdout. Useful for feeding into codegen pipelines or Apollo Schema Registry.

```bash
kyro graphql:print-schema
npx kyro graphql:print-schema > schema.graphql
```

No flags required.
