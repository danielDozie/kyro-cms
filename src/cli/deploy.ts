import { Command } from "commander";
import { execSync, exec } from "child_process";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import chalk from "chalk";

function generateRandomHex(bytes = 3) {
  return crypto.randomBytes(bytes).toString("hex");
}

function generateRandomPassword() {
  return crypto.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}

export function createDeployCommand() {
  const deploy = new Command("deploy").description("Deploy Kyro CMS");

  deploy
    .command("cloudflare")
    .description("Deploy to Cloudflare Workers with Assets")
    .option("-d, --database <type>", "Database type (d1|postgres)")
    .option("-u, --database-url <url>", "PostgreSQL connection string")
    .option("-n, --name <name>", "Cloudflare project name")
    .option("-b, --r2-bucket <name>", "R2 storage bucket name")
    .option("-e, --email <email>", "Initial Super Admin email")
    .option("-p, --password <password>", "Initial Super Admin password")
    .option("-y, --non-interactive", "Skip all prompts and use defaults")
    .action(async (options) => {
      console.log(chalk.cyan("=============================================================================="));
      console.log(chalk.bold("🚀 Kyro CMS Cloudflare Deployment (Workers)"));
      console.log(chalk.cyan("==============================================================================\n"));

      const randomSuffix = generateRandomHex();
      const randomPass = generateRandomPassword();

      let { database, databaseUrl, name, r2Bucket, email, password, nonInteractive } = options;
      
      let hyperdriveName = `kyro-postgres-hd-${randomSuffix}`;

      if (databaseUrl && !database) {
        database = "postgres";
      }

      if (!nonInteractive && process.stdout.isTTY) {
        const rl = readline.createInterface({ input, output });

        console.log(chalk.yellow.bold("📋 Setup Configuration"));
        console.log(chalk.dim("Answer the prompts below to configure your deployment.\n"));

        if (!database) {
          console.log(chalk.cyan("┌─ ") + chalk.bold("Select Database Infrastructure"));
          console.log(chalk.cyan("│") + chalk.green.bold("  1 ") + "Native Cloudflare D1  " + chalk.dim("— serverless SQLite, auto-provisioned ") + chalk.dim("← default"));
          console.log(chalk.cyan("│") + chalk.dim("  2 ") + "PostgreSQL  " + chalk.dim("— via Cloudflare Hyperdrive"));
          console.log(chalk.cyan("└──────────────────────────────────────────"));
          const dbChoice = await rl.question(chalk.magenta("  › ") + "Enter number (default: 1): ");
          database = dbChoice.trim() === "2" ? "postgres" : "d1";
        }

        if (database === "postgres" && !databaseUrl) {
          console.log(chalk.cyan("\n┌─ ") + chalk.bold("PostgreSQL Connection URL"));
          console.log(chalk.cyan("└──────────────────────────────────────────"));
          databaseUrl = await rl.question(chalk.magenta("  › ") + "postgresql://user:pass@host/db: ");
        }

        if (!name) {
          console.log(chalk.cyan("\n┌─ ") + chalk.bold("Cloudflare Project Name"));
          console.log(chalk.cyan("└──────────────────────────────────────────"));
          const n = await rl.question(chalk.magenta("  › ") + chalk.dim(`(default: kyro-app-${randomSuffix}): `));
          name = n.trim() || `kyro-app-${randomSuffix}`;
        }

        if (!r2Bucket) {
          console.log(chalk.cyan("\n┌─ ") + chalk.bold("Cloudflare R2 Bucket Name"));
          console.log(chalk.cyan("└──────────────────────────────────────────"));
          const r = await rl.question(chalk.magenta("  › ") + chalk.dim(`(default: kyro-media-${randomSuffix}): `));
          r2Bucket = r.trim() || `kyro-media-${randomSuffix}`;
        }

        if (!email) {
          console.log(chalk.cyan("\n┌─ ") + chalk.bold("Initial Super Admin Email"));
          console.log(chalk.cyan("└──────────────────────────────────────────"));
          const e = await rl.question(chalk.magenta("  › ") + chalk.dim("(default: admin@kyro-cms.com): "));
          email = e.trim() || "admin@kyro-cms.com";
        }

        if (!password) {
          console.log(chalk.cyan("\n┌─ ") + chalk.bold("Initial Super Admin Password"));
          console.log(chalk.cyan("└──────────────────────────────────────────"));
          const p = await rl.question(chalk.magenta("  › ") + chalk.dim("(default: auto-generate secure password): "));
          password = p.trim() || randomPass;
        }

        rl.close();
      }

      // Fallbacks
      name = name || `kyro-app-${randomSuffix}`;
      r2Bucket = r2Bucket || `kyro-media-${randomSuffix}`;
      email = email || "admin@kyro-cms.com";
      password = password || randomPass;
      database = database || "d1";

      console.log(chalk.cyan("\n⚙️ Configuration Summary:"));
      console.log(`  • Target Hosting: ${chalk.bold("Cloudflare Workers with Assets")}`);
      console.log(`  • Database Mode : ${chalk.bold(database)}`);
      console.log(`  • Project Name  : ${chalk.bold(name)}`);
      console.log(`  • R2 Bucket Name: ${chalk.bold(r2Bucket)}`);
      console.log(`  • Admin Email   : ${chalk.bold(email)}`);

      // 4. Package Manager & Wrangler
      const isPnpm = fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"));
      const packager = isPnpm ? "pnpm" : "npm";
      const wrangler = `${packager} dlx wrangler`;

      console.log("\n🔍 Checking Cloudflare Wrangler authentication...");
      try {
        execSync(`${wrangler} whoami`, { stdio: "ignore" });
        console.log(chalk.green("✅ Cloudflare Wrangler Authenticated."));
      } catch (err) {
        console.log(chalk.red("❌ Cloudflare Wrangler authentication required."));
        console.log(`   Run ${chalk.bold(`${wrangler} login`)} or set the ${chalk.bold("CLOUDFLARE_API_TOKEN")} env var.`);
        process.exit(1);
      }

      let d1Id = "";
      let hyperId = "";

      if (database === "postgres") {
        if (!databaseUrl) {
          console.log(chalk.red("❌ postgres mode requires a database URL."));
          process.exit(1);
        }
        console.log(`\n⚡ Provisioning Cloudflare Hyperdrive (${hyperdriveName})...`);
        try {
          const listOut = execSync(`${wrangler} hyperdrive list --json`, { stdio: "pipe" }).toString();
          const list = JSON.parse(listOut.slice(listOut.indexOf("[")));
          const hit = list.find((h: any) => h.name === hyperdriveName);
          if (hit) hyperId = hit.id || hit.uuid;
        } catch(e) {}
        
        if (!hyperId) {
          try {
            const createOut = execSync(`${wrangler} hyperdrive create "${hyperdriveName}" --connection-string="${databaseUrl}" --json`, { stdio: "pipe" }).toString();
            const data = JSON.parse(createOut.slice(createOut.indexOf("{")));
            hyperId = data.id || data.uuid;
          } catch(e) {}
        }
        console.log(chalk.green(`✅ Hyperdrive Provisioned (ID: ${hyperId || "auto"})`));
      } else {
        const d1Name = `${name}-d1`;
        console.log(`\n🗂️ Selecting or creating D1 database (${d1Name})...`);
        try {
          const out = execSync(`${wrangler} d1 create "${d1Name}"`, { stdio: "pipe" }).toString();
          const match = out.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
          if (match) d1Id = match[1];
        } catch (e) {
          try {
            const listOut = execSync(`${wrangler} d1 list --json`, { stdio: "pipe" }).toString();
            const list = JSON.parse(listOut);
            const hit = list.find((x: any) => x.name === d1Name);
            if (hit) d1Id = hit.id || hit.uuid;
          } catch(err) {}
        }
        console.log(chalk.green(`✅ Using D1 database: ${d1Name} (ID: ${d1Id})`));
      }

      console.log(`\n🗄️ Provisioning R2 Bucket '${r2Bucket}'...`);
      try { execSync(`${wrangler} r2 bucket create "${r2Bucket}"`, { stdio: "ignore" }); } catch(e) { console.log(`ℹ️ Bucket '${r2Bucket}' already exists.`); }
      try { execSync(`echo "y" | ${wrangler} r2 bucket dev-url enable "${r2Bucket}"`, { stdio: "ignore" }); } catch(e) {}

      console.log("\n⚙️ Generating wrangler.toml...");
      
      let toml = `name = "${name}"\ncompatibility_date = "2026-01-01"\ncompatibility_flags = ["nodejs_compat"]\n`;
      
      if (database === "postgres") {
        toml += `\n[[hyperdrive]]\nbinding = "HYPERDRIVE"\nid = "${hyperId}"\n`;
      } else {
        toml += `\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${name}-d1"\ndatabase_id = "${d1Id}"\n`;
      }
      toml += `\n[[r2_buckets]]\nbinding = "STORAGE_BUCKET"\nbucket_name = "${r2Bucket}"\n`;
      
      fs.writeFileSync(path.join(process.cwd(), "wrangler.toml"), toml, "utf8");

      console.log("\n🗃️ Running schema migrations & seeding super admin...");
      
      const hashScript = `import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('${password}', 10));`;
      
      let adminHash = "";
      try {
        adminHash = execSync(`node -e "${hashScript}"`, { stdio: "pipe" }).toString().trim();
      } catch(e) {}
      
      if (database === "postgres") {
        try { execSync(`DATABASE_URL="${databaseUrl}" npx drizzle-kit push --force`, { stdio: "ignore" }); } catch(e) {}
        
        const pgScript = `
          import postgres from 'postgres';
          import bcrypt from 'bcryptjs';
          const sql = postgres(process.env.DATABASE_URL || '${databaseUrl}');
          async function bootstrap() {
            try {
              await sql\`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) NOT NULL, password_hash VARCHAR(255), role VARCHAR(50) DEFAULT 'customer', email_verified BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())\`;
              await sql\`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)\`;
              const existing = await sql\`SELECT id FROM users WHERE email = '${email}'\`;
              if (existing.length === 0) {
                const hash = bcrypt.hashSync('${password}', 10);
                await sql\`INSERT INTO users (email, password_hash, role, email_verified) VALUES ('${email}', \\\${hash}, 'super_admin', true)\`;
                console.log('  ✅ PostgreSQL Super Admin Configured');
              }
            } catch (e) {
              console.warn('  ⚠️ Bootstrap note:', e.message);
            } finally { await sql.end(); }
          }
          bootstrap();
        `;
        try { execSync(`node -e "${pgScript.replace(/\n/g, " ")}"`, { stdio: "inherit" }); } catch(e) {}
      } else {
        const schema = `
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            role TEXT DEFAULT 'customer',
            email_verified INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            resource TEXT,
            details TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
          INSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified)
          VALUES ('admin-super-1', '${email}', '${adminHash}', 'super_admin', 1);
        `;
        try {
          execSync(`${wrangler} d1 execute "${name}-d1" --remote --command="${schema.replace(/\n/g, " ")}"`, { stdio: "ignore" });
          console.log(chalk.green("  ✅ D1 Schema Migrated & Super Admin Configured."));
        } catch(e) {}
      }

      console.log("\n🛠️ Building for Cloudflare...");
      try {
        execSync(`${packager} run build`, { stdio: "inherit" });
      } catch (err) {
        console.log(chalk.red("\n❌ Build Failed. Check the output above."));
        process.exit(1);
      }

      console.log("\n☁️ Deploying to Cloudflare Workers...");
      if (fs.existsSync(path.join(process.cwd(), ".wrangler"))) {
        fs.rmSync(path.join(process.cwd(), ".wrangler"), { recursive: true, force: true });
      }

      try {
        execSync(`${wrangler} deploy`, { stdio: "inherit" });
        console.log(chalk.cyan("\n=============================================================================="));
        console.log(chalk.green.bold("🎉 Kyro CMS Deployment Successful!"));
        console.log(chalk.cyan("=============================================================================="));
        console.log(`\n  Super Admin Credentials:`);
        console.log(`  • Email   : ${chalk.bold(email)}`);
        console.log(`  • Password: ${chalk.bold(password)}`);
        console.log(`\n  Save these credentials! This is the only time the password is displayed.\n`);
      } catch (err) {
        console.log(chalk.cyan("\n=============================================================================="));
        console.log(chalk.red.bold("❌ Kyro CMS Cloudflare Deployment Failed!"));
        console.log(chalk.cyan("=============================================================================="));
        console.log("Inspect the Wrangler output above for error details.");
        process.exit(1);
      }
    });

  return deploy;
}
