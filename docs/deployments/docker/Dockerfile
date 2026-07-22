FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 kyro

COPY --from=builder --chown=kyro:nodejs /app/dist ./dist
COPY --from=builder --chown=kyro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=kyro:nodejs /app/package.json ./

USER kyro
EXPOSE 4321

ENV PORT=4321
ENV HOST=0.0.0.0

CMD ["node", "dist/admin/entry.mjs"]
