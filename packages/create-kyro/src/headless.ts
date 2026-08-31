/**
 * @kyro-cms/create headless API
 * ─────────────────────────────────────────────────────────────────────────────
 * Programmatic interface for scaffolding a Kyro CMS project without any
 * interactive prompts.  Designed to be called from deploy-button servers,
 * CI pipelines, or any automated workflow.
 *
 * Usage:
 *   import { createProject } from '@kyro-cms/create/headless';
 *   const result = await createProject({ projectName: 'my-app', ... });
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { generatePackageJson, formatPackageJson } from './generators/packagejson.js';
import { generateKyroConfig } from './generators/config.js';
import { generateAstroConfig } from './generators/astro.js';
import { generateProjectFiles } from './generators/files.js';
import type { Answers } from './prompts.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateProjectOptions {
  /** Project folder name / npm package name */
  projectName: string;
  /** Database adapter to use */
  database?: 'sqlite' | 'postgres' | 'mongodb';
  /** Starter template */
  template?: Answers['template'];
  /** Initial super-admin email */
  adminEmail?: string;
  /** Working directory to create the project in (default: cwd) */
  cwd?: string;
  /** Progress callback — receives human-readable step messages */
  onProgress?: (step: string, detail?: string) => void;
  /**
   * Optional custom installer. When provided, replaces the default `npm install`
   * step. Useful for the deploy server to inject pnpm/bun for faster installs.
   */
  installer?: (projectDir: string, onProgress: (step: string, detail?: string) => void) => Promise<void>;
}

export interface CreateProjectResult {
  ok: boolean;
  projectDir: string;
  adminEmail: string;
  adminPassword: string;
  /** The adapter the project was scaffolded with */
  database: 'sqlite' | 'postgres' | 'mongodb';
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generatePassword(length = 20): string {
  // Exclude '#' as it acts as a comment delimiter in .env files
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$%^&*';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function noop() {}

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Scaffold a new Kyro CMS project programmatically.
 * Equivalent to running `pnpm create @kyro-cms@latest <projectName>` and
 * accepting all prompts automatically.
 */
export async function createProject(
  options: CreateProjectOptions
): Promise<CreateProjectResult> {
  const {
    projectName,
    database = 'sqlite',
    template = 'minimal',
    adminEmail = `admin@${projectName}.local`,
    cwd = process.cwd(),
    onProgress = noop,
    installer,
  } = options;

  const projectDir = resolve(cwd, projectName);
  const adminPassword = generatePassword();

  try {
    // ── Step 1: Create directory ──────────────────────────────────────────────
    onProgress('scaffold', `Creating project directory: ${projectDir}`);
    if (existsSync(projectDir)) {
      return { ok: false, projectDir, adminEmail, adminPassword, database, error: `Directory "${projectName}" already exists.` };
    }
    mkdirSync(projectDir, { recursive: true });

    // ── Step 2: Build answers object (mirrors interactive prompts shape) ───────
    const answers: Answers = { projectName, database, template, adminEmail };

    // ── Step 3: Generate files ────────────────────────────────────────────────
    onProgress('scaffold', 'Generating package.json');
    const pkg = generatePackageJson(answers);
    writeFileSync(join(projectDir, 'package.json'), formatPackageJson(pkg));

    onProgress('scaffold', 'Generating kyro.config.ts');
    writeFileSync(join(projectDir, 'kyro.config.ts'), generateKyroConfig(answers));

    onProgress('scaffold', 'Generating astro.config.mjs');
    writeFileSync(join(projectDir, 'astro.config.mjs'), generateAstroConfig(answers));

    onProgress('scaffold', 'Generating project files');
    generateProjectFiles(answers, projectDir, { adminEmail, adminPassword });

    // ── Step 4: Install dependencies ──────────────────────────────────────────
    if (installer) {
      // Fast path: use caller-provided installer (e.g. pnpm with warm store)
      await installer(projectDir, onProgress);
    } else {
      // Default: npm with offline-first flags
      onProgress('install', 'Installing npm dependencies (this may take a minute)…');
      await new Promise<void>((resolve, reject) => {
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const child = spawn(npmCmd, [
          'install',
          '--prefer-offline',       // use local cache before hitting registry
          '--no-audit',             // skip security audit network call
          '--no-fund',              // skip funding check network call
          '--ignore-scripts',       // already present — skip post-install scripts
          '--legacy-peer-deps',     // already present — relax peer dep resolution
        ], {
          cwd: projectDir,
          shell: false,
          env: { ...process.env, npm_config_loglevel: 'error' },
        });
        child.stdout?.on('data', (d) => onProgress('install', d.toString().trim()));
        child.stderr?.on('data', (d) => onProgress('install', d.toString().trim()));
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`npm install failed with code ${code}`));
        });
        child.on('error', reject);
      });
    }

    // ── Step 5: Git init ──────────────────────────────────────────────────────
    onProgress('git', 'Initializing git repository');
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('git', ['init'], { cwd: projectDir });
        child.on('close', (code) => (code === 0 ? resolve() : reject()));
        child.on('error', reject);
      });
    } catch {
      // Non-fatal — git may not be available in all environments
    }

    onProgress('done', `Project "${projectName}" ready at ${projectDir}`);
    return { ok: true, projectDir, adminEmail, adminPassword, database };

  } catch (err: any) {
    return { ok: false, projectDir, adminEmail, adminPassword, database, error: err?.message ?? String(err) };
  }
}
