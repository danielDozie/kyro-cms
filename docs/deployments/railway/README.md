# Railway CMS Deployment

This namespace provides automated deployment scripts and documentation for hosting **Kyro CMS (Blog Template)** on Railway Web Services with PostgreSQL and S3/R2 media storage.

---

## ⚡ One-Line Automated Deployment

Run this command in your Kyro CMS project directory:

```bash
bash docs/deployments/railway/deploy.sh "postgres://user:password@ep-xyz.region.aws.neon.tech/kyro_blog?sslmode=require"
```

Or execute directly from a hosted URL:

```bash
curl -fsSL https://kyro-cms.com/scripts/deploy-railway.sh | bash -s -- "postgres://user:password@ep-xyz.region.aws.neon.tech/kyro_blog?sslmode=require"
```

---

## ⚙️ Customizing Deployment Parameters

```bash
DATABASE_URL="postgres://user:password@host:5432/dbname?sslmode=require" \
PROJECT_NAME="my-blog-cms" \
ADMIN_EMAIL="admin@mydomain.com" \
ADMIN_PASSWORD="MySecurePassword123!" \
bash docs/deployments/railway/deploy.sh
```

---

## 📁 What gets provisioned?

1. **Railway Config**: Generates `railway.json` Nixpacks build instructions.
2. **PostgreSQL Database**: Connects to your PostgreSQL database via Drizzle ORM.
3. **Blog Collections**: Configures `kyro.config.ts` with `templateCollections["blog"]`.
4. **Super Admin User**: Automatically seeds the initial `super_admin` user in PostgreSQL.
5. **Railway App**: Deploys application container to Railway.
