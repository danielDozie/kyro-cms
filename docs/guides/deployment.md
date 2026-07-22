---
title: Deployment
description: Learn how to deploy your Kyro CMS instance to production using Docker, Vercel, or Railway.
---

# Deployment

Because Kyro CMS is Astro-native, deploying it is virtually identical to deploying any standard Astro SSR application. The primary difference is ensuring your database and authentication secrets are properly configured in the production environment.

## Environment Variables

Before deploying, ensure your target environment has the following variables configured:

```bash
# REQUIRED: A random 32+ character string used to sign JWT session tokens
APP_SECRET=your-secure-random-string-here

# REQUIRED (If using PostgreSQL): Your connection string
DATABASE_URL=postgresql://user:password@host:5432/kyro_cms

# OPTIONAL: If using Redis for authentication sessions
REDIS_URL=redis://host:6379

# OPTIONAL: Used to bootstrap your first admin user on a fresh database
KYRO_ADMIN_EMAIL=admin@yourdomain.com
KYRO_ADMIN_PASSWORD=SecurePassword123!
```

## Option 1: Vercel (Serverless)

Vercel is an excellent hosting provider for Astro and Kyro CMS. 

1. Push your code to GitHub.
2. Import the repository into Vercel.
3. Ensure the framework preset is set to **Astro**.
4. Add your `DATABASE_URL` and `APP_SECRET` in the Vercel Environment Variables settings.
5. Click Deploy.

### Edge vs Node

By default, Astro deployed to Vercel uses Node.js serverless functions. If you wish to use Vercel Edge functions, you must ensure you are not using any Node.js native dependencies in your `kyro.config.ts`. (For example, you cannot use the `createLocalAdapter` SQLite database on Vercel Edge).

## Option 2: Railway

Railway makes it incredibly easy to spin up both a PostgreSQL database and your Astro frontend simultaneously.

1. Install the Railway CLI: `npm i -g @railway/cli`
2. Run `railway login`
3. Run `railway init`
4. Provision a database: `railway add` -> Select PostgreSQL.
5. Deploy your code: `railway up`

Railway will automatically inject the `DATABASE_URL` into your Astro project's environment.

## Option 3: Docker (VPS / AWS / DigitalOcean)

If you prefer to host on your own infrastructure, Docker is the most reliable method. You can deploy your Kyro CMS project by creating a `docker-compose.yml` file in your repository:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: 
      context: ../../
      dockerfile: Dockerfile
    ports:
      - "4321:4321"
    environment:
      - DATABASE_URL=postgresql://kyro:kyro@db:5432/kyro
      - APP_SECRET=change_me_in_production
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=kyro
      - POSTGRES_PASSWORD=kyro
      - POSTGRES_DB=kyro
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

To deploy:

1. Copy your repository (including `docker-compose.yml`) to your server.
2. Run `docker-compose up -d`.

## Database Migrations

When deploying to a remote database (like PostgreSQL), you must ensure your database schema matches your `kyro.config.ts`.

During your build step (or via a CI/CD pipeline), you should run the Kyro migration command:

```bash
# Generates and applies migrations to the remote database
npx kyro db push
```

You can add this to your `package.json` build script:

```json
{
  "scripts": {
    "build": "kyro db push && astro build"
  }
}
```
