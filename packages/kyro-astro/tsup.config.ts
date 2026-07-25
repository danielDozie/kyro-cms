import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/integration.ts',
    'src/loader.ts',
    'src/actions.ts',
    'src/middleware.ts',
    'src/dev-toolbar.ts',
    'src/dev-toolbar-app.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['astro', 'astro/config', 'astro/toolbar', 'astro:content', 'astro:actions', '@kyro-cms/core'],
});
