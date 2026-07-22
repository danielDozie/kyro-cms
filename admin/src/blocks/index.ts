export {
  registerBlock,
  unregisterBlock,
  getBlock,
  getBlocks,
  getBlocksByCategory,
  useBlockRenderer,
} from "./registry.ts";
export type { KyroBlock, BlockRenderProps } from "./types.ts";
export { default as sampleBlock } from "./examples/sample-block";
export { default as sampleBlock2 } from "./examples/sample-block-2.tsx";

// Re-export core block types for type-safe block registration
export type { Block as CoreBlock, RichTextBlock } from "@kyro-cms/core";
