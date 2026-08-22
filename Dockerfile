# ==============================================================================
# Kyro CMS — Official Production Container Image
# Target: ghcr.io/kyro-cms/core:latest
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app
RUN apk add --no-cache libc6-compat curl bash
RUN npm install -g pnpm@latest

COPY . .
# Approve native module build scripts required by pnpm v10+
# (esbuild, sharp, ssh2, cpu-features, workerd require post-install compilation)
RUN node -e " \
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
  pkg.pnpm = pkg.pnpm || {}; \
  pkg.pnpm.onlyBuiltDependencies = ['cpu-features','esbuild','sharp','ssh2','workerd']; \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
"
RUN pnpm install --no-frozen-lockfile
# Build root core engine and admin workspace dashboard
RUN pnpm -r build || (pnpm build && pnpm --filter @kyro-cms/admin build) || true

FROM node:22-alpine AS runner

WORKDIR /app
RUN apk add --no-cache libc6-compat curl bash postgresql-client

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/admin ./admin
COPY --from=builder /app/packages ./packages
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "./dist/cli/index.js", "start"]
