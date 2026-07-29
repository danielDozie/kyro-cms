/**
 * Kyro CMS — Cloudflare programmatic deployer
 * ─────────────────────────────────────────────────────────────────────────────
 * Node.js equivalent of deploy-cloudflare.sh.  Runs the full Cloudflare
 * provisioning flow (D1 / Hyperdrive, R2, wrangler deploy) and emits
 * structured progress events so callers can stream them to the browser.
 *
 * Usage:
 *   import { deployCloudflare } from 'create-kyro/deployers/cloudflare';
 *   for await (const event of deployCloudflare({ projectDir, projectName, ... })) {
 *     console.log(event);
 *   }
 */

import { execSync, exec } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { promisify } from 'util';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeployEventType =
  | 'info'      // neutral progress message
  | 'success'   // step completed OK
  | 'warning'   // non-fatal issue
  | 'error'     // fatal — deployment aborted
  | 'done';     // final summary

export interface DeployEvent {
  type: DeployEventType;
  step: string;
  message: string;
  data?: Record<string, string>;
}

export interface CloudflareDeployOptions {
  /** Absolute path to the scaffolded project */
  projectDir: string;
  /** Cloudflare Workers project name */
  projectName?: string;
  /** R2 bucket name */
  r2Bucket?: string;
  /** 'd1' (default) or 'postgres' */
  database?: 'd1' | 'postgres';
  /** Required when database = 'postgres' */
  databaseUrl?: string;
  /** Cloudflare Hyperdrive name (postgres only) */
  hyperdriveName?: string;
  /** Super-admin email */
  adminEmail?: string;
  /** Super-admin password (auto-generated if omitted) */
  adminPassword?: string;
  /** Cloudflare API token (falls back to CLOUDFLARE_API_TOKEN env var) */
  cloudflareApiToken?: string;
  /** Package manager executable to run build step (defaults to 'npm') */
  packager?: string;
}

export interface CloudflareDeployResult {
  ok: boolean;
  liveUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
  d1Id?: string;
  r2Bucket?: string;
  error?: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function randomSuffix(): string {
  return randomBytes(3).toString('hex');
}

function randomPassword(): string {
  return randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
}

const execAsync = promisify(exec);

async function run(cmd: string, cwd: string, env?: NodeJS.ProcessEnv): Promise<string> {
  const cleanEnv = { ...process.env, ...env };
  for (const key of Object.keys(cleanEnv)) {
    const k = key.toLowerCase();
    if (k.startsWith('npm_') || k.startsWith('pnpm_') || k === 'npm_config_user_agent') {
      delete cleanEnv[key];
    }
  }
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd, env: cleanEnv });
    return (stdout ?? '') + (stderr ?? '');
  } catch (err: any) {
    return (err?.stdout ?? '') + (err?.stderr ?? '') + (err?.message ?? '');
  }
}

async function runOrEmpty(cmd: string, cwd: string, env?: NodeJS.ProcessEnv): Promise<string> {
  try { return await run(cmd, cwd, env); } catch { return ''; }
}

/**
 * Verify a Cloudflare token and resolve the primary account ID in one shot.
 * Works for both scoped API Tokens AND OAuth Bearer tokens regardless of
 * whether the token has user:read scope.
 *
 * Strategy (each step is a fast REST call, falls through on failure):
 *  1. GET /accounts?per_page=1      — works for any token with account access
 *  2. GET /user/tokens/verify       — API tokens only (not OAuth)
 *  3. GET /user                     — tokens with user:read scope
 *
 * Returns { ok: true, email, accountId } or { ok: false, error }.
 */
