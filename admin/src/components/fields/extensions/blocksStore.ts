import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import { createContext, useContext } from "react";
import type { BlockData } from "@kyro-cms/core/client";

export interface BlocksStore {
  blocks: BlockData[];
  setBlocks: (blocks: BlockData[]) => void;
  addBlock: (type: string, index?: number) => void;
  updateBlock: (id: string, data: Partial<BlockData>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, direction: "up" | "down") => void;
  onBlocksChange: (() => void) | null;
  setOnBlocksChange: (cb: () => void) => void;
  allowedBlocks: any[];
  dynamicCategories: { title: string; blocks: any[] }[];
}

export type BlocksStoreApi = StoreApi<BlocksStore>;

export const BlocksContext = createContext<BlocksStoreApi | null>(null);

export function createBlocksStore(allowedBlocks: any[] = [], dynamicCategories: any[] = []): BlocksStoreApi {
  return createStore<BlocksStore>((set, get) => ({
    blocks: [],
    allowedBlocks,
    dynamicCategories,
    setBlocks: (blocks) => {
      const ensuredBlocks = ensureIds(blocks || []);
      set({ blocks: ensuredBlocks });
    },
    onBlocksChange: null,
    setOnBlocksChange: (cb) => set({ onBlocksChange: cb }),
    addBlock: (type, index) => {
      const newBlock = createNewBlock(type);
      const { blocks } = get();
      const newBlocks = [...blocks];
      if (index !== undefined) {
        newBlocks.splice(index, 0, newBlock);
      } else {
        newBlocks.push(newBlock);
      }
      set({ blocks: newBlocks });
      const { onBlocksChange } = get();
      if (onBlocksChange) onBlocksChange();
    },
    updateBlock: (id, data) => {
      const { blocks } = get();

      const newBlocks = traverseBlocks(blocks, (blocksList) => {
        const index = blocksList.findIndex(b => b.id === id);
        if (index !== -1) {
          const newBlocksList = [...blocksList];
          newBlocksList[index] = { ...newBlocksList[index], ...data };
          return { newList: newBlocksList, found: true };
        }
        return { newList: blocksList, found: false };
      });

      if (newBlocks !== blocks) {
        set({ blocks: newBlocks });
        const { onBlocksChange } = get();
        if (onBlocksChange) onBlocksChange();
      }
    },
    removeBlock: (id) => {
      if (!id) return;
      const { blocks } = get();
      
      const newBlocks = traverseBlocks(blocks, (blocksList) => {
        const filtered = blocksList.filter(b => b.id !== id);
        if (filtered.length !== blocksList.length) {
          return { newList: filtered, found: true };
        }
        return { newList: blocksList, found: false };
      });

      if (newBlocks !== blocks) {
        set({ blocks: newBlocks });
        const { onBlocksChange } = get();
        if (onBlocksChange) onBlocksChange();
      }
    },
    moveBlock: (id, direction) => {
      const { blocks } = get();

      const newBlocks = traverseBlocks(blocks, (blocksList) => {
        const index = blocksList.findIndex(b => b.id === id);
        if (index !== -1) {
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < blocksList.length) {
            const newBlocksList = [...blocksList];
            [newBlocksList[index], newBlocksList[targetIndex]] = [
              newBlocksList[targetIndex],
              newBlocksList[index],
            ];
            return { newList: newBlocksList, found: true };
          }
        }
        return { newList: blocksList, found: false };
      });

      if (newBlocks !== blocks) {
        set({ blocks: newBlocks });
        const { onBlocksChange } = get();
        if (onBlocksChange) onBlocksChange();
      }
    },
  }));
}

/**
 * Recursively ensures all blocks and nested children have unique IDs
 */
export function ensureIds(blocks: BlockData[]): BlockData[] {
  if (!Array.isArray(blocks)) return [];

  return blocks.map((block) => {
    const updatedBlock = {
      ...block,
      id: block.id || Math.random().toString(36).substr(2, 9),
    };

    if (updatedBlock.children && Array.isArray(updatedBlock.children)) {
      updatedBlock.children = ensureIds(updatedBlock.children);
    }

    const blockData = updatedBlock.data as Record<string, any> | undefined;
    if (blockData?.columnData && Array.isArray(blockData.columnData)) {
      updatedBlock.data = {
        ...updatedBlock.data,
        columnData: blockData.columnData.map((col: any) => ({
          ...col,
          children: col.children ? ensureIds(col.children) : col.children,
        })),
      };
    }

    return updatedBlock;
  });
}

// Create new block helper (pure function, no store needed)
export function createNewBlock(type: string): BlockData {
  const defaultData = getDefaultData(type);
  const { options, children, ...data } = defaultData;
  return {
    id: Math.random().toString(36).substring(2, 11),
    type,
    name: "",
    data: data as Record<string, unknown>,
    options: options as Record<string, unknown> | undefined,
    children: children as BlockData[] | undefined,
    order: Date.now(),
  };
}

