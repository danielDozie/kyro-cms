import { SQLiteAuthAdapter } from "./sqlite-adapter.js";
import { EmailTransport, type EmailConfig } from "./nodemailer-transport.js";
import { PasswordPolicy } from "./security/password-policy.js";
import type { AuthUser, UserRole, AuthAdapter } from "./types.js";

export interface BootstrapConfig {
  authAdapter?: AuthAdapter;
  authDbPath?: string;
  adminEmail: string;
  adminPassword: string;
  adminRole?: string;
  tenantId?: string;
  emailConfig?: EmailConfig;
  sendWelcomeEmail?: boolean;
}

export interface BootstrapResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export async function bootstrapAdmin(
  config: BootstrapConfig,
): Promise<BootstrapResult> {
  const {
    adminEmail,
    adminPassword,
    adminRole = "super_admin",
    tenantId,
    emailConfig,
    sendWelcomeEmail = false,
  } = config;

  const authAdapter =
    config.authAdapter ||
    new SQLiteAuthAdapter({
      path: config.authDbPath || "./data/auth.db",
    });

  try {
    await authAdapter.connect?.();
  } catch (error) {
    return {
      success: false,
      error: "Failed to connect to auth storage",
    };
  }

  const passwordPolicy = new PasswordPolicy();
  const passwordValidation = passwordPolicy.validate(adminPassword);
  if (!passwordValidation.valid) {
    await authAdapter.disconnect?.();
    return {
      success: false,
      error: `Invalid password: ${passwordValidation.errors.join(", ")}`,
    };
  }

  const existingUser = await authAdapter.findUserByEmail(adminEmail);
  if (existingUser) {
    await authAdapter.disconnect?.();
    return {
      success: false,
      error: "Admin user already exists",
    };
  }

  try {
    const user = await authAdapter.createUser({
      name: "Super Admin",
      email: adminEmail,
      password: adminPassword,
      role: (adminRole as UserRole) || "admin",
      tenantId,
    });

    await authAdapter.updateUser?.(user.id, {
      emailVerified: true,
    });

    if (sendWelcomeEmail && emailConfig) {
      const emailTransport = new EmailTransport(emailConfig);
      const templates = emailTransport.getTemplates();
      const welcomeTemplate = templates.welcome(adminEmail.split("@")[0]);
      await emailTransport.send({
        to: adminEmail,
        ...welcomeTemplate,
      });
    }

    await authAdapter.disconnect?.();
    return {
      success: true,
      user,
    };
  } catch (error) {
    await authAdapter.disconnect?.();
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create admin user",
    };
  }
}

export async function checkBootstrapRequired(
  authAdapter: AuthAdapter,
  adminEmail: string,
): Promise<boolean> {
  const existingUser = await authAdapter.findUserByEmail(adminEmail);
  return !existingUser;
}

export function buildBootstrapConfig(
  envVars: Record<string, string | undefined>,
): BootstrapConfig | null {
  const email = envVars.KYRO_ADMIN_EMAIL;
  const password = envVars.KYRO_ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return {
    authDbPath: envVars.KYRO_AUTH_DB_PATH || "./data/auth.db",
    adminEmail: email,
    adminPassword: password,
    adminRole: envVars.KYRO_ADMIN_ROLE || "super_admin",
    tenantId: envVars.KYRO_ADMIN_TENANT_ID,
    emailConfig: envVars.SMTP_HOST
      ? {
          provider: "smtp",
          smtp: {
            host: envVars.SMTP_HOST,
            port: parseInt(envVars.SMTP_PORT || "587", 10),
            secure: envVars.SMTP_SECURE === "true",
            auth: {
              user: envVars.SMTP_USER || "",
              pass: envVars.SMTP_PASS || "",
            },
          },
          from: envVars.SMTP_FROM || "noreply@example.com",
          fromName: envVars.SMTP_FROM_NAME,
        }
      : undefined,
    sendWelcomeEmail: envVars.KYRO_ADMIN_SEND_WELCOME === "true",
  };
}

export function getBootstrapFromEnv(): BootstrapConfig | null {
  return buildBootstrapConfig(process.env as Record<string, string | undefined>);
}

/**
 * Read bootstrap credentials from the Cloudflare `cloudflare:workers` env binding.
 * On Workers, secrets/vars live on the env binding; they are NOT guaranteed to be
 * present on `process.env`. Dynamic import + try/catch keeps this safe on Node too.
 */
async function getBootstrapFromCloudflareEnv(): Promise<BootstrapConfig | null> {
  try {
    const { env: cfEnv } = await import("cloudflare:workers");
    if (cfEnv) {
      const config = buildBootstrapConfig(cfEnv);
      if (config) return config;
    }
  } catch {}
  return null;
}

export async function autoBootstrap(
  authAdapter?: AuthAdapter,
): Promise<BootstrapResult | null> {
  const config = getBootstrapFromEnv() || (await getBootstrapFromCloudflareEnv());
  if (!config) {
    return null;
  }

  if (authAdapter) {
    config.authAdapter = authAdapter;
  }

  // Check if bootstrap is actually needed before connecting
  try {
    await config.authAdapter?.connect?.();
    const existingUser = await config.authAdapter?.findUserByEmail(config.adminEmail);
    if (existingUser) {
      await config.authAdapter?.disconnect?.();
      return { success: false, error: "Admin user already exists" };
    }
  } catch {
    // Connection failed — let bootstrapAdmin handle the error
  }

  const result = await bootstrapAdmin(config);

  if (result.success) {
  } else {
    console.error(`Bootstrap failed: ${result.error}`);
  }

  return result;
}

export async function bootstrapWithRetry(
  config: BootstrapConfig,
  maxRetries: number = 3,
  retryDelayMs: number = 2000,
): Promise<BootstrapResult> {
  let lastError: string = "";

  for (let i = 0; i < maxRetries; i++) {
    const result = await bootstrapAdmin(config);

    if (result.success) {
      return result;
    }

    lastError = result.error || "Unknown error";

    if (lastError.includes("already exists")) {
      return result;
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} retries: ${lastError}`,
  };
}