async function verifyAndResolveAccount(
  token: string
): Promise<{ ok: true; email: string; accountId: string } | { ok: false; error: string }> {
  let accountId = '';
  let email = '';

  // ── Step 1: /accounts — the most permissive check, works for all token types
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = (await r.json()) as any;
    if (j?.success && Array.isArray(j.result) && j.result.length > 0) {
      accountId = j.result[0]?.id ?? '';
    } else if (j?.errors?.[0]?.message) {
      // Definitive auth failure from the most permissive endpoint
      return { ok: false, error: j.errors[0].message };
    }
  } catch { /* network error — fall through */ }

  // If we couldn't even reach accounts, try token verify as a last resort
  if (!accountId) {
    try {
      const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await r.json()) as any;
      if (j?.result?.status !== 'active') {
        const msg = j?.errors?.[0]?.message ?? 'Token is not active';
        return { ok: false, error: msg };
      }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Network error during token verification' };
    }
  }

  // ── Step 2: /user — best-effort to get email (not always available)
  try {
    const u = await fetch('https://api.cloudflare.com/client/v4/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ud = (await u.json()) as any;
    if (ud?.result?.email) email = ud.result.email;
  } catch { /* non-fatal */ }

  if (!accountId) {
    return { ok: false, error: 'Could not resolve Cloudflare account. Ensure your token has account:read permission.' };
  }

  return { ok: true, email: email || 'Cloudflare user', accountId };
}

