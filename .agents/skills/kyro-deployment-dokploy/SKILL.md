---
name: kyro-deployment-dokploy
description: Deployment guidelines for containerizing and deploying Kyro CMS apps to Dokploy, Docker, or VPS environments with persistent SQLite storage and native binary handling.
---

# Deploying Kyro CMS to Dokploy & Docker

Use this skill when preparing Dockerfiles, Dokploy configurations, volume mounts, or production build settings for Kyro CMS.

## 1. Persistent Storage Volume Mounts

Always mount persistent volumes for SQLite databases and uploaded media:
- `./data` $\rightarrow$ Mount host path `/etc/dokploy/volumes/kyro-data:/app/data` (stores `kyro.db`).
- `./public/uploads` $\rightarrow$ Mount host path `/etc/dokploy/volumes/kyro-uploads:/app/public/uploads`.

Failure to mount `./data` will result in database reset on every container redeployment!

## 2. Standard Production Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install build dependencies for native C++ modules (better-sqlite3, sharp)
RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4321

# Install runtime SQLite libraries
RUN apk add --no-cache sqlite-libs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
```

## 3. Environment Variables Checklist

- `DATABASE_URL` (if using Drizzle PostgreSQL/MongoDB) or `KYRO_DB_PATH=./data/kyro.db`
- `KYRO_LOG_LEVEL=info` (options: `debug`, `info`, `warn`, `error`)
- `PORT=4321`
- `HOST=0.0.0.0`
