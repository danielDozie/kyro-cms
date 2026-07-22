import type { Answers } from "../prompts.js";

export function generateAstroConfig(answers: Answers): string {
  return `import { defineConfig } from 'astro/config';
import { kyro } from '@kyro-cms/core';
import { kyroAdmin } from '@kyro-cms/admin';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  integrations: [react(), kyro({ adminPath: '/admin', apiPath: '/api' }), kyroAdmin({ basePath: '/admin', apiPath: '/api' })],
  vite: {
    plugins: [
      tailwind(),
      {
        name: 'use-sync-external-store-shim-fix',
        enforce: 'pre',
        resolveId(id) {
          if (
            id === 'use-sync-external-store/shim' ||
            id === 'use-sync-external-store/shim/index.js'
          ) {
            return '\\0virtual:use-sync-external-store-shim';
          }
        },
        load(id) {
          if (id === '\\0virtual:use-sync-external-store-shim') {
            return \`export { useSyncExternalStore } from 'react';\`;
          }
        },
      },
    ],
  },
  server: {
    port: 4321,
    host: true,
  },
});`;
}
