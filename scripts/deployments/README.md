# Deployment Guide

This directory contains deployment configurations and setup guides for various hosting platforms.

## Automated CLI Deployment Script

To deploy Kyro CMS with database provisioning (Cloudflare D1 / Hyperdrive PostgreSQL) and R2 storage:

```bash
bash scripts/deployments/cloudflare/deploy.sh
```

---

## Quick Deploy Options

### 1. Vercel (Serverless & Edge Ready)

```bash
vercel --prod
```

Required environment variables:
- `KYRO_DATABASE_URL` - Connection string (PostgreSQL / Neon / MongoDB / SQLite)
- `KYRO_SECRET` - JWT session signing secret (min 32 chars)

> [!NOTE]
> **Vercel Node.js Serverless vs Edge Runtimes**
> 
> * **Node.js Serverless (Default)**: Fully compatible out-of-the-box with all Kyro database adapters (SQLite, PostgreSQL, MongoDB) and native image tools (`sharp`).
> * **Vercel Edge & Cloudflare Workers**: Uses Edge-native HTTP drivers like `createNeonAdapter()` or Turso (`@libsql/client`). Image processing falls back automatically to Web-standard passthroughs.

---

### 2. Cloudflare Workers / Pages

```bash
pnpm dlx wrangler pages deploy
```

Set environment variables in Cloudflare Pages dashboard:
- `KYRO_DATABASE_URL`
- `KYRO_SECRET`

---

### 3. Railway (Recommended for PostgreSQL)

```bash
railway login
railway init
railway up
```

Set environment variables in Railway dashboard:
- `KYRO_DATABASE_URL`
- `KYRO_SECRET`

---

### 4. Docker (Self-Hosted VPS / AWS)

Development:
```bash
cd docker
docker-compose up -d
```

Production:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Environment Variables Reference

| Variable | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `KYRO_DATABASE_URL` | Database connection string | Yes | — |
| `KYRO_SECRET` | JWT signing secret (min 32 chars) | Yes | — |
| `KYRO_ADMIN_EMAIL` | Bootstrap admin email | No | `admin@kyro-cms.com` |
| `KYRO_ADMIN_PASSWORD` | Bootstrap admin password | No | — |
| `EMAIL_VERIFICATION_REQUIRED` | Set to `false` to disable email OTP / verification checks | No | `true` |
| `NODE_ENV` | Environment mode (`production` / `development`) | No | `development` |

---

## Health Check

Verify your deployed instance:

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-07-22T03:00:00.000Z"
}
```
