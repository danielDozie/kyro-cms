import type { KyroPlugin } from "../types.js";
import { registerPlugin } from "../registry.js";

// Simple MVP plugin demonstrating registration and an onAdminReady hook
const samplePlugin: KyroPlugin = {
  name: "sample-plugin",
  version: "0.1.0",
  description: "A tiny sample plugin to demonstrate the extensibility surface",
  hooks: {
    onAdminReady: () => {
      // Lightweight side-effect; in real plugins this could mount UI or register editors
      return;
    },
  },
};

registerPlugin(samplePlugin);

export default samplePlugin;
