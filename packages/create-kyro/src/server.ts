/**
 * Kyro CMS — Deploy Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal HTTP server exposing two endpoints:
 *
 *   POST /api/create       – scaffold a new Kyro project
 *   POST /api/deploy/cloudflare – deploy an existing project to Cloudflare
 *
 * Both endpoints return an SSE stream of DeployEvent / progress objects so
 * a deploy-button UI can show real-time logs.
 *
 * Usage (standalone):
 *   node --import tsx/esm src/server.ts
 *   # or build first:
 *   npx @kyro-cms/create serve --port 3099
 *
 * Usage (embedded in Astro / Express):
 *   import { createKyroHandler, deployCloudflareHandler } from '@kyro-cms/create/server';
 *   app.post('/api/deploy/cloudflare', deployCloudflareHandler);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import http from 'node:http';
import os from 'node:os';
import { createProject } from './headless.js';
import { deployCloudflare } from './deployers/cloudflare.js';
import type { CreateProjectOptions } from './headless.js';
import type { CloudflareDeployOptions, DeployEvent } from './deployers/cloudflare.js';

// ── Adapter → Cloudflare DB mode mapping ─────────────────────────────────────

/**
 * Maps the scaffold database adapter to the correct Cloudflare deployment mode.
 *
 * - sqlite  → d1      (D1 is serverless SQLite — a direct match)
 * - postgres → postgres (deployed via Cloudflare Hyperdrive)
 * - mongodb  → d1      (no native Cloudflare equivalent; falls back to D1)
 *
 * Returns the mode and an optional warning to surface to the user.
 */
function adapterToCloudflareDb(
  adapter: 'sqlite' | 'postgres' | 'mongodb'
): { mode: 'd1' | 'postgres'; warning?: string } {
  switch (adapter) {
    case 'sqlite':   return { mode: 'd1' };
    case 'postgres': return { mode: 'postgres' };
    case 'mongodb':
      return {
        mode: 'd1',
        warning:
          'MongoDB is not natively supported on Cloudflare Workers. ' +
          'Your project will be deployed using Cloudflare D1 (SQLite) instead. ' +
          'Update kyro.config.ts after deployment to switch adapters if needed.',
      };
  }
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function sendEvent(res: http.ServerResponse, event: DeployEvent | Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }
}

function sendDone(res: http.ServerResponse): void {
  res.write('event: close\ndata: {}\n\n');
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }
  res.end();
}

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/create
 * Body: CreateProjectOptions (JSON)
 * Response: SSE stream of progress events
 */
export async function createKyroHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  const body = (await parseBody(req)) as Partial<CreateProjectOptions>;
  res.writeHead(200, sseHeaders());
  res.write(': ping\n\n');
  if (typeof (res as any).flush === 'function') (res as any).flush();

  const result = await createProject({
    ...body,
    projectName: body.projectName ?? `kyro-app-${Date.now()}`,
    onProgress(step, detail) {
      sendEvent(res, { type: 'info', step, message: detail ?? step });
    },
  });

  sendEvent(res, {
    type: result.ok ? 'done' : 'error',
    step: 'done',
    message: result.ok ? `Project created at ${result.projectDir}` : result.error,
    data: result.ok ? {
      projectDir: result.projectDir,
      adminEmail: result.adminEmail,
      adminPassword: result.adminPassword,
    } : undefined,
  });

  sendDone(res);
}

/**
 * POST /api/deploy/cloudflare
 * Body: CloudflareDeployOptions (JSON)
 * Response: SSE stream of DeployEvent objects
 *
 * Example body:
 * {
 *   "projectDir": "/absolute/path/to/my-project",
 *   "projectName": "my-kyro-app",
 *   "database": "d1",
 *   "adminEmail": "admin@example.com",
 *   "cloudflareApiToken": "abc123..."
 * }
 */
export async function deployCloudflareHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  const body = (await parseBody(req)) as Partial<CloudflareDeployOptions>;
  res.writeHead(200, sseHeaders());
  res.write(': ping\n\n');
  if (typeof (res as any).flush === 'function') (res as any).flush();

  for await (const event of deployCloudflare(body as CloudflareDeployOptions)) {
    sendEvent(res, event);
    if (event.type === 'done' || event.type === 'error') break;
  }

  sendDone(res);
}

