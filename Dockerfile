# ==============================================================================
# Kyro CMS — Official Production Container Image
# Target: ghcr.io/kyro-cms/core:latest
# ==============================================================================

FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9

COPY . .
RUN pnpm install --no-frozen-lockfile
# Build root core engine and admin workspace dashboard
RUN pnpm -r build || (pnpm build && pnpm --filter @kyro-cms/admin build) || true

FROM node:22-bookworm-slim AS runner

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/admin ./admin
COPY --from=builder /app/packages ./packages
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4321

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4321/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "./dist/cli/index.js", "start"]