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

const ALIAS_BLOCK = `\n[alias]\n"better-sqlite3" = "./cf-noop.js"\n"./redis-adapter.js" = "./cf-noop.js"\n"pg" = "./cf-noop.js"\n"pg-native" = "./cf-noop.js"\n"mongodb" = "./cf-noop.js"\n"ioredis" = "./cf-noop.js"\n"sharp" = "./cf-noop.js"\n"ssh2" = "./cf-noop.js"\n"cpu-features" = "./cf-noop.js"\n"nodemailer" = "./cf-noop.js"\n"node:sqlite" = "./cf-noop.js"\n"basic-ftp" = "./cf-noop.js"\n`;
const CF_NOOP_CONTENT = `// No-op stub for Node.js-only modules that cannot run in Cloudflare Workers.\nexport default {};\n`;

function sliceSection(content: string, header: string): string {
  const start = content.indexOf(header);
  if (start === -1) return "";
  const rest = content.slice(start + header.length);
  const next = rest.search(/\n\s*(\[\[|\[)/);
  return rest.slice(0, next === -1 ? undefined : next);
}

function getTomlValue(block: string, key: string): string {
  const m = block.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"));
  return m ? m[1] : "";
}

function findBindingBlock(content: string, blockHeader: string, binding: string): string {
  let rest = content;
  let idx = rest.indexOf(blockHeader);
  while (idx !== -1) {
    const block = sliceSection(rest, blockHeader);
    if (getTomlValue(block, "binding") === binding) return block;
    rest = rest.slice(idx + blockHeader.length + block.length);
    idx = rest.indexOf(blockHeader);
  }
  return "";
}

function parseExistingToml(tomlPath: string) {
  const content = fs.readFileSync(tomlPath, "utf8");
  const result: Record<string, string> = {
    name: "",
    database: "",
    d1Id: "",
    hyperId: "",
    r2Bucket: "",
  };
  const nameM = content.match(/^name\s*=\s*"([^"]*)"/m);
  if (nameM) result.name = nameM[1];

  const d1Block = findBindingBlock(content, "[[d1_databases]]", "DB");
  if (d1Block) {
    result.database = "d1";
    result.d1Id = getTomlValue(d1Block, "database_id");
  }

  const hyperBlock = findBindingBlock(content, "[[hyperdrive]]", "HYPERDRIVE");
  if (hyperBlock) {
    result.database = "postgres";
    result.hyperId = getTomlValue(hyperBlock, "id");
  }

  const r2Block = findBindingBlock(content, "[[r2_buckets]]", "STORAGE_BUCKET");
  if (r2Block) result.r2Bucket = getTomlValue(r2Block, "bucket_name");

  return result;
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

      // If a wrangler.toml already exists, treat this as a redeploy: reuse the
      // configured project name, database bindings and storage instead of
      // regenerating the file from scratch.
      const tomlPath = path.join(process.cwd(), "wrangler.toml");
      const existingToml = fs.existsSync(tomlPath) ? parseExistingToml(tomlPath) : null;
      const isRedeploy = !!(existingToml && existingToml.name);

      if (databaseUrl && !database) {
        database = "postgres";
      }

      if (isRedeploy) {
        console.log(`\n  ${chalk.cyan("♻")} Existing wrangler.toml found — redeploying "${existingToml.name}"\n`);
      } else if (!nonInteractive && process.stdout.isTTY) {
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
      const emailExplicit = !!email;
      const passwordExplicit = !!password;
      name = name || (isRedeploy ? existingToml.name : `kyro-app-${randomSuffix}`);
      r2Bucket = r2Bucket || (isRedeploy ? existingToml.r2Bucket : "") || `kyro-media-${randomSuffix}`;
      email = email || "admin@kyro-cms.com";
      password = password || randomPass;
      database = database || (isRedeploy ? existingToml.database : "d1") || "d1";

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

      if (isRedeploy) {
        d1Id = existingToml.d1Id;
        hyperId = existingToml.hyperId;
      } else if (database === "postgres") {
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

      if (isRedeploy) {
        // Redeploy: patch an existing wrangler.toml in place — never regenerate it.
        let tomlContent = fs.readFileSync(tomlPath, "utf8");
        let changed = false;

        if (tomlContent.includes('main = "admin/dist/server/index.mjs"')) {
          // already correct
        } else if (/^main\s*=.*$/m.test(tomlContent)) {
          tomlContent = tomlContent.replace(/^main\s*=.*$/m, 'main = "admin/dist/server/index.mjs"');
          changed = true;
        } else {
          tomlContent = 'main = "admin/dist/server/index.mjs"\n' + tomlContent;
          changed = true;
        }

        if (!tomlContent.includes("[alias]")) {
          tomlContent += ALIAS_BLOCK;
          changed = true;
        }

        if (changed) fs.writeFileSync(tomlPath, tomlContent, "utf8");
        if (!fs.existsSync(path.join(process.cwd(), "cf-noop.js"))) {
          fs.writeFileSync(path.join(process.cwd(), "cf-noop.js"), CF_NOOP_CONTENT, "utf8");
        }
      } else {
        const r2Spinner = ora({text: 'Creating R2 bucket...', ...spinnerOptions}).start();
        try { execSync(`${wrangler} r2 bucket create "${r2Bucket}"`, { stdio: "ignore" }); r2Spinner.succeed('R2 bucket created'); } catch(e) { r2Spinner.fail('Failed to create R2 bucket'); }
        try { execSync(`echo "y" | ${wrangler} r2 bucket dev-url enable "${r2Bucket}"`, { stdio: "ignore" }); } catch(e) {}
        
        const tomlSpinner = ora({text: 'Generating wrangler.toml...', ...spinnerOptions}).start();
        let toml = `name = "${name}"\ncompatibility_date = "2026-07-31"\ncompatibility_flags = ["nodejs_compat"]\n\n[assets]\ndirectory = "admin/dist/client"\nbinding = "ASSETS"\n`;
        
        if (database === "postgres") {
          toml += `\n[[hyperdrive]]\nbinding = "HYPERDRIVE"\nid = "${hyperId}"\n`;
        } else {
          toml += `\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${name}-d1"\ndatabase_id = "${d1Id}"\n`;
        }
        toml += `\n[[r2_buckets]]\nbinding = "STORAGE_BUCKET"\nbucket_name = "${r2Bucket}"\n`;
        toml += ALIAS_BLOCK;
        fs.writeFileSync(path.join(process.cwd(), "wrangler.toml"), toml, "utf8");
        fs.writeFileSync(path.join(process.cwd(), "cf-noop.js"), CF_NOOP_CONTENT, "utf8");
        tomlSpinner.succeed('wrangler.toml generated');
      }

      // Schema for remote databases is created by Kyro itself on first init.
      // For PostgreSQL, push the drizzle schema so tables exist before the first request.
      if (!isRedeploy && database === "postgres") {
        try { execSync(`DATABASE_URL="${databaseUrl}" npx drizzle-kit push --force`, { stdio: "ignore" }); } catch(e) {}
        console.log(`  ${chalk.green("✔")} PostgreSQL schema pushed`);
      }

      // NOTE: The Super Admin user is NOT seeded here. Admin credentials are stored as
      // worker secrets after deploy, and the admin is created by Kyro's autoBootstrap on
      // first init — using the real auth schema and idempotent "create if missing" logic.

      const buildSpinner = ora({text: 'Building Astro project...', ...spinnerOptions}).start();
      let buildOutput = "";
      try {
        // Capture build output so warnings are hidden on success but shown on failure.
        buildOutput = execSync(`${packager} run build:pages 2>&1`, { stdio: "pipe", maxBuffer: 64 * 1024 * 1024 }).toString();
        const tomlContent = fs.readFileSync(tomlPath, "utf8");
        if (!tomlContent.includes('main = "admin/dist/server/index.mjs"')) {
          fs.writeFileSync(tomlPath, 'main = "admin/dist/server/index.mjs"\n' + tomlContent, "utf8");
        }
        buildSpinner.succeed('Build complete');
      } catch (err) {
        const captured = (err as any)?.stdout?.toString?.() || buildOutput || "";
        buildSpinner.fail('Build failed');
        if (captured) process.stdout.write(captured);
        console.log(`\n  ${chalk.red("✖")} Build failed. Inspect output above.`);
        process.exit(1);
      }

      const deploySpinner = ora({text: 'Deploying to Cloudflare Workers...', ...spinnerOptions}).start();
      if (fs.existsSync(path.join(process.cwd(), ".wrangler"))) {
        fs.rmSync(path.join(process.cwd(), ".wrangler"), { recursive: true, force: true });
      }

      let liveUrl = '';
      try {
        const deployOut = execSync(`${wrangler} deploy`, { stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }).toString();
        // Print wrangler output to inherit-style passthrough
        process.stdout.write(deployOut);
        // Extract the live URL from wrangler output (e.g. "Published ... (https://...workers.dev)")
        const urlMatch = deployOut.match(/https:\/\/[a-zA-Z0-9._-]+\.workers\.dev/);
        if (urlMatch) liveUrl = urlMatch[0];
        deploySpinner.succeed('Deployment successful');
        console.log(`\n  ${chalk.green.bold("🎉 Deployment Successful!")}\n`);

        // Store admin credentials as worker secrets so Kyro's autoBootstrap can create
        // the Super Admin on first init (real schema, idempotent, no shell interpolation).
        // Fresh installs always store them; redeploys only re-store when -e/-p were passed.
        const shouldSetSecrets = !isRedeploy || emailExplicit || passwordExplicit;
        let credentialsUpdated = false;
        if (shouldSetSecrets) {
          const secretSpinner = ora({ text: 'Storing admin credentials as worker secrets...', ...spinnerOptions }).start();
          let secretsOk = true;
          const setSecret = (key: string, value: string) => {
            try {
              // Use execSync's `input` option so the value goes to stdin with NO shell
              // interpolation (avoids the `$` escaping bug that corrupted bcrypt hashes).
              execSync(`${wrangler} secret put ${key}`, { input: value, stdio: ["pipe", "ignore", "pipe"] });
            } catch (e) {
              secretsOk = false;
            }
          };
          setSecret("KYRO_ADMIN_EMAIL", email);
          setSecret("KYRO_ADMIN_PASSWORD", password);
          if (secretsOk) {
            credentialsUpdated = true;
            secretSpinner.succeed('Admin credentials stored as worker secrets');
          } else {
            secretSpinner.warn('Could not store admin credentials — set KYRO_ADMIN_EMAIL / KYRO_ADMIN_PASSWORD manually');
          }
        }

        // Only show a password we actually applied. On a redeploy without -e/-p the
        // stored secret is unknown (secrets can't be read back), so don't print a fresh one.
        const adminPasswordToShow = !isRedeploy || credentialsUpdated ? password : null;
        if (isRedeploy) {
          if (credentialsUpdated) {
            console.log(`  ${chalk.dim("Redeployed")} ${chalk.cyan(name)} — admin credentials updated.`);
          } else {
            console.log(`  ${chalk.dim("Redeployed")} ${chalk.cyan(name)} — existing resources and admin credentials are unchanged.`);
          }
        }
        if (adminPasswordToShow) {
          console.log(`  ${chalk.bold("Super Admin Credentials")}`);
          console.log(`  ${chalk.dim("├─")} ${chalk.bold("Email   :")} ${chalk.cyan(email)}`);
          console.log(`  ${chalk.dim("└─")} ${chalk.bold("Password:")} ${chalk.yellow.bold(password)}`);
        }
        if (liveUrl) {
          console.log(`  ${chalk.dim("└─")} ${chalk.bold("Live URL:")} ${chalk.cyan(liveUrl)}`);
        }
        if (!isRedeploy) {
          console.log(`\n  ${chalk.dim("⚠️  Save these credentials. Password won't be shown again.")}\n`);
        }

        // Emit machine-readable JSON for programmatic consumers (e.g. deploy-kyro server)
        if (jsonOutput) {
          process.stdout.write(
            JSON.stringify({ ok: true, liveUrl, adminEmail: email, adminPassword: adminPasswordToShow, redeploy: isRedeploy, credentialsUpdated }) + '\n'
          );
        }
      } catch (err) {
        const out = (err as any)?.stdout?.toString?.() || "";
        const errOut = (err as any)?.stderr?.toString?.() || "";
        deploySpinner.fail('Deployment failed');
        if (out) process.stdout.write(out);
        if (errOut) process.stdout.write(errOut);
        console.log(`\n  ${chalk.red.bold("✖ Deployment Failed!")}`);
        console.log(`  ${chalk.dim("See the Wrangler error above.")}\n`);
        if (jsonOutput) {
          process.stdout.write(JSON.stringify({ ok: false, error: 'Deployment failed' }) + '\n');
        }
        process.exit(1);
      }
    });

  return deploy;
}