function getDefaultData(type: string): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    heading: { level: 1, text: "" },
    "heading-subheading": { title: "", subtitle: "" },
    hero: { isMultiScreen: false },
    card: { title: "", description: "", icon: "", link: "", linkText: "", isMultiCard: false },
    paragraph: { text: "" },
    divider: {},
    callout: { text: "", variant: "info" },
    image: { src: "", alt: "", caption: "" },
    video: { src: "", title: "" },
    list: { type: "unordered", items: "" },
    code: { language: "plaintext", code: "" },
    link: { url: "", text: "" },
    table: { rows: 3, columns: 3, content: "" },
    quote: { text: "", author: "" },
    file: { filename: "", url: "" },
    columns: { columns: 2, direction: "horizontal" },
    vstack: { direction: "vertical", gap: "md" },
    container: {
      options: {
        backgroundColor: "transparent",
        padding: "md",
        width: "full",
        margin: "none",
        minHeight: "none",
        borderRadius: "none",
      },
      children: [],
    },
    button: { text: "Button", url: "", variant: "primary", size: "md" },
    accordion: { title: "Accordion Item", content: "" },
    gallery: { images: [] },
    tabs: { tabs: [{ label: "Tab 1", content: "" }] },
  };
  return (defaults[type] || {}) as Record<string, unknown>;
}

// React hooks that read from context
export function useBlocksStore(): BlocksStore {
  const store = useContext(BlocksContext);
  if (!store) {
    throw new Error("useBlocksStore must be used within a BlocksContext.Provider");
  }
  return useStore(store);
}

export function useBlockById(id: string): BlockData | undefined {
  const store = useContext(BlocksContext);
  if (!store) return undefined;
  return useStore(store, (state) => {
    const findRecursive = (blocksList: BlockData[]): BlockData | undefined => {
      for (const b of blocksList) {
        if (b.id === id) return b;
        if (b.children && b.children.length > 0) {
          const found = findRecursive(b.children);
          if (found) return found;
        }
        const bData = b.data as Record<string, any> | undefined;
        if (bData?.columnData && Array.isArray(bData.columnData)) {
          for (const col of bData.columnData) {
            if (col && col.children && col.children.length > 0) {
              const found = findRecursive(col.children);
              if (found) return found;
            }
          }
        }
      }
      return undefined;
    };
    return findRecursive(state.blocks);
  });
}

export function useBlockCount(): number {
  const store = useContext(BlocksContext);
  if (!store) return 0;
  return useStore(store, (state) => state.blocks.length);
}

export function useBlockActions() {
  const store = useContext(BlocksContext);
  if (!store) {
    throw new Error("useBlockActions must be used within a BlocksContext.Provider");
  }
  return {
    updateBlock: (id: string, data: Partial<BlockData>) => store.getState().updateBlock(id, data),
    removeBlock: (id: string) => store.getState().removeBlock(id),
    moveBlock: (id: string, direction: "up" | "down") => store.getState().moveBlock(id, direction),
  };
}

/**
 * Generic tree traversal helper for blocks
 */
export function traverseBlocks(
  blocks: BlockData[],
  action: (blocksList: BlockData[]) => { newList: BlockData[]; found: boolean }
): BlockData[] {
  const { newList, found } = action(blocks);
  if (found) return newList;

  let overallChanged = false;
  const deepUpdatedList = blocks.map((block) => {
    let updatedBlock = { ...block };
    let blockChanged = false;

    // Handle children
    if (block.children && block.children.length > 0) {
      const updatedChildren = traverseBlocks(block.children, action);
      if (updatedChildren !== block.children) {
        updatedBlock.children = updatedChildren;
        blockChanged = true;
      }
    }

    // Handle columnData
    const blockData = block.data as Record<string, any> | undefined;
    if (blockData?.columnData && Array.isArray(blockData.columnData)) {
      const updatedColumnData = blockData.columnData.map((col: any) => {
        if (col.children && col.children.length > 0) {
          const updatedColChildren = traverseBlocks(col.children, action);
          if (updatedColChildren !== col.children) {
            return { ...col, children: updatedColChildren };
          }
        }
        return col;
      });

      if (updatedColumnData.some((col: any, i: number) => col !== blockData.columnData[i])) {
        updatedBlock.data = { ...updatedBlock.data, columnData: updatedColumnData };
        blockChanged = true;
      }
    }

    if (blockChanged) overallChanged = true;
    return blockChanged ? updatedBlock : block;
  });

  return overallChanged ? deepUpdatedList : blocks;
}
