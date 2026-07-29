import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/headless.ts',
    'src/server.ts',
    'src/deployers/cloudflare.ts',
  ],
  format: ['esm'],
  dts: true,
  splitting: false,
  clean: true,
  target: 'node18',
  platform: 'node'
});
