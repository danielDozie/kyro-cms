import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
let DatabaseSync: typeof import("node:sqlite").DatabaseSync;
function getDatabaseSync() {
  if (DatabaseSync) return DatabaseSync;
  // Fallback for environments like Cloudflare Workers where import.meta.url is undefined
  const _require = createRequire("file:///");
  DatabaseSync = _require("node:sqlite").DatabaseSync;
  return DatabaseSync;
}

export type Dialect = "sqlite" | "postgres";

function getDialect(): Dialect {
  const val = process.env.DB_TYPE as Dialect | undefined;
  if (val === "postgres") return "postgres";
  return "sqlite";
}

export function genId(): string {
  return randomBytes(16).toString("hex");
}

export interface DatabaseResult {
  db: any;
  dialect: Dialect;
  genId: () => string;
}

export async function createDatabase(): Promise<DatabaseResult> {
  const dialect = getDialect();

  if (dialect === "sqlite") {
    const dbPath = resolve(process.cwd(), "data", "kyro.db");
    await mkdir(dirname(dbPath), { recursive: true });
    const db = new (getDatabaseSync())(dbPath);
    db.exec("PRAGMA journal_mode = WAL");
    return { db, dialect, genId };
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/kyro_cms";
  const maxConnections = parseInt(process.env.DB_POOL_MAX || "10", 10);
  const ssl = process.env.DB_SSL === "true";
  const client = postgres(databaseUrl, {
    max: maxConnections,
    ssl: ssl ? "require" : false,
    onnotice: () => {},
  });
  const db = drizzle(client);
  return { db, dialect, genId };
}

export async function runMigrations(
  _db: any,
  _dialect?: Dialect,
): Promise<void> {

}

export async function seedDefaultRoles(db: any): Promise<void> {
  const { roles } = await import("./schema/index.js");
  await db
    .insert(roles)
    .values({
      name: "super_admin",
      level: 100,
      inherits: [],
      description: "Full system access across all tenants",
      isSystem: true,
    })
    .onConflictDoNothing();
}
