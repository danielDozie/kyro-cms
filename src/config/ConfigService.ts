import { eq } from "drizzle-orm";
import { settings as settingsSchema } from "../database/drizzle/schema/settings.js";

let _settingsTableEnsured = false;

export interface S3CompatibleConfig {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  cdnUrl?: string;
  prefix?: string;
}

export interface R2Config {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  cdnUrl?: string;
  prefix?: string;
  publicDevUrl?: string;
}

export interface GCSConfig {
  bucket?: string;
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  cdnUrl?: string;
  prefix?: string;
}

export interface BackblazeConfig {
  bucket?: string;
  accountId?: string;
  applicationKeyId?: string;
  applicationKey?: string;
  cdnUrl?: string;
  prefix?: string;
}

export interface BunnyConfig {
  storageZone?: string;
  apiKey?: string;
  cdnUrl?: string;
  prefix?: string;
}

export interface FTPConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  secure?: boolean;
  baseUrl?: string;
  prefix?: string;
}

export interface StorageConfig {
  type: string;
  s3: S3CompatibleConfig;
  r2: R2Config;
  gcs: GCSConfig;
  digitalocean: S3CompatibleConfig;
  backblaze: BackblazeConfig;
  wasabi: S3CompatibleConfig;
  bunny: BunnyConfig;
  ftp: FTPConfig;
  cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
    folder?: string;
  };
  imgix: {
    domain?: string;
    signKey?: string;
  };
  local: {
    uploadDir?: string;
    baseUrl?: string;
  };
}

export interface EmailConfig {
  provider?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

export class ConfigService {
  private db: any;
  private cache: Record<string, string> = {};
  private loaded = false;
  private static readonly SENSITIVE_KEYS = [
    "storage.s3.secret_access_key",
    "storage.r2.secret_access_key",
    "storage.gcs.private_key",
    "storage.backblaze.application_key",
    "storage.wasabi.secret_access_key",
    "storage.ftp.password",
    "storage.bunny.api_key",
    "storage.cloudinary.api_secret",
    "storage.imgix.sign_key",
    "email.smtp.pass",
    "auth.jwt_secret",
    "auth.github_secret",
    "auth.google_secret",
    "auth.app_secret",
    "database.url",
    "redis.url",
    "auth.admin_password",
  ];

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Initialize the service by loading all settings from the database
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    await this.ensureSettingsTable();

    try {
      if (typeof this.db?.select === "function") {
        const allSettings = await this.db.select().from(settingsSchema);
        this.cache = allSettings.reduce((acc: any, row: any) => {
          acc[row.key] = row.value;
          return acc;
        }, {});
      }
      
      // Always try to load from globals to pick up CMS-configured storage settings
      await this.loadFromGlobals();
    } catch (error) {
      console.warn(
        "ConfigService: Could not load settings from database, using environment fallbacks.",
      );
    }

    this.loaded = true;
  }

