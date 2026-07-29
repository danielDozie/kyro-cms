# Cloudflare Zero-Touch Kyro CMS Deployment

Fast, simple, and automated zero-touch deployment script for hosting **Kyro CMS** on **Cloudflare Workers with Assets** (+ **Cloudflare D1** or **Hyperdrive PostgreSQL** + **Cloudflare R2 Storage**).

---

## ⚡ Quick Start (1-Command Deployment)

Run the script in your Kyro CMS project directory:

```bash
bash scripts/deployments/cloudflare/deploy.sh
```

The script will automatically provision your database (Cloudflare D1), create media storage (Cloudflare R2), seed the Super Admin account, and deploy your live CMS onto Cloudflare Workers with Assets.

---

## ⚙️ CLI Options & Non-Interactive Mode

You can pass CLI arguments directly or run in non-interactive mode (`-y`) for automated CI/CD pipelines:

```bash
# Deploy to Cloudflare Workers with native D1 (Zero-Config Serverless SQLite)
bash scripts/deployments/cloudflare/deploy.sh -d d1 -n my-cms-app -y

# Deploy to Cloudflare Workers with external PostgreSQL via Hyperdrive
bash scripts/deployments/cloudflare/deploy.sh -d postgres \
  -u "postgresql://user:password@host:5432/dbname?sslmode=require" \
  -n my-postgres-cms -e "admin@mydomain.com" -p "MySecurePassword123!" -y
```

### Options Reference:

| Flag | Long Option | Description | Default |
| --- | --- | --- | --- |
| `-d` | `--database` | Database type (`d1` or `postgres`) | `d1` |
| `-u` | `--database-url` | PostgreSQL connection string | — |
| `-n` | `--name` | Cloudflare Workers project name | `kyro-app-<random>` |
| `-r2` | `--r2-bucket` | R2 storage bucket name | `kyro-media-<random>` |
| `-e` | `--email` | Initial Super Admin email | `admin@kyro-cms.com` |
| `-p` | `--password` | Initial Super Admin password | Auto-generated |
| `-y` | `--non-interactive` | Skip interactive prompts and accept defaults | `false` |

---

## 📁 What Gets Provisioned Automatically?

1. **Cloudflare Workers with Assets**: Deploys serverless SSR backend and static Admin UI on a single unified domain (`https://<project-name>.workers.dev`).
2. **Database Engine**:
   - **Cloudflare D1**: Auto-provisions serverless D1 SQLite database (`<name>-d1`) and applies schema table migrations remotely.
   - **Cloudflare Hyperdrive**: Provisions edge database connection pool for external PostgreSQL databases.
3. **Cloudflare R2 Bucket**: Provisions S3-compatible media storage (`<name>-media`).
4. **Super Admin Account**: Automatically seeds initial Super Admin credentials into D1 / PostgreSQL.
5. **Wrangler Bindings**: Automatically generates `wrangler.toml` and injects bindings into the production build before deployment.

---

## 🔑 Deployment Output Example

```text
===========================================================================================
🎉 Kyro CMS Cloudflare Deployment Complete!
===========================================================================================
• Hosting Target : Cloudflare Workers with Assets
• Admin Dashboard: https://kyro-app-a1b2c3.workers.dev/admin
• Database Mode  : Cloudflare D1 (5a8e72b1-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
• R2 Storage     : kyro-media-a1b2c3

🔑 Super Admin Credentials:
  Email   : admin@kyro-cms.com
  Password: KyroPassA1B2C3D4
===========================================================================================
```
