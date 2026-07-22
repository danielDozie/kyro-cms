import type { KyroBlock } from "./types.ts";

const blocks: Map<string, KyroBlock> = new Map();

export function registerBlock(block: KyroBlock): void {
  if (!block.id || typeof block.id !== "string") {
    throw new Error("Block must have a valid id");
  }
  if (!block.label) {
    throw new Error("Block must have a label");
  }
  blocks.set(block.id, block);
}

export function unregisterBlock(id: string): void {
  blocks.delete(id);
}

export function getBlock(id: string): KyroBlock | undefined {
  return blocks.get(id);
}

export function getBlocks(): KyroBlock[] {
  return Array.from(blocks.values());
}

export function getBlocksByCategory(category: string): KyroBlock[] {
  return Array.from(blocks.values()).filter((b) => b.category === category);
}

export function useBlockRenderer(id: string) {
  const block = blocks.get(id);
  if (!block) {
    console.warn(`Block "${id}" not found in registry`);
    return null;
  }
  return block.render;
}
