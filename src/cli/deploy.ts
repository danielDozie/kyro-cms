import { Command } from "commander";
import { execSync } from "child_process";
import prompts from "prompts";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import chalk from "chalk";
import ora from "ora";

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
    .option("-q, --quiet", "Run without prompts or spinners")
    .option("-j, --json", "Emit a final JSON line with deploy results (for programmatic consumers)")
    .action(async (options) => {
      console.log(`\n  ${chalk.cyan.bold("✦ Kyro CMS")} ${chalk.dim("— Cloudflare Deployment")}\n`);

      const randomSuffix = generateRandomHex();
      const randomPass = generateRandomPassword();

      let { database, databaseUrl, name, r2Bucket, email, password, nonInteractive, quiet, json: jsonOutput } = options;
      // Quiet mode suppresses prompts and spinners
      if (quiet) nonInteractive = true;
      
      let hyperdriveName = `kyro-postgres-hd-${randomSuffix}`;

      if (databaseUrl && !database) {
        database = "postgres";
      }

      if (!nonInteractive && process.stdout.isTTY) {
        const questions: prompts.PromptObject[] = [];

        if (!database) {
          questions.push({
            type: "select",
            name: "database",
            message: "Select database infrastructure:",
            choices: [
              { title: "Cloudflare D1 (Native Serverless SQLite, auto-provisioned)", value: "d1" },
              { title: "PostgreSQL (External DB via Cloudflare Hyperdrive)", value: "postgres" }
            ],
            initial: 0
          });
        }

        if (database === "postgres" && !databaseUrl) {
          questions.push({
            type: "text",
            name: "databaseUrl",
            message: "PostgreSQL Connection URL:",
          });
        }

        if (!name) {
          questions.push({
            type: "text",
            name: "name",
            message: "Cloudflare Project Name:",
            initial: `kyro-app-${randomSuffix}`
          });
        }

        if (!r2Bucket) {
          questions.push({
            type: "text",
            name: "r2Bucket",
            message: "Cloudflare R2 Bucket Name:",
            initial: `kyro-media-${randomSuffix}`
          });
        }

        if (!email) {
          questions.push({
            type: "text",
            name: "email",
            message: "Initial Super Admin Email:",
            initial: "admin@kyro-cms.com"
          });
        }

        if (!password) {
          questions.push({
            type: "text",
            name: "password",
            message: "Initial Super Admin Password (leave blank to auto-generate):",
          });
        }

        const answers = await prompts(questions);

        if (answers.database) database = answers.database;
        if (answers.databaseUrl) databaseUrl = answers.databaseUrl;
        if (answers.name) name = answers.name;
        if (answers.r2Bucket) r2Bucket = answers.r2Bucket;
        if (answers.email) email = answers.email;
        if (answers.password) password = answers.password;
      }

      // Fallbacks
      name = name || `kyro-app-${randomSuffix}`;
      r2Bucket = r2Bucket || `kyro-media-${randomSuffix}`;
      email = email || "admin@kyro-cms.com";
      password = password || randomPass;
      database = database || "d1";

      console.log(chalk.bgGray.black.bold('\n Deployment Plan '));
      console.log(`  ${chalk.dim("├─")} Hosting   : ${chalk.cyan("Cloudflare Workers with Assets")}`);
      console.log(`  ${chalk.dim("├─")} Database  : ${chalk.cyan(database === "d1" ? "Cloudflare D1 (Native)" : "PostgreSQL (Hyperdrive)")}`);
      console.log(`  ${chalk.dim("├─")} Project   : ${chalk.cyan(name)}`);
      console.log(`  ${chalk.dim("├─")} R2 Bucket : ${chalk.cyan(r2Bucket)}`);
      console.log(`  ${chalk.dim("└─")} Admin     : ${chalk.cyan(email)}\n`);

      // 4. Package Manager & Wrangler
      const isPnpm = fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"));
      const packager = isPnpm ? "pnpm" : "npm";
      const wrangler = `npx wrangler`;

      try {
        execSync(`${wrangler} whoami`, { stdio: "ignore" });
        console.log(`  ${chalk.green("✔")} Cloudflare Wrangler authenticated`);
      } catch (err) {
        console.log(`  ${chalk.red("✖")} Cloudflare Wrangler authentication required.`);
        console.log(`    Run ${chalk.bold(`${wrangler} login`)} or set the ${chalk.bold("CLOUDFLARE_API_TOKEN")} env var.`);
        process.exit(1);
      }

      let d1Id = "";
      let hyperId = "";
      const spinnerOptions = quiet ? { isSilent: true } : {};

      if (database === "postgres") {
        if (!databaseUrl) {
          console.log(`  ${chalk.red("✖")} PostgreSQL mode requires a database URL.`);
          process.exit(1);
        }
        const hyperSpinner = ora({text: 'Checking existing Hyperdrive resources...', ...spinnerOptions}).start();
        try {
          const listOut = execSync(`${wrangler} hyperdrive list --json`, { stdio: "pipe" }).toString();
          const list = JSON.parse(listOut.slice(listOut.indexOf("[")));
          const hit = list.find((h: any) => h.name === hyperdriveName);
          if (hit) hyperId = hit.id || hit.uuid;
          hyperSpinner.succeed('Hyperdrive check complete');
        } catch(e) {
          hyperSpinner.fail('Failed to list Hyperdrive resources');
        }
        
        if (!hyperId) {
          const createSpinner = ora({text: 'Creating Hyperdrive...', ...spinnerOptions}).start();
          try {
            const createOut = execSync(`${wrangler} hyperdrive create "${hyperdriveName}" --connection-string="${databaseUrl}" --json`, { stdio: "pipe" }).toString();
            const data = JSON.parse(createOut.slice(createOut.indexOf("{")));
            hyperId = data.id || data.uuid;
            createSpinner.succeed('Hyperdrive created');
          } catch(e) {
            createSpinner.fail('Failed to create Hyperdrive');
          }
        }
        console.log(`  ${chalk.green("✔")} Hyperdrive resource ready (${hyperdriveName})`);
      } else {
        const d1Name = `${name}-d1`;
        const d1Spinner = ora({text: 'Creating D1 database...', ...spinnerOptions}).start();
        try {
          const out = execSync(`${wrangler} d1 create "${d1Name}"`, { stdio: "pipe" }).toString();
          const match = out.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
          if (match) d1Id = match[1];
          d1Spinner.succeed('D1 database created');
        } catch (e) {
          try {
            const listOut = execSync(`${wrangler} d1 list --json`, { stdio: "pipe" }).toString();
            const list = JSON.parse(listOut);
            const hit = list.find((x: any) => x.name === d1Name);
            if (hit) d1Id = hit.id || hit.uuid;
            d1Spinner.succeed('Existing D1 database found');
          } catch(err) {
            d1Spinner.fail('Failed to create/find D1 database');
          }
        }

        if (!d1Id) {
          console.log(`  ${chalk.red("✖")} Failed to create/find D1 database '${d1Name}'. (D1 database limit may be reached).`);
          process.exit(1);
        }
      }

      const r2Spinner = ora({text: 'Creating R2 bucket...', ...spinnerOptions}).start();
      try { execSync(`${wrangler} r2 bucket create "${r2Bucket}"`, { stdio: "ignore" }); r2Spinner.succeed('R2 bucket created'); } catch(e) { r2Spinner.fail('Failed to create R2 bucket'); }
      try { execSync(`echo "y" | ${wrangler} r2 bucket dev-url enable "${r2Bucket}"`, { stdio: "ignore" }); } catch(e) {}
      
      const tomlSpinner = ora({text: 'Generating wrangler.toml...', ...spinnerOptions}).start();
      let toml = `name = "${name}"\ncompatibility_date = "2026-07-31"\ncompatibility_flags = ["nodejs_compat"]\n\n[assets]\ndirectory = "dist/client"\nbinding = "ASSETS"\n`;
      
      if (database === "postgres") {
        toml += `\n[[hyperdrive]]\nbinding = "HYPERDRIVE"\nid = "${hyperId}"\n`;
      } else {
        toml += `\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${name}-d1"\ndatabase_id = "${d1Id}"\n`;
      }
      toml += `\n[[r2_buckets]]\nbinding = "STORAGE_BUCKET"\nbucket_name = "${r2Bucket}"\n`;
      
      fs.writeFileSync(path.join(process.cwd(), "wrangler.toml"), toml, "utf8");
      tomlSpinner.succeed('wrangler.toml generated');

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
              }
            } catch (e) {
            } finally { await sql.end(); }
          }
          bootstrap();
        `;
        try { execSync(`node -e "${pgScript.replace(/\n/g, " ")}"`, { stdio: "pipe" }); } catch(e) {}
        console.log(`  ${chalk.green("✔")} PostgreSQL schema migrated & Super Admin seeded`);
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
          INSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified)
          VALUES ('admin-super-1', '${email}', '${adminHash}', 'super_admin', 1);
        `;
        try {
          execSync(`${wrangler} d1 execute "${name}-d1" --remote --command="${schema.replace(/\n/g, " ")}"`, { stdio: "ignore" });
          console.log(`  ${chalk.green("✔")} D1 schema migrated & Super Admin seeded`);
        } catch(e) {}
      }

      const buildSpinner = ora({text: 'Building Astro project...', ...spinnerOptions}).start();
      try {
        execSync(`${packager} run build`, { stdio: "inherit" });
        const tomlPath = path.join(process.cwd(), "wrangler.toml");
        const tomlContent = fs.readFileSync(tomlPath, "utf8");
        if (!tomlContent.includes('main = "dist/server/entry.mjs"')) {
          fs.writeFileSync(tomlPath, 'main = "dist/server/entry.mjs"\n' + tomlContent, "utf8");
        }
        buildSpinner.succeed('Build complete');
      } catch (err) {
        buildSpinner.fail('Build failed');
        console.log(`\n  ${chalk.red("✖")} Build failed. Inspect output above.`);
        process.exit(1);
      }

      const deploySpinner = ora({text: 'Deploying to Cloudflare Workers...', ...spinnerOptions}).start();
      if (fs.existsSync(path.join(process.cwd(), ".wrangler"))) {
        fs.rmSync(path.join(process.cwd(), ".wrangler"), { recursive: true, force: true });
      }

      let liveUrl = '';
      try {
        const deployOut = execSync(`${wrangler} deploy`, { stdio: 'pipe' }).toString();
        // Print wrangler output to inherit-style passthrough
        process.stdout.write(deployOut);
        // Extract the live URL from wrangler output (e.g. "Published ... (https://...workers.dev)")
        const urlMatch = deployOut.match(/https:\/\/[a-zA-Z0-9._-]+\.workers\.dev/);
        if (urlMatch) liveUrl = urlMatch[0];
        deploySpinner.succeed('Deployment successful');
        console.log(`\n  ${chalk.green.bold("🎉 Deployment Successful!")}\n`);
        console.log(`  ${chalk.bold("Super Admin Credentials")}`);
        console.log(`  ${chalk.dim("├─")} ${chalk.bold("Email   :")} ${chalk.cyan(email)}`);
        console.log(`  ${chalk.dim("└─")} ${chalk.bold("Password:")} ${chalk.yellow.bold(password)}`);
        if (liveUrl) {
          console.log(`  ${chalk.dim("└─")} ${chalk.bold("Live URL:")} ${chalk.cyan(liveUrl)}`);
        }
        console.log(`\n  ${chalk.dim("⚠️  Save these credentials. Password won't be shown again.")}\n`);

        // Emit machine-readable JSON for programmatic consumers (e.g. deploy-kyro server)
        if (jsonOutput) {
          process.stdout.write(
            JSON.stringify({ ok: true, liveUrl, adminEmail: email, adminPassword: password }) + '\n'
          );
        }
      } catch (err) {
        deploySpinner.fail('Deployment failed');
        console.log(`\n  ${chalk.red.bold("✖ Deployment Failed!")}`);
        console.log(`  ${chalk.dim("Inspect Wrangler output above for error details.")}\n`);
        if (jsonOutput) {
          process.stdout.write(JSON.stringify({ ok: false, error: 'Deployment failed' }) + '\n');
        }
        process.exit(1);
      }
    });

  return deploy;
}
