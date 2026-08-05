import { autoInstall } from "../utils/auto-install.js";
import type { AuthAdapter } from "./types.js";
import { InMemoryAuthAdapter } from "./in-memory-adapter.js";
import { SQLiteAuthAdapter } from "./sqlite-adapter.js";
import { InMemoryRateLimiter } from "./security/in-memory-rate-limit.js";
import { InMemoryAccountLockout } from "./security/in-memory-lockout.js";
import { InMemoryAuditLogger } from "./security/in-memory-audit-log.js";
import { EmailTransport } from "../auth/nodemailer-transport.js";
import { PasswordPolicy } from "../auth/security/password-policy.js";
import { AuthRoutes } from "../api/rest/auth-routes.js";
import { RedisAuthAdapter } from "./redis-adapter.js";
import { PostgresAuthAdapter } from "../database/drizzle/postgres-auth-adapter.js";
import { MongoDBAuthAdapter } from "../database/mongodb/mongo-auth-adapter.js";
import { AccountLockout } from "./security/lockout.js";
import { RateLimiter } from "./security/rate-limit.js";
import { AuditLogger } from "./security/audit-log.js";
import { readFileSync } from "fs";
import { join, resolve } from "path";

export type DatabaseType =
  | "sqlite"
  | "postgres"
  | "mongodb"
  | "memory";

export interface KyroAuthConfig {
  authAdapter: AuthAdapter;
  // Optional; when using distributed mode this can be set to 'distributed' or other markers
  databaseType?: string;
  email?: EmailTransport;
  passwordPolicy: PasswordPolicy;
  lockout?: InMemoryAccountLockout;
  rateLimiter?: InMemoryRateLimiter;
  auditLogger?: InMemoryAuditLogger;
  routes: AuthRoutes;
}

function getEnv(key: string, fallback: string = ""): string {
  return process.env[key] || fallback;
}

function getEnvBool(key: string, fallback: boolean = false): boolean {
  const val = process.env[key];
  if (!val) return fallback;
  return val.toLowerCase() === "true";
}

function getEnvNum(key: string, fallback: number = 0): number {
  const val = process.env[key];
  if (!val) return fallback;
  return parseInt(val, 10);
}

function detectDatabaseType(): DatabaseType {
  // Check environment variable first
  const envDb = process.env.KYRO_AUTH_DATABASE?.toLowerCase();
  if (
    envDb &&
    ["sqlite", "postgres", "mongodb", "memory"].includes(envDb)
  ) {
    return envDb as DatabaseType;
  }

  // Try to detect from main kyro.config.ts
  try {
    const configPath = join(process.cwd(), "kyro.config.ts");
    const configContent = readFileSync(configPath, "utf8");

    if (configContent.includes("createLocalAdapter")) {
      return "sqlite";
    } else if (configContent.includes("createDrizzleAdapter")) {
      // Check connection string for database type hints
      if (
        configContent.includes("postgres") ||
        configContent.includes("postgresql")
      ) {
        return "postgres";
      }
      return "postgres"; // Default for drizzle
    } else if (configContent.includes("createMongoDBAdapter")) {
      return "mongodb";
    }
  } catch {
    // If we can't read config, default to memory
  }

  return "memory";
}

