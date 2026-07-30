import { promptUser, type Answers } from './prompts.js';
import { spinner } from '@clack/prompts';
import { logger } from './utils/logger.js';
import { generatePackageJson, formatPackageJson } from './generators/packagejson.js';
import { generateKyroConfig } from './generators/config.js';
import { generateAstroConfig } from './generators/astro.js';
import { generateProjectFiles } from './generators/files.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

function generatePassword(length = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

const VERSION = '0.4.0';

async function main() {
  logger.intro('create-kyro', VERSION);

  const answers = await promptUser();
  const projectDir = join(process.cwd(), answers.projectName);

  if (existsSync(projectDir)) {
    logger.error(`Directory "${answers.projectName}" already exists.`);
    process.exit(1);
  }

  const adminPassword = generatePassword();

  const s = spinner();

  s.start('Step 1/4: Creating project directory...');
  mkdirSync(projectDir, { recursive: true });
  s.message('Step 2/4: Generating configuration files...');

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

  s.message('Step 3/4: Installing dependencies (this may take a minute)...');
  try {
    execSync('npm install', {
      cwd: projectDir,
      stdio: 'pipe',
      env: { ...process.env, npm_config_loglevel: 'warn' }
    });
  } catch (error) {
    s.stop('Failed to install dependencies');
    process.exit(1);
  }

  s.message('Step 4/4: Initializing git repository...');
  try {
    execSync('git init && git add . && git commit -m "Initial commit - created with create-kyro"', {
      cwd: projectDir,
      stdio: 'pipe'
    });
  } catch {
    // Ignore git errors if git is not installed
  }

  s.stop('Project initialization complete!');

  console.log('\n=========================================');
  console.log('🎉 Kyro CMS App Created Successfully!');
  console.log('=========================================');
  console.log(`\nNext steps:`);
  console.log(`  1. cd ${answers.projectName}`);
  console.log(`  2. pnpm dev (or npm run dev)\n`);
  console.log('🔑 Super Admin Credentials (Local):');
  console.log(`  Email:    ${answers.adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('\n(These have been saved to your .env.local file)');
  console.log('=========================================\n');
}

main().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
