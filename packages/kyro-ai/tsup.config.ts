import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/admin.tsx', 'src/admin-assistant.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['@kyro-cms/core'],
});
