#!/usr/bin/env node
import * as path from 'node:path';
import * as fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createMcpServer } from '../server.js';

async function main() {
  const args = process.argv.slice(2);
  let configPath = path.resolve(process.cwd(), 'kyro.config.ts');

  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    configPath = path.resolve(process.cwd(), args[configIndex + 1]);
  } else if (!fs.existsSync(configPath)) {
    const jsPath = path.resolve(process.cwd(), 'kyro.config.js');
    const mjsPath = path.resolve(process.cwd(), 'kyro.config.mjs');
    if (fs.existsSync(jsPath)) {
      configPath = jsPath;
    } else if (fs.existsSync(mjsPath)) {
      configPath = mjsPath;
    }
  }

  let config: any = { collections: [], globals: [] };

  if (fs.existsSync(configPath)) {
    try {
      const configUrl = pathToFileURL(configPath).href;
      const imported = await import(/* @vite-ignore */ configUrl);
      config = imported.default || imported.config || imported;
    } catch (err: any) {
      process.stderr.write(`[@kyro-cms/mcp] Warning: Failed to load config from ${configPath}: ${err.message}\n`);
    }
  } else {
    process.stderr.write(`[@kyro-cms/mcp] Note: No kyro.config.ts found at ${configPath}. Starting with empty schema.\n`);
  }

  const server = createMcpServer({
    config,
    serverInfo: {
      name: '@kyro-cms/mcp',
      version: '0.13.1',
    },
  });

  server.startStdio();
}

main().catch((err) => {
  process.stderr.write(`[@kyro-cms/mcp] Fatal error: ${err.message}\n`);
  process.exit(1);
});
