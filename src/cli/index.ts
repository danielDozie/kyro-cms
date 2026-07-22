#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createGenerateCommand } from "./generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
let version = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "../../package.json"), "utf-8"),
  );
  version = pkg.version;
} catch {}

const program = new Command();

program
  .name("kyro")
  .description("Kyro CMS - Astro-native headless CMS")
  .version(version);

// Dev command
program
  .command("dev")
  .description("Start Kyro CMS development server")
  .option("-p, --port <port>", "Port to run on", "4321")
  .option("-h, --host <host>", "Host to bind to", "localhost")
  .action(async (options) => {

    
    const { exec } = await import("child_process");
    const child = exec(`astro dev --port ${options.port} --host ${options.host}`, {
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
    
    child.stdout?.on("data", (data) => process.stdout.write(data));
    child.stderr?.on("data", (data) => process.stderr.write(data));
    
    process.on("SIGINT", () => {
      child.kill("SIGINT");
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      child.kill("SIGTERM");
      process.exit(0);
    });
  });

// Register commands
program.addCommand(createGenerateCommand());

// DB command group
const dbCommand = program
  .command("db")
  .description("Database management commands");

// DB Generate
dbCommand
  .command("generate")
  .description("Generate migrations from schema")
  .action(async () => {

    const { exec } = await import("child_process");
    exec("npx drizzle-kit generate", (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Generation failed:", error.message);
        process.exit(1);
      }
    });
  });

// DB Migrate
dbCommand
  .command("migrate")
  .description("Run database migrations")
  .action(async () => {

    const { exec } = await import("child_process");
    exec("npx drizzle-kit migrate", (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Migration failed:", error.message);
        process.exit(1);
      }
    });
  });

// DB Push
dbCommand
  .command("push")
  .description("Push schema to database (development)")
  .action(async () => {

    const { exec } = await import("child_process");
    exec("npx drizzle-kit push", (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Push failed:", error.message);
        process.exit(1);
      }
    });
  });

// DB Seed
dbCommand
  .command("seed")
  .description("Seed database with initial data")
  .action(async () => {

    const { exec } = await import("child_process");
    exec("npx tsx src/database/drizzle/seed.ts", (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Seeding failed:", error.message);
        process.exit(1);
      }
    });
  });

// DB Studio
dbCommand
  .command("studio")
  .description("Open Drizzle Studio")
  .action(async () => {

    const { exec } = await import("child_process");
    exec("npx drizzle-kit studio", (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Studio failed:", error.message);
        process.exit(1);
      }
    });
  });

// Auth command group
const authCommand = program
  .command("auth")
  .description("Authentication management commands");

// Bootstrap admin
authCommand
  .command("bootstrap")
  .description("Create initial admin user")
  .option("-e, --email <email>", "Admin email", process.env.KYRO_ADMIN_EMAIL)
  .option(
    "-p, --password <password>",
    "Admin password",
    process.env.KYRO_ADMIN_PASSWORD,
  )
  .option(
    "-r, --role <role>",
    "Admin role",
    process.env.KYRO_ADMIN_ROLE || "admin",
  )
  .action(async (options) => {
    if (!options.email || !options.password) {
      console.error(
        "❌ Email and password are required. Set KYRO_ADMIN_EMAIL and KYRO_ADMIN_PASSWORD env vars or use -e and -p options.",
      );
      process.exit(1);
    }



    try {
      const { bootstrapAdmin } = await import("../auth/bootstrap.js");
      const databaseUrl = process.env.DATABASE_URL || "";
      const isPostgres = databaseUrl.toLowerCase().startsWith("postgres://") || databaseUrl.toLowerCase().startsWith("postgresql://");
      const isMongo = databaseUrl.toLowerCase().startsWith("mongodb://") || databaseUrl.toLowerCase().startsWith("mongodb+srv://");
      const isSQLite = !databaseUrl || databaseUrl.includes(".db") || databaseUrl.includes("sqlite") || databaseUrl.includes("file:");

      let adapter: any;

      if (isPostgres) {
        const { PostgresAuthAdapter } = await import("../database/drizzle/postgres-auth-adapter.js");
        const { drizzle } = await import("drizzle-orm/postgres-js");
        const { default: postgres } = await import("postgres");
        const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
        const db = drizzle(client);
        adapter = new PostgresAuthAdapter({ db });

      } else if (isMongo) {
        const { MongoDBAuthAdapter } = await import("../database/mongodb/mongo-auth-adapter.js");
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(databaseUrl);
        await client.connect();
        const db = client.db();
        adapter = new MongoDBAuthAdapter({ db });

      } else {
        const { SQLiteAuthAdapter } = await import("../auth/sqlite-adapter.js");
        const authDbPath = process.env.KYRO_AUTH_DB_PATH || "./data/auth.db";
        adapter = new SQLiteAuthAdapter({ path: authDbPath });

      }

      if (adapter.connect) {
        await adapter.connect();
      }

      const result = await bootstrapAdmin({
        authAdapter: adapter,
        adminEmail: options.email,
        adminPassword: options.password,
        adminRole: options.role,
      });

      if (adapter.disconnect) {
        await adapter.disconnect();
      }

      if (result.success) {
      } else {
        console.error("❌ Failed to create admin:", result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Bootstrap failed:", error);
      process.exit(1);
    }
  });

// Health command
program
  .command("health")
  .description("Check system health")
  .action(async () => {


    const databaseUrl = process.env.DATABASE_URL || "";
    const isPostgres = databaseUrl.toLowerCase().startsWith("postgres://") || databaseUrl.toLowerCase().startsWith("postgresql://");
    const isMongo = databaseUrl.toLowerCase().startsWith("mongodb://") || databaseUrl.toLowerCase().startsWith("mongodb+srv://");
    const isSQLite = !databaseUrl || databaseUrl.includes(".db") || databaseUrl.includes("sqlite") || databaseUrl.includes("file:");

    if (isPostgres) {
      try {
        const { default: postgres } = await import("postgres");
        const client = postgres(databaseUrl, { max: 1, onnotice: () => {} });
        await client.unsafe("SELECT 1");

        await client.end();
      } catch {

      }
    } else if (isMongo) {
      try {
        const { MongoClient } = await import("mongodb");
        const client = new MongoClient(databaseUrl);
        await client.connect();
        await client.db().admin().ping();

        await client.close();
      } catch {

      }
    } else if (isSQLite) {
      try {
        const authDbPath = process.env.KYRO_AUTH_DB_PATH || "./data/auth.db";
        const { existsSync } = await import("fs");
        if (existsSync(authDbPath)) {

        } else {

        }
      } catch {

      }
    }


  });

// Parse arguments
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
