import { promptUser, type Answers } from './prompts.js';
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

  const steps = [
    'Creating project directory',
    'Generating configuration files',
    'Installing dependencies',
    'Initializing git repository',
  ];

  logger.step(1, steps.length, steps[0]);
  mkdirSync(projectDir, { recursive: true });
  logger.success('Project directory created');

  logger.step(2, steps.length, steps[1]);

  const pkg = generatePackageJson(answers);
  writeFileSync(
    join(projectDir, 'package.json'),
    formatPackageJson(pkg)
  );
  logger.success('package.json generated');

  const kyroConfig = generateKyroConfig(answers);
  writeFileSync(join(projectDir, 'kyro.config.ts'), kyroConfig);
  logger.success('kyro.config.ts generated');

  const astroConfig = generateAstroConfig(answers);
  writeFileSync(join(projectDir, 'astro.config.mjs'), astroConfig);
  logger.success('astro.config.mjs generated');

  generateProjectFiles(answers, projectDir, { adminEmail: answers.adminEmail, adminPassword });
  logger.success('Project files generated');

  logger.step(3, steps.length, steps[2]);
  try {
    execSync('npm install', {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env, npm_config_loglevel: 'warn' }
    });
    logger.success('Dependencies installed');
  } catch (error) {
    logger.error('Failed to install dependencies');
    process.exit(1);
  }

  logger.step(4, steps.length, steps[3]);
  try {
    execSync('git init && git add . && git commit -m "Initial commit - created with create-kyro"', {
      cwd: projectDir,
      stdio: 'pipe'
    });
    logger.success('Git repository initialized');
  } catch {
    logger.warning('Could not initialize git repository');
  }

  logger.done();
}

main().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
