# Netlify CMS Deployment

This namespace provides automated deployment scripts and documentation for hosting **Kyro CMS (Blog Template)** on Netlify Edge with PostgreSQL and S3/R2 media storage.

[![Netlify](https://img.shields.io/badge/Deploy_to-Netlify-18181B?style=for-the-badge&logo=netlify&logoColor=00C7B7)](https://app.netlify.com/start/deploy?repository=https://github.com/danielDozie/kyro-cms)

---

## ⚡ One-Line Automated Deployment

Run this command in your Kyro CMS project directory:

```bash
bash docs/deployments/netlify/deploy.sh "postgres://user:password@ep-xyz.region.aws.neon.tech/kyro_blog?sslmode=require"
```

Or execute directly from a hosted URL:

```bash
curl -fsSL https://kyro-cms.com/scripts/deploy-netlify.sh | bash -s -- "postgres://user:password@ep-xyz.region.aws.neon.tech/kyro_blog?sslmode=require"
```

---

## ⚙️ Customizing Deployment Parameters

```bash
DATABASE_URL="postgres://user:password@host:5432/dbname?sslmode=require" \
PROJECT_NAME="my-blog-cms" \
ADMIN_EMAIL="admin@mydomain.com" \
ADMIN_PASSWORD="MySecurePassword123!" \
bash docs/deployments/netlify/deploy.sh
```

---

## 📁 What gets provisioned?

1. **Netlify Config**: Generates `netlify.toml` and configures production redirects.
2. **PostgreSQL Database**: Connects to your PostgreSQL database (Neon / Supabase / AWS RDS) via Drizzle ORM.
3. **Blog Collections**: Configures `kyro.config.ts` with `templateCollections["blog"]`.
4. **Super Admin User**: Automatically seeds the initial `super_admin` user in PostgreSQL.
5. **Netlify Edge**: Deploys the admin panel to `https://<PROJECT_NAME>.netlify.app`.
