# Vercel CMS Deployment

This namespace provides automated deployment scripts and documentation for hosting **Kyro CMS (Blog Template)** on Vercel Serverless with PostgreSQL and S3/R2 media storage.

[![Vercel](https://img.shields.io/badge/Deploy_with-Vercel-18181B?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FdanielDozie%2Fkyro-cms)

---

## ⚡ One-Line Automated Deployment

Run this command in your Kyro CMS project directory:

```bash
bash scripts/deployments/vercel/deploy.sh "postgres://user:password@ep-xyz.region.aws.neon.tech/kyro_blog?sslmode=require"
```

Or execute directly from a hosted URL:

```bash
curl -fsSL https://kyro-cms.com/scripts/deploy-vercel.sh | bash -s -- "postgres://user:password@ep-xyz.region.aws.neon.tech/kyro_blog?sslmode=require"
```

---

## ⚙️ Customizing Deployment Parameters

You can customize deployment settings using environment variables:

```bash
DATABASE_URL="postgres://user:password@host:5432/dbname?sslmode=require" \
PROJECT_NAME="my-blog-cms" \
ADMIN_EMAIL="admin@mydomain.com" \
ADMIN_PASSWORD="MySecurePassword123!" \
bash scripts/deployments/vercel/deploy.sh
```

---

## 📁 What gets provisioned?

1. **Vercel Serverless**: Configures `vercel.json` and deploys project serverless routes.
2. **PostgreSQL Database**: Connects to your PostgreSQL database (Neon / Supabase / Vercel Postgres / AWS RDS) via Drizzle ORM.
3. **Blog Collections**: Configures `kyro.config.ts` with `templateCollections["blog"]` (`posts`, `pages`, `categories`, `media`, `menu`, `users`, `audit_logs`, `forms`).
4. **Super Admin User**: Automatically seeds the initial `super_admin` user in PostgreSQL.
5. **Vercel Production**: Builds and deploys the admin panel to `https://<PROJECT_NAME>.vercel.app`.

---

## 🔑 Output Example

```text
==============================================================================
🎉 Kyro Blog CMS Successfully Deployed to Vercel!
==============================================================================
• Deployment URL : https://kyro-blog-cms.vercel.app
• Admin Dashboard: https://kyro-blog-cms.vercel.app/admin
• Template       : Blog

🔑 Initial Super Admin Credentials:
  Email   : admin@kyro.dev
  Password: KyroAdmin2026!
==============================================================================
```