function extractWorkerUrl(text: string): string {
  const m = text.match(/(https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i);
  return m ? m[1] : '';
}

function resolveWrangler(cwd: string): string {
  const localBin = join(cwd, 'node_modules', '.bin', 'wrangler');
  if (existsSync(localBin)) return `"${localBin}"`;
  const rootBin = join(cwd, '..', '..', 'node_modules', '.bin', 'wrangler');
  if (existsSync(rootBin)) return `"${rootBin}"`;
  try {
    execSync('wrangler --version', { stdio: 'ignore' });
    return 'wrangler';
  } catch {
    return 'npx --yes wrangler';
  }
}

// ── Cloudflare REST API helpers ───────────────────────────────────────────────

const CF_API = 'https://api.cloudflare.com/client/v4';

/**
 * Generic Cloudflare REST API call.
 * Returns the parsed JSON body. Throws on non-2xx with the CF error message.
 */
async function cfApi<T = any>(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${CF_API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json()) as any;
  if (!json.success) {
    const msg = json.errors?.[0]?.message ?? `CF API error on ${method} ${path}`;
    throw new Error(msg);
  }
  return json as T;
}

/**
 * Resolves the primary Cloudflare account ID for the given token.
 * Cached per call — called once during auth then passed through.
 */
async function getAccountId(token: string): Promise<string> {
  const res = await cfApi<any>(token, 'GET', 'accounts?per_page=1');
  const id = res.result?.[0]?.id ?? '';
  if (!id) throw new Error('Could not resolve Cloudflare account ID from token.');
  return id;
}

/** Provision (or find) a D1 database by name. Returns its UUID. */
async function provisionD1(
  token: string, accountId: string, name: string
): Promise<string> {
  // Try to create it
  try {
    const r = await cfApi<any>(token, 'POST', `accounts/${accountId}/d1/database`, { name });
    return r.result?.uuid ?? r.result?.id ?? '';
  } catch (e: any) {
    // Only swallow if it already exists
    if (!e.message?.toLowerCase().includes('already exists')) {
      throw e;
    }
    // Already exists — look it up
    const list = await cfApi<any>(token, 'GET', `accounts/${accountId}/d1/database?per_page=100`);
    const found = (list.result as any[])?.find((db: any) => db.name === name);
    return found?.uuid ?? found?.id ?? '';
  }
}

/** Provision (or find) an R2 bucket. */
async function provisionR2(token: string, accountId: string, name: string): Promise<void> {
  try {
    await cfApi(token, 'POST', `accounts/${accountId}/r2/buckets`, { name });
  } catch (e: any) {
    // Bucket already exists — not an error
    if (!e.message?.toLowerCase().includes('already exists')) throw e;
  }
}

/**
 * Execute a SQL statement against a D1 database via REST API.
 * Dramatically faster than spawning `wrangler d1 execute --remote`.
 */
async function executeD1Sql(
  token: string, accountId: string, databaseId: string, sql: string
): Promise<void> {
  // Split on semicolons — D1 REST API runs one statement per request
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  // Run all statements sequentially (DDL must complete before INSERTs)
  for (const stmt of statements) {
    await cfApi(token, 'POST', `accounts/${accountId}/d1/database/${databaseId}/raw`, {
      sql: stmt + ';',
      params: [],
    });
  }
}

/** Provision Hyperdrive (or find existing one by name). Returns its ID. */
async function provisionHyperdrive(
  token: string, accountId: string, name: string, connectionString: string
): Promise<string> {
  try {
    const r = await cfApi<any>(token, 'POST', `accounts/${accountId}/hyperdrive/configs`, {
      name,
      origin: { connection_string: connectionString },
    });
    return r.result?.id ?? '';
  } catch {
    // Already exists — list and find
    const list = await cfApi<any>(token, 'GET', `accounts/${accountId}/hyperdrive/configs`);
    const found = (list.result as any[])?.find((h: any) => h.name === name);
    return found?.id ?? '';
  }
}

// ── Async generator ───────────────────────────────────────────────────────────

/**
 * Runs the full Cloudflare deployment flow.
 * Yields DeployEvent objects as steps complete.
 * The final event is always type 'done' or 'error'.
 *
 * @example
 * for await (const event of deployCloudflare(options)) {
 *   sendSSE(event);  // stream to browser
 *   if (event.type === 'done' || event.type === 'error') break;
 * }
 */
export async function* deployCloudflare(
  options: CloudflareDeployOptions
): AsyncGenerator<DeployEvent, CloudflareDeployResult> {
  const suffix = randomSuffix();
  const {
    projectDir,
    projectName      = `kyro-app-${suffix}`,
    r2Bucket         = `kyro-media-${suffix}`,
    database         = 'd1',
    databaseUrl      = '',
    hyperdriveName   = `kyro-postgres-hd-${suffix}`,
    adminEmail       = 'admin@kyro-cms.com',
    adminPassword    = randomPassword(),
    cloudflareApiToken,
    packager         = 'npm',
  } = options;

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...(cloudflareApiToken ? { CLOUDFLARE_API_TOKEN: cloudflareApiToken } : {}),
  };

  const wrangler = resolveWrangler(projectDir);

  const emit = (type: DeployEventType, step: string, message: string, data?: Record<string, string>): DeployEvent =>
    ({ type, step, message, data });

  // ── 1. Auth check ─────────────────────────────────────────────────────────
  yield emit('info', 'auth', 'Verifying Cloudflare credentials…');

  // Resolve the effective token: explicit option → env var
  const effectiveToken = cloudflareApiToken || process.env.CLOUDFLARE_API_TOKEN || '';

  let accountId = '';

  if (effectiveToken) {
    // Fast path: verify token + resolve account ID in a single REST call.
    // Works for API tokens AND OAuth tokens regardless of user:read scope.
    const verify = await verifyAndResolveAccount(effectiveToken);
    if (!verify.ok) {
      yield emit('error', 'auth', `Invalid Cloudflare token: ${verify.error}. Generate one at https://dash.cloudflare.com/profile/api-tokens`);
      return { ok: false, error: `Token verification failed: ${verify.error}` };
    }
    accountId = verify.accountId;
    yield emit('success', 'auth', `Cloudflare authenticated as ${verify.email} ✓`);
  } else {
    // Fallback: check if wrangler has an OAuth session (wrangler login).
    const whoami = await runOrEmpty(`${wrangler} whoami`, projectDir, env);
    const lower = whoami.toLowerCase();
    const authed = lower.includes('you are logged in') ||
                   lower.includes('api token') ||
                   lower.includes('oauth token') ||
                   lower.includes('logged in');
    if (!authed) {
      yield emit('error', 'auth',
        'Not authenticated with Cloudflare. ' +
        'Provide a cloudflareApiToken or set CLOUDFLARE_API_TOKEN, or run `wrangler login` locally.');
      return { ok: false, error: 'Cloudflare authentication failed' };
    }
    yield emit('success', 'auth', 'Cloudflare authenticated via wrangler session ✓');
  }


  // ── 2 & 3. Database + R2 provisioning (parallel) ──────────────────────────
  let d1Id = '';
  const d1Name = `${projectName}-d1`;
  let hyperId = '';

  yield emit('info', 'provision', 'Provisioning database and storage (parallel)…');

  if (database === 'postgres') {
    if (!databaseUrl) {
      yield emit('error', 'db', 'databaseUrl is required when database = "postgres"');
      return { ok: false, error: 'Missing databaseUrl' };
    }
    // Hyperdrive + R2 in parallel
    let hId: any;
    try {
      const [resolvedHId] = await Promise.all([
        effectiveToken
          ? provisionHyperdrive(effectiveToken, accountId, hyperdriveName, databaseUrl)
          : runOrEmpty(`${wrangler} hyperdrive create ${hyperdriveName} --connection-string="${databaseUrl}"`, projectDir, env)
              .then(out => { const m = out.match(/id[":\s]+([a-f0-9-]{36})/i); return m?.[1] ?? ''; }),
        effectiveToken
          ? provisionR2(effectiveToken, accountId, r2Bucket)
          : runOrEmpty(`${wrangler} r2 bucket create "${r2Bucket}"`, projectDir, env).then(() => undefined),
      ]);
      hId = resolvedHId;
    } catch (err: any) {
      yield emit('error', 'provision', `Provisioning failed: ${err?.message}`);
      return { ok: false, error: `Provisioning failed: ${err?.message}` };
    }
    hyperId = String(hId);
    yield emit('success', 'provision', `Hyperdrive "${hyperdriveName}" + R2 "${r2Bucket}" ready`);

  } else {
    // D1 + R2 in parallel via REST API
    let dId: any;
    try {
      const [resolvedDId] = await Promise.all([
        effectiveToken
          ? provisionD1(effectiveToken, accountId, d1Name)
          : runOrEmpty(`${wrangler} d1 create "${d1Name}" 2>&1`, projectDir, env)
              .then(out => { const m = out.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i); return m?.[1] ?? ''; }),
        effectiveToken
          ? provisionR2(effectiveToken, accountId, r2Bucket)
          : runOrEmpty(`${wrangler} r2 bucket create "${r2Bucket}"`, projectDir, env).then(() => undefined),
      ]);
      dId = resolvedDId;
    } catch (err: any) {
      yield emit('error', 'provision', `Provisioning failed: ${err?.message}`);
      return { ok: false, error: `Provisioning failed: ${err?.message}` };
    }
    d1Id = String(dId);
    if (d1Id) {
      yield emit('success', 'provision', `D1 "${d1Name}" (${d1Id}) + R2 "${r2Bucket}" ready`);
    } else {
      yield emit('warning', 'provision', `D1 provisioned but ID unknown — wrangler.toml may need manual edit.`);
    }
  }

  // ── 4. wrangler.toml ──────────────────────────────────────────────────────
  yield emit('info', 'config', 'Writing wrangler.toml…');
  const wranglerToml = database === 'postgres'
    ? `name = "${projectName}"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "${hyperId}"

[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "${r2Bucket}"
`
    : `name = "${projectName}"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "${d1Name}"
database_id = "${d1Id}"

[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "${r2Bucket}"
`;
  writeFileSync(join(projectDir, 'wrangler.toml'), wranglerToml);
  yield emit('success', 'config', 'wrangler.toml written');

  // ── 5. Schema migration & admin seed ─────────────────────────────────────
  yield emit('info', 'migrate', 'Running schema migration & seeding super admin…');
  if (database === 'd1') {
    const schemaSql = [
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT, role TEXT DEFAULT 'customer', email_verified INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL, expires_at TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `INSERT OR IGNORE INTO users (id, email, password_hash, role, email_verified) VALUES ('admin-super-1', '${adminEmail}', '${adminPassword}', 'super_admin', 1)`,
    ];
    if (effectiveToken && d1Id) {
      // Fast path: REST API (no subprocess, all statements in parallel)
      await executeD1Sql(effectiveToken, accountId, d1Id, schemaSql.join(';'));
    } else {
      // Fallback: wrangler CLI
      const combined = schemaSql.join('; ').replace(/'/g, "\\'");
      await runOrEmpty(`${wrangler} d1 execute "${d1Name}" --remote --command="${combined}"`, projectDir, env);
    }
  }
  yield emit('success', 'migrate', 'Schema migrated, super admin seeded');

  // ── 6. Configure & Build ──────────────────────────────────────────────────
  yield emit('info', 'build', 'Configuring Cloudflare adapter & building project…');
  try {
    // 1. Manually inject the Cloudflare adapter into astro.config.mjs to guarantee it works.
    const configPath = join(projectDir, 'astro.config.mjs');
    if (existsSync(configPath)) {
      let configStr = readFileSync(configPath, 'utf8');
      if (!configStr.includes('@astrojs/cloudflare')) {
        configStr = `import cloudflare from '@astrojs/cloudflare';\n` + configStr;
        configStr = configStr.replace(
          'export default defineConfig({',
          'export default defineConfig({\n  adapter: cloudflare(),'
        );
        writeFileSync(configPath, configStr);
      }
    }

    // 2. Inject Cloudflare D1 adapter into kyro.config.ts
    const kyroConfigPath = join(projectDir, 'kyro.config.ts');
    if (existsSync(kyroConfigPath) && database === 'd1') {
      let kyroConfigStr = readFileSync(kyroConfigPath, 'utf8');
      
      // Inject imports if not present
      if (kyroConfigStr.includes('createLocalAdapter')) {
        kyroConfigStr = kyroConfigStr.replace(
          /import\s*\{\s*createLocalAdapter\s*\}\s*from\s*['"]@kyro-cms\/core['"];?/,
          "import { createDrizzleAdapter } from '@kyro-cms/core';"
        );
        kyroConfigStr = kyroConfigStr.replace(
          /adapter:\s*createLocalAdapter\(\{[^}]+\}\),/,
          `adapter: createDrizzleAdapter({ type: 'sqlite', client: (globalThis as any).DB || (process.env as any).DB }),`
        );
      }
      
      writeFileSync(kyroConfigPath, kyroConfigStr);
    }

    // 3. Packages are now installed by default during scaffolding, so no need to install here.
  } catch (err: any) {
    yield emit('warning', 'build', `Could not auto-configure adapter: ${err?.message}`);
  }

  try {
    await run(`${packager} run build`, projectDir, { ...env, CLOUDFLARE: 'true' });
    yield emit('success', 'build', 'Build complete');
  } catch (err: any) {
    yield emit('error', 'build', `Build failed: ${err?.message}`);
    return { ok: false, error: `Build failed: ${err?.message}` };
  }

  // ── 7. Deploy ─────────────────────────────────────────────────────────────
  yield emit('info', 'deploy', 'Deploying to Cloudflare Workers…');
  let deployOut = '';
  try {
    deployOut = await runOrEmpty(`${wrangler} deploy 2>&1`, projectDir, env);
  } catch (err: any) {
    yield emit('error', 'deploy', `Deploy failed: ${err?.message}`);
    return { ok: false, error: `Deploy failed: ${err?.message}` };
  }

  if (deployOut.toLowerCase().includes('error') && !deployOut.includes('workers.dev')) {
    yield emit('error', 'deploy', `Deploy encountered errors: ${deployOut.slice(0, 300)}`);
    return { ok: false, error: deployOut };
  }

  const liveUrl = extractWorkerUrl(deployOut) || `https://${projectName}.workers.dev`;
  yield emit('success', 'deploy', `Deployed → ${liveUrl}`);

  // ── Done ──────────────────────────────────────────────────────────────────
  yield emit('done', 'done', `Kyro CMS live at ${liveUrl}/admin`, {
    liveUrl,
    adminDashboard: `${liveUrl}/admin`,
    adminEmail,
    adminPassword,
    d1Id,
    r2Bucket,
  });

  return { ok: true, liveUrl, adminEmail, adminPassword, d1Id, r2Bucket };
}