/**
 * POST /api/create-and-deploy
 * Scaffold + deploy in a single request — the full "one-click deploy" flow.
 * Body: CreateProjectOptions & CloudflareDeployOptions merged (JSON)
 */
export async function createAndDeployHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  type CombinedBody = Omit<Partial<CreateProjectOptions>, 'database'> & Partial<CloudflareDeployOptions>;
  const body = (await parseBody(req)) as CombinedBody;
  res.writeHead(200, sseHeaders());
  res.write(': ping\n\n');
  if (typeof (res as any).flush === 'function') (res as any).flush();

  // Phase 1 — Scaffold
  sendEvent(res, { type: 'info', step: 'scaffold', message: '🛠  Scaffolding Kyro CMS project…' });

  const scaffoldDb = body.database === 'postgres' ? 'postgres' : 'sqlite';
  const scaffoldResult = await createProject({
    projectName: body.projectName ?? `kyro-app-${Date.now()}`,
    database: scaffoldDb,
    template: (body.template as CreateProjectOptions['template']) ?? 'minimal',
    adminEmail: body.adminEmail,
    cwd: body.cwd ?? os.tmpdir(),
    onProgress(step, detail) {
      sendEvent(res, { type: 'info', step, message: detail ?? step });
    },
  });

  if (!scaffoldResult.ok) {
    sendEvent(res, { type: 'error', step: 'scaffold', message: scaffoldResult.error });
    sendDone(res);
    return;
  }

  sendEvent(res, { type: 'success', step: 'scaffold', message: `Project scaffolded at ${scaffoldResult.projectDir}` });

  // Phase 2 — Derive Cloudflare DB mode from the adapter used during scaffold
  const { mode: cfDb, warning: dbWarning } = adapterToCloudflareDb(scaffoldResult.database);
  if (dbWarning) {
    sendEvent(res, { type: 'warning', step: 'db', message: dbWarning });
  }

  // Phase 3 — Deploy
  sendEvent(res, { type: 'info', step: 'deploy', message: '☁️  Deploying to Cloudflare…' });

  for await (const event of deployCloudflare({
    projectDir: scaffoldResult.projectDir,
    projectName: body.projectName,
    r2Bucket: body.r2Bucket,
    // Use the adapter-derived mode; caller can still override via body.database
    database: (body.database as 'd1' | 'postgres' | undefined) ?? cfDb,
    databaseUrl: body.databaseUrl,
    hyperdriveName: body.hyperdriveName,
    adminEmail: scaffoldResult.adminEmail,
    adminPassword: scaffoldResult.adminPassword,
    cloudflareApiToken: body.cloudflareApiToken,
  })) {
    sendEvent(res, event);
    if (event.type === 'done' || event.type === 'error') break;
  }

  sendDone(res);
}

// ── Standalone server ──────────────────────────────────────────────────────────

const ROUTES: Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>> = {
  'POST /api/create': createKyroHandler,
  'POST /api/deploy/cloudflare': deployCloudflareHandler,
  'POST /api/create-and-deploy': createAndDeployHandler,
};

export function createServer(port = 3099): http.Server {
  const server = http.createServer(async (req, res) => {
    const key = `${req.method} ${req.url?.split('?')[0]}`;
    const handler = ROUTES[key];

    if (!handler) {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, service: 'kyro-deploy-server' }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', availableRoutes: Object.keys(ROUTES) }));
      return;
    }

    try {
      await handler(req, res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message ?? 'Internal error' }));
      }
    }
  });

  server.listen(port, () => {
    console.log(`\n  ⚡ Kyro Deploy Server running at http://localhost:${port}`);
    console.log(`  Routes:`);
    Object.keys(ROUTES).forEach(r => console.log(`    ${r}`));
    console.log(`    GET  /health\n`);
  });

  return server;
}

// Run standalone if called directly
const isMain = process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts');
if (isMain) {
  const port = parseInt(process.env.PORT ?? '3099', 10);
  createServer(port);
}
