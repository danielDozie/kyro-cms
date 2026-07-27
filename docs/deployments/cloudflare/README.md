# Cloudflare Blog CMS Deployment

This namespace provides automated deployment scripts and documentation for hosting **Kyro CMS (Blog Template)** on Cloudflare (Pages + Hyperdrive PostgreSQL + R2 Storage).

---

## ⚡ One-Line Automated Deployment

Run this command in your Kyro CMS project directory:

```bash
bash docs/deployments/cloudflare/deploy.sh "postgres://user:password@ep-xyz.region.aws.neon.tech/kyro_blog?sslmode=require"
```

Or execute directly from a hosted URL:

```bash
curl -fsSL https://kyro-cms.com/scripts/deploy-cloudflare.sh | bash -s -- "postgres://user:password@ep-xyz.region.aws.neon.tech/kyro_blog?sslmode=require"
```

---

## ⚙️ Customizing Deployment Parameters

You can customize deployment settings using environment variables:

```bash
DATABASE_URL="postgres://user:password@host:5432/dbname?sslmode=require" \
PROJECT_NAME="my-blog-cms" \
R2_BUCKET="my-blog-media" \
ADMIN_EMAIL="admin@mydomain.com" \
ADMIN_PASSWORD="MySecurePassword123!" \
bash docs/deployments/cloudflare/deploy.sh
```

---

## 📁 What gets provisioned?

1. **Cloudflare Hyperdrive**: Provisions a low-latency edge database accelerator (`kyro-blog-postgres-hd`).
2. **Cloudflare R2 Bucket**: Creates an S3-compatible media storage bucket (`kyro-blog-media`).
3. **Blog Collections**: Configures `kyro.config.ts` with `templateCollections["blog"]` (`posts`, `pages`, `categories`, `media`, `menu`, `users`, `audit_logs`, `forms`).
4. **Super Admin User**: Automatically seeds the initial `super_admin` user in PostgreSQL.
5. **Cloudflare Pages**: Builds and deploys the admin panel to `https://<PROJECT_NAME>.pages.dev`.

---

## 🔑 Output Example

```text
==============================================================================
🎉 Kyro Blog CMS Successfully Deployed to Cloudflare!
==============================================================================
• Site URL       : https://kyro-blog-cms.pages.dev
• Admin Dashboard: https://kyro-blog-cms.pages.dev/admin
• Hyperdrive ID  : 5a8e72b1-xxxx-xxxx-xxxx-xxxxxxxxxxxx
• R2 Bucket      : kyro-blog-media
• Template       : Blog

🔑 Initial Super Admin Credentials:
  Email   : admin@kyro.dev
  Password: KyroAdmin2026!
==============================================================================
```
