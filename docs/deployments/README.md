# Deployment Guide

This directory contains deployment configurations for various platforms.

## Quick Deploy

### Vercel (Recommended for Serverless)

```bash
vercel --prod
```

Required environment variables:
- `KYRO_DATABASE_URL` - PostgreSQL connection string
- `KYRO_SECRET` - JWT signing secret
- `KYRO_TENANT` - Tenant identifier

### Railway (Recommended for Simple Deployments)

```bash
railway login
railway init
railway up
```

Set environment variables in Railway dashboard:
- `KYRO_DATABASE_URL`
- `KYRO_SECRET`

### Docker

Development:
```bash
cd docker
docker-compose up -d
```

Production:
```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `KYRO_DATABASE_URL` | Database connection string | Yes |
| `KYRO_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `KYRO_TENANT` | Tenant identifier | No |
| `NODE_ENV` | Environment mode | No |

## Database Setup

### PostgreSQL (Recommended)

```sql
CREATE DATABASE kyro;
CREATE USER kyro_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE kyro TO kyro_user;
\c kyro
GRANT ALL ON SCHEMA public TO kyro_user;
```

Connection string format:
```
postgresql://kyro_user:your_password@localhost:5432/kyro
```

### PostgreSQL

```sql
CREATE DATABASE kyro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kyro_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON kyro.* TO 'kyro_user'@'%';
FLUSH PRIVILEGES;
```

### SQLite (Development Only)

```bash
KYRO_DATABASE_URL=sqlite:./data/kyro.db
```

## Health Check

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-02T00:00:00.000Z"
}
```
