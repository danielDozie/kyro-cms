import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/kyro-codegen": "bin/kyro-codegen.ts",
  },
  format: ["esm", "cjs"],
  dts: {
    entry: "src/index.ts",
  },
  clean: true,
  target: "node18",
  outDir: "dist",
  bundle: true,
  splitting: false,
});