async function createAuthAdapter(
  databaseType: DatabaseType,
): Promise<AuthAdapter> {
  const cwd = process.cwd();
  const rootDir = cwd.endsWith("admin") ? join(cwd, "..") : cwd;
  const defaultAuthDbPath = resolve(rootDir, "data", "auth.db");

  switch (databaseType) {
    case "sqlite":
      return new SQLiteAuthAdapter({
        path: getEnv("KYRO_AUTH_DB_PATH", defaultAuthDbPath),
      });
    case "postgres": {
      const databaseUrl = getEnv("DATABASE_URL", "");
      if (databaseUrl) {
        let drizzle, postgres;
        try {
          const drizzleMod = await import(/* @vite-ignore */ "drizzle-orm/postgres-js");
          drizzle = drizzleMod.drizzle;
          postgres = await import(/* @vite-ignore */ "postgres");
        } catch (e) {
          autoInstall(["postgres", "drizzle-orm"]);
          const drizzleMod = await import(/* @vite-ignore */ "drizzle-orm/postgres-js");
          drizzle = drizzleMod.drizzle;
          postgres = await import(/* @vite-ignore */ "postgres");
        }
        const sql = postgres.default(databaseUrl, { onnotice: () => {} });
        const drizzleDb = drizzle(sql);
        return new PostgresAuthAdapter({ db: drizzleDb });
      }
      return new SQLiteAuthAdapter({
        path: getEnv("KYRO_AUTH_DB_PATH", defaultAuthDbPath),
      });
    }
    case "mongodb": {
      const mongoUri = getEnv("MONGODB_URI", "");
      if (mongoUri) {
        let MongoClient;
        try {
          const mongoMod: any = await import(/* @vite-ignore */ "mongodb" as any);
          MongoClient = mongoMod.MongoClient ?? mongoMod.default?.MongoClient;
        } catch (e) {
          autoInstall(["mongodb"]);
          const mongoMod: any = await import(/* @vite-ignore */ "mongodb" as any);
          MongoClient = mongoMod.MongoClient ?? mongoMod.default?.MongoClient;
        }
        const client = new MongoClient(mongoUri);
        await client.connect();
        const url = new URL(mongoUri);
        const dbName = url.pathname.replace(/^\//, "") || "kyro_cms";
        const mongoDb = client.db(dbName);
        return new MongoDBAuthAdapter({ db: mongoDb });
      }
      return new SQLiteAuthAdapter({
        path: getEnv("KYRO_AUTH_DB_PATH", defaultAuthDbPath),
      });
    }
    case "memory":
    default:
      return new InMemoryAuthAdapter();
  }
}

export async function createAuthConfig(
  databaseType?: string,
  db?: any,
): Promise<KyroAuthConfig> {
  const distributed = getEnvBool("KYRO_DISTRIBUTED", false);
  let authAdapter: AuthAdapter;
  // Distributed mode uses Redis for shared state
  if (distributed) {
    // Dynamically import to avoid pulling Redis on dev builds
    const { RedisAuthAdapter } = await import(/* @vite-ignore */ "./redis-adapter.js");
    const redisUrl = getEnv("REDIS_URL", "redis://localhost:6379");
    const redisTls = getEnvBool("REDIS_TLS", false);
    const redisAdapter = new RedisAuthAdapter({ url: redisUrl, tls: redisTls });
    await redisAdapter.connect?.();
    authAdapter = redisAdapter as any;
  } else {
    const initialDbType = (databaseType || detectDatabaseType()) as any;
    authAdapter = await createAuthAdapter(initialDbType);
    if ((authAdapter as any).connect) {
      await (authAdapter as any).connect();
    }
  }

  const email = db
    ? (await EmailTransport.fromConfig(db).catch(() => null)) || EmailTransport.fromEnv() || undefined
    : EmailTransport.fromEnv() || undefined;

  const passwordPolicy = new PasswordPolicy({
    minLength: getEnvNum("PASSWORD_MIN_LENGTH", 12),
    requireUppercase: getEnvBool("PASSWORD_REQUIRE_UPPERCASE", true),
    requireLowercase: getEnvBool("PASSWORD_REQUIRE_LOWERCASE", true),
    requireNumbers: getEnvBool("PASSWORD_REQUIRE_NUMBERS", true),
    requireSpecialChars: getEnvBool("PASSWORD_REQUIRE_SPECIAL", true),
    preventReuse: getEnvNum("PASSWORD_PREVENT_REUSE", 5),
    maxLength: getEnvNum("PASSWORD_MAX_LENGTH", 128),
  });

  let lockout: any;
  let rateLimiter: any;
  let auditLogger: any;
  if (distributed) {
    // Redis-backed security features
    const redis = authAdapter as any;
    const redisClient = (redis as any).redis;
    lockout = new AccountLockout(redisClient, {
      maxAttempts: getEnvNum("LOCKOUT_MAX_ATTEMPTS", 5),
      lockDuration: getEnvNum("LOCKOUT_DURATION_MINUTES", 15) * 60 * 1000,
    });
    rateLimiter = new RateLimiter(redisClient, {
      "auth:login": {
        window: getEnvNum("RATE_LIMIT_AUTH_WINDOW_MS", 900000),
        max: getEnvNum("RATE_LIMIT_AUTH_MAX_REQUESTS", 10),
      },
      "api:general": {
        window: getEnvNum("RATE_LIMIT_WINDOW_MS", 60000),
        max: getEnvNum("RATE_LIMIT_MAX_REQUESTS", 100),
      },
    });
    auditLogger = new AuditLogger(
      redisClient,
      getEnvNum("AUDIT_LOG_RETENTION_DAYS", 30),
    );
  } else {
    lockout = new InMemoryAccountLockout({
      maxAttempts: getEnvNum("LOCKOUT_MAX_ATTEMPTS", 5),
      lockDuration: getEnvNum("LOCKOUT_DURATION_MINUTES", 15) * 60 * 1000,
    });
    rateLimiter = new InMemoryRateLimiter({
      "auth:login": {
        window: getEnvNum("RATE_LIMIT_AUTH_WINDOW_MS", 900000),
        max: getEnvNum("RATE_LIMIT_AUTH_MAX_REQUESTS", 10),
      },
      "api:general": {
        window: getEnvNum("RATE_LIMIT_WINDOW_MS", 60000),
        max: getEnvNum("RATE_LIMIT_MAX_REQUESTS", 100),
      },
    });
    auditLogger = getEnvBool("AUDIT_LOG_ENABLED", true)
      ? new InMemoryAuditLogger(getEnvNum("AUDIT_LOG_RETENTION_DAYS", 30))
      : undefined;
  }

  const routes = new AuthRoutes({
    redis: authAdapter as any,
    email,
    jwtSecret: getEnv("APP_SECRET", "change-me"),
    jwtExpiresIn: getEnv("JWT_EXPIRES_IN", "24h"),
    jwtIssuer: getEnv("JWT_ISSUER", "kyro-cms"),
    jwtAudience: getEnv("JWT_AUDIENCE", "kyro-cms-client"),
    passwordPolicy,
    lockout,
    rateLimiter,
    auditLogger,
    baseUrl: getEnv("EMAIL_BASE_URL", "http://localhost:4321"),
    emailVerificationRequired: getEnvBool("EMAIL_VERIFICATION_REQUIRED", true),
  });

  const actualDbType = distributed
    ? "distributed"
    : ((databaseType || detectDatabaseType()) as string);
  return {
    authAdapter,
    databaseType: actualDbType,
    email,
    passwordPolicy,
    lockout,
    rateLimiter,
    auditLogger,
    routes,
  };
}

export const authConfig = createAuthConfig().catch((err) => {
  console.warn("[AuthConfig] Failed to initialize auth config:", err.message);
  return null as any;
});
