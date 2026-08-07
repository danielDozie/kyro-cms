import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['virtual:kyro-plugins', /^virtual:/],
  loader: {
    '.md': 'text',
  },
  esbuildPlugins: [
    {
      name: 'raw-md-loader',
      setup(build) {
        build.onResolve({ filter: /\.md\?raw$/ }, (args) => {
          return {
            path: path.resolve(args.resolveDir, args.path.replace(/\?raw$/, '')),
            namespace: 'raw-md-namespace',
          };
        });
        build.onLoad({ filter: /.*/, namespace: 'raw-md-namespace' }, (args) => {
          const contents = fs.readFileSync(args.path, 'utf8');
          return {
            contents,
            loader: 'text',
          };
        });
      },
    },
  ],
});