  private async ensureSettingsTable(): Promise<void> {
    if (_settingsTableEnsured) return;

    try {
      if (typeof this.db?.execute === "function") {
        const { sql } = await import("drizzle-orm");
        await this.db.execute(sql`
          CREATE TABLE IF NOT EXISTS "settings" (
            "key" VARCHAR(255) PRIMARY KEY,
            "value" TEXT NOT NULL,
            "description" TEXT,
            "updated_at" TIMESTAMP DEFAULT NOW()
          )
        `);
        _settingsTableEnsured = true;
      } else if (typeof this.db?.exec === "function") {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT
          )
        `);
        _settingsTableEnsured = true;
      }
    } catch {
      // Table creation failed — will fall back to env vars
    }
  }

  /**
   * Load settings from the _globals_storage-settings table (SQLite fallback)
   * Maps nested global structure to flat key-value cache
   */
  private async loadFromGlobals(): Promise<void> {
    try {
      let row: any = null;
      if (typeof this.db?.findOne === "function") {
        try {
          const result = await this.db.findOne({
            collection: "_globals_storage-settings",
            where: {},
            draft: true,
          });
          if (result) row = result;
        } catch {}
      }
      if (!row && typeof this.db?.execute === "function") {
        const { sql } = await import("drizzle-orm");
        const variants = ['"_globals_storage-settings"', '"_globals_storage_settings"', '"global_storage_settings"'];
        for (const name of variants) {
          try {
            const result = await this.db.execute(sql`SELECT * FROM ${sql.raw(name)} LIMIT 1`);
            row = Array.isArray(result) ? result[0] : (result?.rows ? result.rows[0] : null);
            if (row) break;
          } catch {}
        }
      } else if (!row && typeof this.db?.prepare === "function") {
        const variants = ['"_globals_storage-settings"', '"_globals_storage_settings"', '"global_storage_settings"'];
        for (const name of variants) {
          try {
            row = this.db.prepare(`SELECT * FROM ${name} LIMIT 1`).get();
            if (row) break;
          } catch {}
        }
      }

      if (!row) return;

      const parseJSON = (val: any) => {
        if (!val) return null;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return null;
          }
        }
        return val;
      };

      const provider = row.provider || "local";
      this.cache["storage.type"] = provider;

      if (provider === "local") {
        const local = parseJSON(row.local);
        this.cache["storage.local.dir"] =
          local?.uploadDir || "./public/uploads";
        this.cache["storage.local.url"] = local?.baseUrl || "/uploads";
      }

      if (provider === "aws") {
        const aws = parseJSON(row.aws);
        this.cache["storage.s3.bucket"] = aws?.bucket || "";
        this.cache["storage.s3.region"] = aws?.region || "us-east-1";
        this.cache["storage.s3.access_key_id"] = aws?.accessKeyId || "";
        this.cache["storage.s3.secret_access_key"] = aws?.secretAccessKey || "";
        this.cache["storage.s3.endpoint"] = aws?.endpoint || "";
        this.cache["storage.s3.cdn_url"] = aws?.cdnUrl || "";
        this.cache["storage.s3.prefix"] = aws?.prefix || "";
      }

      if (provider === "r2") {
        const r2 = parseJSON(row.r2);
        this.cache["storage.r2.account_id"] = r2?.accountId || "";
        this.cache["storage.r2.access_key_id"] = r2?.accessKeyId || "";
        this.cache["storage.r2.secret_access_key"] = r2?.secretAccessKey || "";
        this.cache["storage.r2.bucket"] = r2?.bucket || "";
        this.cache["storage.r2.cdn_url"] = r2?.cdnUrl || "";
        this.cache["storage.r2.prefix"] = r2?.prefix || "";
      }

      if (provider === "cloudinary") {
        const cloudinary = parseJSON(row.cloudinary);
        this.cache["storage.cloudinary.cloud_name"] =
          cloudinary?.cloudName || "";
        this.cache["storage.cloudinary.api_key"] = cloudinary?.apiKey || "";
        this.cache["storage.cloudinary.api_secret"] =
          cloudinary?.apiSecret || "";
        this.cache["storage.cloudinary.folder"] = cloudinary?.folder || "";
      }

      if (provider === "ftp") {
        const ftp = parseJSON(row.ftp);
        this.cache["storage.ftp.host"] = ftp?.host || "";
        this.cache["storage.ftp.port"] = String(ftp?.port || "21");
        this.cache["storage.ftp.user"] = ftp?.user || "";
        this.cache["storage.ftp.password"] = ftp?.password || "";
        this.cache["storage.ftp.secure"] = ftp?.secure ? "true" : "false";
        this.cache["storage.ftp.base_url"] = ftp?.baseUrl || "";
        this.cache["storage.ftp.prefix"] = ftp?.prefix || "";
      }
    } catch (error) {
      console.warn("ConfigService: Could not load storage settings from globals table:", error);
    }

    // Also load email-settings
    try {
      let row: any = null;
      if (typeof this.db?.findOne === "function") {
        try {
          const result = await this.db.findOne({
            collection: "_globals_email-settings",
            where: {},
            draft: true,
          });
          if (result) row = result;
        } catch {}
      }
      if (!row && typeof this.db?.execute === "function") {
        const { sql } = await import("drizzle-orm");
        const variants = ['"_globals_email-settings"', '"_globals_email_settings"', '"global_email_settings"'];
        for (const name of variants) {
          try {
            const result = await this.db.execute(sql`SELECT * FROM ${sql.raw(name)} LIMIT 1`);
            row = Array.isArray(result) ? result[0] : (result?.rows ? result.rows[0] : null);
            if (row) break;
          } catch {}
        }
      } else if (!row && typeof this.db?.prepare === "function") {
        const variants = ['"_globals_email-settings"', '"_globals_email_settings"', '"global_email_settings"'];
        for (const name of variants) {
          try {
            row = this.db.prepare(`SELECT * FROM ${name} LIMIT 1`).get();
            if (row) break;
          } catch {}
        }
      }

      if (row) {
        const parseJSON = (val: any) => {
          if (!val) return null;
          if (typeof val === "string") {
            try { return JSON.parse(val); } catch { return null; }
          }
          return val;
        };

        this.cache["email.provider"] = row.provider || "smtp";
        this.cache["email.smtp.from"] = row.fromEmail || "";
        this.cache["email.smtp.from_name"] = row.fromName || "";
        this.cache["email.smtp.reply_to"] = row.replyTo || "";

        if (row.provider === "smtp") {
          const smtp = parseJSON(row.smtp);
          this.cache["email.smtp.host"] = smtp?.host || "";
          this.cache["email.smtp.port"] = String(smtp?.port || "587");
          this.cache["email.smtp.user"] = smtp?.username || "";
          this.cache["email.smtp.pass"] = smtp?.password || "";
          this.cache["email.smtp.secure"] = smtp?.secure ? "true" : "false";
        } else if (row.provider === "resend") {
          const resend = parseJSON(row.resend);
          this.cache["email.smtp.pass"] = resend?.apiKey || ""; // We might use pass as apiKey
        } else if (row.provider === "sendgrid") {
          const sendgrid = parseJSON(row.sendgrid);
          this.cache["email.smtp.pass"] = sendgrid?.apiKey || "";
        } else if (row.provider === "mailgun") {
          const mailgun = parseJSON(row.mailgun);
          this.cache["email.smtp.pass"] = mailgun?.apiKey || "";
        } else if (row.provider === "ses") {
          const ses = parseJSON(row.ses);
          this.cache["email.smtp.user"] = ses?.accessKeyId || "";
          this.cache["email.smtp.pass"] = ses?.secretAccessKey || "";
        }
      }
    } catch (error) {
      console.warn("ConfigService: Could not load email settings from globals table:", error);
    }
  }

  /**
   * Get a settings value with environment fallback
   */
  get(key: string, envKey?: string, defaultValue?: string): string | undefined {
    // 1. Check database cache
    if (this.cache[key]) return this.cache[key];

    // 2. Check environment variable
    if (envKey && process.env[envKey]) return process.env[envKey];

    // 3. Return default
    return defaultValue;
  }

  /**
   * Get storage configuration
   */
  getStorageConfig(): StorageConfig {
    return {
      type: this.get("storage.type", "STORAGE_TYPE", "local")!,
      s3: {
        bucket: this.get("storage.s3.bucket", "STORAGE_BUCKET"),
        region: this.get("storage.s3.region", "STORAGE_REGION", "us-east-1"),
        accessKeyId: this.get(
          "storage.s3.access_key_id",
          "STORAGE_ACCESS_KEY_ID",
        ),
        secretAccessKey: this.get(
          "storage.s3.secret_access_key",
          "STORAGE_SECRET_ACCESS_KEY",
        ),
        endpoint: this.get("storage.s3.endpoint", "STORAGE_ENDPOINT"),
        cdnUrl: this.get("storage.s3.cdn_url", "STORAGE_CDN_URL"),
        prefix: this.get("storage.s3.prefix", "STORAGE_PREFIX"),
      },
      r2: {
        accountId: this.get("storage.r2.account_id", "R2_ACCOUNT_ID"),
        accessKeyId: this.get("storage.r2.access_key_id", "R2_ACCESS_KEY_ID"),
        secretAccessKey: this.get(
          "storage.r2.secret_access_key",
          "R2_SECRET_ACCESS_KEY",
        ),
        bucket: this.get("storage.r2.bucket", "R2_BUCKET"),
        cdnUrl: this.get("storage.r2.cdn_url", "R2_CDN_URL"),
        prefix: this.get("storage.r2.prefix", "R2_PREFIX"),
      },
      gcs: {
        bucket: this.get("storage.gcs.bucket", "GCS_BUCKET"),
        projectId: this.get("storage.gcs.project_id", "GCS_PROJECT_ID"),
        clientEmail: this.get("storage.gcs.client_email", "GCS_CLIENT_EMAIL"),
        privateKey: this.get("storage.gcs.private_key", "GCS_PRIVATE_KEY"),
        cdnUrl: this.get("storage.gcs.cdn_url", "GCS_CDN_URL"),
        prefix: this.get("storage.gcs.prefix", "GCS_PREFIX"),
      },
      digitalocean: {
        bucket: this.get("storage.digitalocean.bucket", "DO_BUCKET"),
        region: this.get("storage.digitalocean.region", "DO_REGION", "nyc3"),
        accessKeyId: this.get(
          "storage.digitalocean.access_key_id",
          "DO_ACCESS_KEY_ID",
        ),
        secretAccessKey: this.get(
          "storage.digitalocean.secret_access_key",
          "DO_SECRET_ACCESS_KEY",
        ),
        cdnUrl: this.get("storage.digitalocean.cdn_url", "DO_CDN_URL"),
        prefix: this.get("storage.digitalocean.prefix", "DO_PREFIX"),
      },
      backblaze: {
        bucket: this.get("storage.backblaze.bucket", "BB_BUCKET"),
        accountId: this.get("storage.backblaze.account_id", "BB_ACCOUNT_ID"),
        applicationKeyId: this.get(
          "storage.backblaze.application_key_id",
          "BB_APPLICATION_KEY_ID",
        ),
        applicationKey: this.get(
          "storage.backblaze.application_key",
          "BB_APPLICATION_KEY",
        ),
        cdnUrl: this.get("storage.backblaze.cdn_url", "BB_CDN_URL"),
        prefix: this.get("storage.backblaze.prefix", "BB_PREFIX"),
      },
      wasabi: {
        bucket: this.get("storage.wasabi.bucket", "WASABI_BUCKET"),
        region: this.get("storage.wasabi.region", "WASABI_REGION", "us-east-1"),
        accessKeyId: this.get(
          "storage.wasabi.access_key_id",
          "WASABI_ACCESS_KEY_ID",
        ),
        secretAccessKey: this.get(
          "storage.wasabi.secret_access_key",
          "WASABI_SECRET_ACCESS_KEY",
        ),
        cdnUrl: this.get("storage.wasabi.cdn_url", "WASABI_CDN_URL"),
        prefix: this.get("storage.wasabi.prefix", "WASABI_PREFIX"),
      },
      bunny: {
        storageZone: this.get(
          "storage.bunny.storage_zone",
          "BUNNY_STORAGE_ZONE",
        ),
        apiKey: this.get("storage.bunny.api_key", "BUNNY_API_KEY"),
        cdnUrl: this.get("storage.bunny.cdn_url", "BUNNY_CDN_URL"),
        prefix: this.get("storage.bunny.prefix", "BUNNY_PREFIX"),
      },
      ftp: {
        host: this.get("storage.ftp.host", "FTP_HOST"),
        port: parseInt(this.get("storage.ftp.port", "FTP_PORT", "21")!, 10),
        user: this.get("storage.ftp.user", "FTP_USER"),
        password: this.get("storage.ftp.password", "FTP_PASSWORD"),
        secure: this.get("storage.ftp.secure", "FTP_SECURE") === "true",
        baseUrl: this.get("storage.ftp.base_url", "FTP_BASE_URL"),
        prefix: this.get("storage.ftp.prefix", "FTP_PREFIX"),
      },
      cloudinary: {
        cloudName: this.get(
          "storage.cloudinary.cloud_name",
          "CLOUDINARY_CLOUD_NAME",
        ),
        apiKey: this.get("storage.cloudinary.api_key", "CLOUDINARY_API_KEY"),
        apiSecret: this.get(
          "storage.cloudinary.api_secret",
          "CLOUDINARY_API_SECRET",
        ),
        folder: this.get("storage.cloudinary.folder", "CLOUDINARY_FOLDER"),
      },
      imgix: {
        domain: this.get("storage.imgix.domain", "IMGIX_DOMAIN"),
        signKey: this.get("storage.imgix.sign_key", "IMGIX_SIGN_KEY"),
      },
      local: {
        uploadDir: this.get("storage.local.dir", "STORAGE_LOCAL_DIR", "./public/uploads"),
        baseUrl: this.get("storage.local.url", "STORAGE_LOCAL_URL", "/uploads"),
      },
    };
  }

  /**
   * Get email configuration
   */
  getEmailConfig(): EmailConfig {
    return {
      provider: this.get("email.provider", "EMAIL_PROVIDER", "smtp"),
      host: this.get("email.smtp.host", "SMTP_HOST"),
      port: parseInt(this.get("email.smtp.port", "SMTP_PORT", "587")!, 10),
      secure: this.get("email.smtp.secure", "SMTP_SECURE") === "true",
      user: this.get("email.smtp.user", "SMTP_USER"),
      pass: this.get("email.smtp.pass", "SMTP_PASS"),
      from: this.get("email.smtp.from", "SMTP_FROM", "noreply@example.com"),
      fromName: this.get("email.smtp.from_name", "SMTP_FROM_NAME", "Kyro CMS"),
      replyTo: this.get("email.smtp.reply_to", "SMTP_REPLY_TO"),
    };
  }

  /**
   * Mask sensitive values for display
   */
  maskSensitive(key: string, value: string | undefined): string | undefined {
    if (!value) return value;
    if (ConfigService.SENSITIVE_KEYS.includes(key)) {
      return "********";
    }
    return value;
  }

  /**
   * Update a setting in the database
   */
  async set(key: string, value: string, description?: string): Promise<void> {
    await this.db
      .insert(settingsSchema)
      .values({
        key,
        value,
        description,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [settingsSchema.key],
        set: { value, description, updatedAt: new Date() },
      });
    this.cache[key] = value;
  }
}
