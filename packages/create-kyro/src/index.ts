import { promptUser, type Answers } from './prompts.js';
import { spinner } from '@clack/prompts';
import { logger } from './utils/logger.js';
import { generatePackageJson, formatPackageJson } from './generators/packagejson.js';
import { generateKyroConfig } from './generators/config.js';
import { generateAstroConfig } from './generators/astro.js';
import { generateProjectFiles } from './generators/files.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

function generatePassword(length = 24): string {
  // Exclude '#' as it acts as a comment delimiter in .env files
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$%^&*()';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

function getPackageManager(): string {
  const userAgent = process.env.npm_config_user_agent;
  if (!userAgent) return 'npm';
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('bun')) return 'bun';
  if (userAgent.startsWith('yarn')) return 'yarn';
  return 'npm';
}

const VERSION = '0.12.74';

async function main() {
  logger.intro('@kyro-cms/create', VERSION);

  const answers = await promptUser();
  const projectDir = answers.targetDir ? resolve(answers.targetDir) : resolve(process.cwd(), answers.projectName);

  if (existsSync(projectDir)) {
    logger.error(`Directory "${answers.projectName}" already exists.`);
    process.exit(1);
  }

  const adminPassword = generatePassword();

  const s = spinner();

  s.start('Step 1/3: Creating project directory...');
  mkdirSync(projectDir, { recursive: true });
  s.message('Step 2/3: Generating configuration files...');

  const pkg = generatePackageJson(answers);
  writeFileSync(
    join(projectDir, 'package.json'),
    formatPackageJson(pkg)
  );

  const kyroConfig = generateKyroConfig(answers);
  writeFileSync(join(projectDir, 'kyro.config.ts'), kyroConfig);

  const astroConfig = generateAstroConfig(answers);
  writeFileSync(join(projectDir, 'astro.config.mjs'), astroConfig);

  generateProjectFiles(answers, projectDir, { adminEmail: answers.adminEmail, adminPassword });

  s.message('Step 3/3: Initializing git repository...');
  try {
    await execAsync('git init && git add . && git commit -m "Initial commit - created with @kyro-cms/create"', {
      cwd: projectDir
    });
  } catch {
    // Ignore git errors if git is not installed
  }

  s.stop('Project initialization complete!');

  const pkgManager = getPackageManager();
  const runCmd = pkgManager === 'npm' ? 'npm run' : pkgManager;

  const nextSteps: string[] = [
    `cd ${answers.projectName}`,
  ];

  if (answers.database !== 'sqlite') {
    const envVar = answers.database === 'postgres' ? 'DATABASE_URL' : 'MONGODB_URI';
    nextSteps.push(`Configure ${envVar} in your .env file`);
  }

  nextSteps.push(`${pkgManager} install`);
  nextSteps.push(`${runCmd} dev`);

  console.log('\n=========================================');
  console.log('🎉 Kyro CMS App Created Successfully!');
  console.log('=========================================');
  console.log(`\nNext steps:`);
  nextSteps.forEach((step, idx) => {
    console.log(`  ${idx + 1}. ${step}`);
  });
  console.log();

  if (answers.database !== 'sqlite') {
    const dbName = answers.database === 'postgres' ? 'PostgreSQL' : 'MongoDB';
    const envVar = answers.database === 'postgres' ? 'DATABASE_URL' : 'MONGODB_URI';
    console.log(`ℹ️  Database Setup (${dbName}):`);
    console.log(`  Set your ${envVar} in .env before starting the server.\n`);
  }

  console.log('🔑 Super Admin Credentials (Local):');
  console.log(`  Email:    ${answers.adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('\n(These have been saved to your .env file)');
  console.log('=========================================\n');
}

main().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
