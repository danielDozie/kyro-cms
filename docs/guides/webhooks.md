---
title: Webhooks
description: Trigger external services and build event-driven architectures with Kyro CMS webhooks.
---

# Webhooks

Webhooks allow you to build event-driven architectures by sending HTTP requests to external services whenever a specific event occurs within Kyro CMS.

For example, you can use webhooks to:
- Trigger a GitHub Actions deployment when a post is published
- Send a notification to Slack when a new user registers
- POST to any custom endpoint with document data

## Quick Start

### Via Admin UI

1. Go to **Webhooks** in the sidebar
2. Click **New webhook**
3. Select an action type (GitHub Push or Custom URL)
4. Fill in the platform-specific fields
5. Choose which events to subscribe to
6. Click **Create webhook**

### Via SDK

```typescript
import { createWebhookService } from "@kyro-cms/core";
import { createDrizzleAdapter } from "@kyro-cms/core/drizzle";

const db = createDrizzleAdapter({ client: drizzleClient });
const webhooks = createWebhookService(db);

// Generic webhook (POST to any URL)
await webhooks.createWebhook({
  name: "Slack Notifications",
  url: "https://hooks.slack.com/services/T00/B00/xxx",
  events: ["collection.create", "collection.update"],
  collections: ["posts"],
});

// GitHub Push
await webhooks.createWebhook({
  name: "Deploy on publish",
  url: "", // ignored for github-push
  events: ["collection.update"],
  action: "github-push",
  config: {
    githubOwner: "my-org",
    githubRepo: "my-site",
    githubBranch: "main",
  },
});
```

## Action Types

Each webhook has an `action` that determines how the payload is delivered:

| Action | Description | Auth |
|--------|-------------|------|
| `generic` | POST Kyro's standard payload to any URL | Optional HMAC secret |
| `github-push` | Push an empty commit to simulate a push event | `GITHUB_TOKEN` env var |

### Generic (`generic`)

Sends Kyro's full webhook payload to the configured URL. Supports HMAC-SHA256 signing.

```json
{
  "id": "wh_1719584000000_abc123",
  "event": "collection.update",
  "timestamp": "2026-06-28T12:00:00Z",
  "collection": "posts",
  "operation": "update",
  "data": { "title": "Hello World", "slug": "hello-world" },
  "previousData": { "title": "Hello", "slug": "hello" },
  "user": { "id": "user_123", "email": "admin@example.com", "role": "admin" }
}
```

### GitHub Push (`github-push`)

Pushes an empty commit to simulate a push event, triggering GitHub Actions workflows that run `on: push`.

**Required env vars:**
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

**Config fields:**
```typescript
config: {
  githubOwner: "my-org",        // required
  githubRepo: "my-site",        // required
  githubBranch: "main",         // optional, defaults to "main"
}
```

**GitHub Actions workflow example:**
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npm run deploy
```

## Supported Events

| Event | Description |
|-------|-------------|
| `collection.create` | A document was created |
| `collection.update` | A document was updated |
| `collection.delete` | A document was deleted |
| `media.upload` | A file was uploaded |
| `media.delete` | A file was deleted |
| `auth.login` | A user logged in |
| `auth.register` | A user registered |
| `auth.logout` | A user logged out |

## Filtering by Collection

Restrict a webhook to fire only for specific collections:

```typescript
await webhooks.createWebhook({
  name: "Posts only",
  url: "https://example.com/webhook",
  events: ["collection.create", "collection.update"],
  collections: ["posts"], // only fires for posts
});
```

An empty `collections` array means the webhook fires for all collections.

## Security

### HMAC Signing

When you set a `secret`, each request includes an `X-Webhook-Signature` header with an HMAC-SHA256 hex digest:

```typescript
import { createHmac } from "crypto";

function verifySignature(payload: string, secret: string, signature: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  return signature === expected;
}
```

### Webhook Headers

Custom headers can be set on each webhook:

```typescript
await webhooks.createWebhook({
  name: "Custom headers",
  url: "https://example.com/webhook",
  events: ["collection.create"],
  headers: {
    "X-Custom-Header": "value",
    "Authorization": "Bearer token",
  },
});
```

## Retry Logic

Failed deliveries are retried up to 5 times with exponential backoff:
- Attempt 1: immediate
- Attempt 2: 1s delay
- Attempt 3: 2s delay
- Attempt 4: 4s delay
- Attempt 5: 8s delay

4xx errors are **not** retried (client errors). 5xx errors and network failures trigger retries.

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/webhooks` | List all webhooks |
| `POST` | `/api/webhooks` | Create a webhook |
| `GET` | `/api/webhooks/:id` | Get a webhook |
| `PATCH` | `/api/webhooks/:id` | Update a webhook |
| `DELETE` | `/api/webhooks/:id` | Delete a webhook |
| `POST` | `/api/webhooks/:id/test` | Send a test payload |
| `GET` | `/api/webhooks/:id/history` | Get delivery history |
| `GET` | `/api/webhooks/actions` | List available action types |

## Collection Hooks

For complex logic that needs to transform data before sending, use Kyro's built-in **Collection Hooks**:

```typescript
{
  slug: "posts",
  hooks: {
    afterCreate: async ({ doc, context }) => {
      await fetch("https://my-service.com/notify", {
        method: "POST",
        body: JSON.stringify({ message: `New post: ${doc.title}` }),
      });
    },
  },
  fields: [/* ... */],
}
```

Collection Hooks (`beforeChange`, `afterChange`, `beforeDelete`, `afterDelete`) are more powerful than webhooks because they can mutate document data mid-flight. For more information, see the [Hooks Guide](/guides/hooks).
