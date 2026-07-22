import type { KyroPlugin } from "../types.js";
import { registerPlugin } from "../registry.js";

// Second MVP plugin demonstrating beforeDeploy hook usage
const samplePlugin2: KyroPlugin = {
  name: "sample-plugin-2",
  version: "0.1.0",
  description: "Second MVP plugin demonstrating beforeDeploy hook",
  hooks: {
    beforeDeploy: (ctx) => {
      // Lightweight side-effect; in real plugins, you could validate config, migrations, etc.
      void ctx;
      return { success: true };
    },
  },
};

registerPlugin(samplePlugin2);

export default samplePlugin2;
