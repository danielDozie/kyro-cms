import type { Answers } from "../prompts.js";

export function generateAstroConfig(answers: Answers): string {
  return `import { defineConfig } from 'astro/config';
import { kyro } from '@kyro-cms/core';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  integrations: [react(), kyro({ adminPath: '/admin', apiPath: '/api' })],
  vite: {
    plugins: [
      tailwind(),
    ],
  },
  server: {
    port: 4321,
    host: true,
  },
});`;
}
