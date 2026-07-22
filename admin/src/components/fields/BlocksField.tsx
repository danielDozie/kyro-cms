import React, { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "zustand";
import { BlocksContext, createBlocksStore, createNewBlock, type BlocksStoreApi, useBlockActions } from "./extensions/blocksStore";
import { BlockDrawer, DraggableBlockType } from "../ui/BlockDrawer";
import { Plus, Box, X, Copy, ChevronDown } from "../ui/icons";
import {
  BLOCK_COMPONENTS,
  getBlockComponent,
  blockIcons,
  getBlockDisplayLabel,
  getBlockLabel,
  blockTheme,
} from "./extensions/blockComponents";
import { Check, ClipboardCopy } from "lucide-react";
import { GenericBlock } from "../blocks/GenericBlock";
import { BlockEditModal } from "../blocks/BlockEditModal";
import { deepEqual } from "../../lib/deep-equal";
import { toast } from "../../lib/stores";
import {

  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  useDraggable,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, Active } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface BlocksFieldProps {
  field: Record<string, unknown>;
  value: unknown[];
  onChange?: (value: unknown[]) => void;
  onBlocksChange?: () => void;
  error?: string;
  disabled?: boolean;
  documentStatus?: "draft" | "published" | "scheduled" | "archived";
  justSaved?: boolean;
}

import { GripVertical } from "../ui/icons";
import { useTranslation } from "react-i18next";

function getBlockPreviewSnippet(
  data: Record<string, any>,
  blockSchema?: Record<string, any>,
): string {
  if (blockSchema?.fields) {
    for (const field of blockSchema.fields) {
      if (field.type === "text" || field.type === "textarea") {
        const val = data[field.name];
        if (val && typeof val === "string") return val;
      }
    }
  }
  return data.title || data.text || data.name || data.label || "";
}

// Sortable block wrapper for drag-and-drop
const SortableBlockComponent = ({
  block,
  index,
  blockSchema,
  editingBlockId,
  setEditingBlockId,
  onDuplicate,
  compact,
}: {
  block: Record<string, any>;
  index: number;
  blockSchema?: Record<string, any>;
  editingBlockId: string | null;
  setEditingBlockId: (id: string | null) => void;
  onDuplicate: (id: string) => void;
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id as string });

  const { removeBlock, updateBlock } = useBlockActions();
  const isEditing = editingBlockId === block.id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState((block.name as string) || "");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const commitName = useCallback(() => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed !== ((block.name as string) || "").trim()) {
      updateBlock(block.id as string, { name: trimmed || "" });
    }
  }, [nameDraft, block.name, block.id, updateBlock]);

  const copyToClipboard = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const exportData = {
        __kyro_block: true,
        type: block.type,
        blockProps: { ...block, id: undefined, type: undefined },
      };
      navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      toast.success(t("notifications.blockCopied", { defaultValue: "Block copied to clipboard" }));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t("notifications.blockCopyFailed", { defaultValue: "Failed to copy block" }));
    }
  }, [block, t]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const itemLabel = getBlockDisplayLabel(block);
  const data = (block.data || {}) as Record<string, any>;
  const previewSnippet = getBlockPreviewSnippet(data, blockSchema);

  if (compact) {
    return (
      <div ref={setNodeRef} style={style} className="relative group w-full">
        <div
          onClick={() => setEditingBlockId(block.id as string)}
          className={`flex items-center gap-2 pl-7 pr-2 py-2 w-full bg-[var(--kyro-bg-secondary)] rounded-md border transition-colors cursor-pointer text-sm ${isEditing
            ? `${(blockTheme[block.type as string] || blockTheme.default).border} bg-[var(--kyro-primary)]/5`
            : "border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/50 hover:bg-[var(--kyro-primary)]/5"
            }`}
        >
          <div
            className="absolute left-1.5 top-1/2 -translate-y-1/2 p-0.5 cursor-grab active:cursor-grabbing text-[var(--kyro-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--kyro-surface-accent)] rounded touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-2.5 h-2.5" />
          </div>

          {blockIcons[block.type as string] && (
            <span className="text-[var(--kyro-text-secondary)] flex-shrink-0">
              {blockIcons[block.type as string]}
            </span>
          )}

          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameDraft((block.name as string) || ""); setEditingName(false); } }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-primary)] rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--kyro-text-primary)] outline-none"
            />
          ) : (
            <span
              className="font-medium text-[var(--kyro-text-secondary)] flex-1 min-w-0 truncate transition-colors text-left"
            >
              {itemLabel}
            </span>
          )}

          {showDeleteConfirm ? (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  removeBlock(block.id as string);
                  setShowDeleteConfirm(false);
                }}
                className="px-1.5 py-0.5 text-[9px] bg-[var(--kyro-danger)] text-white rounded font-semibold transition-colors hover:brightness-90"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-1.5 py-0.5 text-[9px] bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-border)] text-[var(--kyro-text-secondary)] rounded font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNameDraft((block.name as string) || "");
                  setEditingName(true);
                }}
                className="p-0.5 hover:bg-[var(--kyro-surface-accent)] rounded text-[var(--kyro-text-secondary)] transition-colors"
                title={t("tooltips.rename", { defaultValue: "Rename" })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(block.id as string);
                }}
                className="p-0.5 hover:bg-[var(--kyro-surface-accent)] rounded text-[var(--kyro-text-secondary)] transition-colors"
                title={t("tooltips.duplicateInPlace", { defaultValue: "Duplicate in place" })}
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={copyToClipboard}
                className="p-0.5 hover:bg-[var(--kyro-surface-accent)] rounded text-[var(--kyro-text-secondary)] transition-colors"
                title={t("tooltips.copyBlock", { defaultValue: "Copy Block to Clipboard" })}
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <ClipboardCopy className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="p-0.5 hover:bg-[var(--kyro-danger-bg)] hover:text-[var(--kyro-danger)] rounded text-[var(--kyro-text-muted)] transition-colors"
                title={t("tooltips.remove", { defaultValue: "Remove" })}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {isEditing && (
          <BlockEditModal
            block={block}
            blockSchema={blockSchema}
            onClose={() => setEditingBlockId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group mb-2">
      <div
        onClick={() => setEditingBlockId(block.id as string)}
        className={`flex items-center gap-3 p-3 bg-[var(--kyro-bg-secondary)] rounded-lg border transition-colors cursor-pointer ${isEditing
          ? `${(blockTheme[block.type as string] || blockTheme.default).border} bg-[var(--kyro-primary)]/5`
          : "border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/50 hover:bg-[var(--kyro-primary)]/5"
          }`}
      >
        <div
          className="p-1 cursor-grab active:cursor-grabbing text-[var(--kyro-text-muted)] hover:bg-[var(--kyro-surface-accent)] rounded flex-shrink-0 touch-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {blockIcons[block.type as string] && (
          <span className="text-[var(--kyro-text-secondary)]">
            {blockIcons[block.type as string]}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameDraft((block.name as string) || ""); setEditingName(false); } }}
              onClick={(e) => e.stopPropagation()}
              placeholder={getBlockLabel(block.type as string)}
              className="w-full max-w-[150px] sm:max-w-[250px] md:max-w-[400px] bg-[var(--kyro-surface-accent)] border border-[var(--kyro-primary)] rounded px-2 py-0.5 text-xs font-semibold text-[var(--kyro-text-primary)] outline-none"
            />
          ) : (
            <div
              className="text-xs font-semibold text-[var(--kyro-text-secondary)] truncate transition-colors"
            >
              {itemLabel}
              {previewSnippet && typeof previewSnippet === "string" && (
                <span className="text-[var(--kyro-text-muted)] font-normal ml-1.5">
                  - {previewSnippet.length > 40 ? `${previewSnippet.slice(0, 40)}...` : previewSnippet}
                </span>
              )}
            </div>
          )}
          {!!blockSchema?.admin?.description && (
            <div className="text-[10px] text-[var(--kyro-text-muted)] mt-0.5 truncate opacity-80">
              {blockSchema.admin.description as string}
            </div>
          )}
        </div>

        {!!block.children && Array.isArray(block.children) && (block.children as any[]).length > 0 && (
          <span className="text-[10px] bg-[var(--kyro-surface-accent)] px-2 py-0.5 rounded text-[var(--kyro-text-muted)] font-medium">
            {(block.children as any[]).length} nested
          </span>
        )}

        {showDeleteConfirm ? (
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                removeBlock(block.id as string);
                setShowDeleteConfirm(false);
              }}
              className="px-2.5 py-1 text-[10px] bg-[var(--kyro-danger)] text-white rounded font-semibold transition-colors hover:brightness-90"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1 text-[10px] bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-border)] text-[var(--kyro-text-secondary)] rounded font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNameDraft((block.name as string) || "");
                setEditingName(true);
              }}
              className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded text-[var(--kyro-text-secondary)] transition-colors"
              title={t("tooltips.renameBlock", { defaultValue: "Rename Block" })}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(block.id as string);
              }}
              className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded text-[var(--kyro-text-secondary)] transition-colors"
              title={t("tooltips.duplicateBlock", { defaultValue: "Duplicate Block" })}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={copyToClipboard}
              className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded text-[var(--kyro-text-secondary)] transition-colors"
              title={t("tooltips.copyBlock", { defaultValue: "Copy Block to Clipboard" })}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-1 hover:bg-[var(--kyro-danger-bg)] hover:text-[var(--kyro-danger)] rounded text-[var(--kyro-text-muted)] transition-colors"
              title={t("tooltips.removeBlock", { defaultValue: "Remove Block" })}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <BlockEditModal
          block={block}
          blockSchema={blockSchema}
          onClose={() => setEditingBlockId(null)}
        />
      )}
    </div>
  );
};
// Memoize per-block to minimize re-renders when unrelated blocks change
const SortableBlock = React.memo(SortableBlockComponent);

export const BlocksField: React.FC<BlocksFieldProps> = ({
  field,
  value,
  onChange,
  onBlocksChange,
  error,
  disabled,
  documentStatus,
  justSaved,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pickerMode = (field as any).admin?.pickerMode || "drawer";
  const allowedBlocks = (field.blocks as any[]) || [];

  const groupedBlocks = allowedBlocks.reduce((acc, block) => {
    const groupName = block.admin?.group || "Custom Blocks";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(block);
    return acc;
  }, {} as Record<string, any[]>);

  // Define a preferred ordering of core categories if possible
  const categoryOrder = [
    "Structural Sections",
    "Marketing Grids",
    "Lead Capture & Interactive",
    "Dynamic Content",
    "Basic Content Elements",
    "Custom Blocks",
  ];

  const dynamicCategories = Object.entries(groupedBlocks)
    .sort(([titleA], [titleB]) => {
      const idxA = categoryOrder.indexOf(titleA);
      const idxB = categoryOrder.indexOf(titleB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return titleA.localeCompare(titleB);
    })
    .map(([title, blocks]) => ({
      title,
      blocks,
    }));

  const storeRef = useRef<BlocksStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createBlocksStore(allowedBlocks, dynamicCategories);
  }
  const store = storeRef.current;

  const blocks = useStore(store, (s) => s.blocks);
  const [activeDrag, setActiveDrag] = useState<Active | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // Track previous blocks count and IDs to auto-open newly added blocks
  const prevBlocksLengthRef = useRef(blocks.length);
  const prevBlockIdsRef = useRef(new Set(blocks.map((b) => b.id)));
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) {
      if (blocks.length > prevBlocksLengthRef.current) {
        // Find the new block ID that wasn't present before
        const newBlock = blocks.find((b) => b.id && !prevBlockIdsRef.current.has(b.id));
        if (newBlock) {
          setEditingBlockId(newBlock.id);
        }
      }
    }
    prevBlocksLengthRef.current = blocks.length;
    prevBlockIdsRef.current = new Set(blocks.map((b) => b.id));
  }, [blocks]);

  // Register blocks change callback
  useEffect(() => {
    if (onBlocksChange) {
      store.getState().setOnBlocksChange(onBlocksChange);
    }
    return () => {
      store.getState().setOnBlocksChange(() => { });
    };
  }, [onBlocksChange, store]);

  // Sync external value changes (e.g., auto-save restore) to store
  // Track last-synced value so we don't revert our own internal mutations
  const lastValueRef = useRef<unknown[] | null>(null);
  useEffect(() => {
    const valueArray = Array.isArray(value) ? value : [];
    const lastValueArray = lastValueRef.current || [];

    // Deep compare to catch external data changes (e.g. discard draft / auto-save restore)
    if (!deepEqual(valueArray, lastValueArray)) {
      const valueArrayCopy = [...valueArray];
      prevBlocksLengthRef.current = valueArrayCopy.length;
      prevBlockIdsRef.current = new Set(valueArrayCopy.map((b: any) => b.id as string));
      store.getState().setBlocks(valueArrayCopy as any);
      lastValueRef.current = valueArrayCopy;
      isInitializedRef.current = true;
    } else if (valueArray.length === 0 && !isInitializedRef.current) {
      isInitializedRef.current = true;
      lastValueRef.current = []; // Fix for new pages starting with empty arrays
    }
  }, [value, field.name, store]);

  // Propagate blocks to parent only when they differ from the last loaded value
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (!onChangeRef.current) return;
    const lastValue = lastValueRef.current;
    if (!lastValue) return; // Wait until initialized

    // Deep compare blocks vs lastValue to detect content edits, not just ID changes
    if (!deepEqual(blocks, lastValue)) {
      lastValueRef.current = [...blocks]; // Update ref BEFORE firing onChange to prevent loops
      onChangeRef.current(blocks);
    }
  }, [blocks]);

  // Determine left border style based on document status
  const getBorderClass = () => {
    if (justSaved) {
      return "border-l-[3px] border-[var(--kyro-success)]";
    }
    if (
      documentStatus === "draft" ||
      documentStatus === "scheduled" ||
      documentStatus === "archived"
    ) {
      return "border-l-[3px] border-amber-500";
    }
    return "";
  };

  const handleAddBlock = useCallback(
    (blockType: string) => {
      store.getState().addBlock(blockType);
    },
    [store],
  );

  // const handlePasteBlock = useCallback((parsedData: any) => {
  //   const allowedBlocks = (field.blocks as Array<{ slug: string }>) || [];
  //   const isAllowed = allowedBlocks.some((b) => b.slug === parsedData.type);

  //   if (!isAllowed) {
  //     alert(`The block type "${parsedData.type}" is not allowed in this collection.`);
  //     return;
  //   }

  //   const newId = Math.random().toString(36).substring(2, 11);
  //   const newBlock = {
  //     ...(parsedData.blockProps || {}),
  //     id: newId,
  //     type: parsedData.type,
  //   };

  //   store.getState().setBlocks([...blocks, newBlock]);
  //   setIsDrawerOpen(false);
  // }, [field.blocks, blocks, store]);



  const handlePasteBlock = useCallback((parsedData: any) => {
    const isAllowed = allowedBlocks.some((b) => b.slug === parsedData.type);

    if (!isAllowed) {
      alert(`The block type "${parsedData.type}" is not allowed in this collection.`);
      return;
    }

    const newId = Math.random().toString(36).substring(2, 11);
    const newBlock = {
      ...(parsedData.blockProps || {}),
      id: newId,
      type: parsedData.type,
    };

    store.getState().setBlocks([...blocks, newBlock]);
    setIsDrawerOpen(false);
  }, [allowedBlocks, blocks, store]);

  const handleContainerPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.getAttribute("contenteditable") === "true")
    ) {
      return;
    }

    const text = e.clipboardData?.getData("text");
    if (!text) return;

    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.__kyro_block) {
        e.preventDefault();
        e.stopPropagation();
        handlePasteBlock(parsed);
        toast.success(`Block pasted: ${parsed.type}`);
      }
    } catch {
      // Ignore
    }
  }, [handlePasteBlock]);

  const duplicateBlock = useCallback(
    (blockId: string) => {
      const blockIndex = blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const blockToClone = blocks[blockIndex];

      const cloneBlock = (b: any): any => {
        const newId = Math.random().toString(36).substr(2, 9);
        return {
          ...b,
          id: newId,
          children: b.children ? b.children.map((c: any) => cloneBlock(c)) : b.children,
          data: b.data ? JSON.parse(JSON.stringify(b.data)) : b.data,
        };
      };

      const cloned = cloneBlock(blockToClone);
      const newBlocks = [...blocks];
      newBlocks.splice(blockIndex + 1, 0, cloned);
      store.getState().setBlocks(newBlocks);
    },
    [blocks, store],
  );

  // Set up dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);

    if (!over) return;

    // Case 1: Dragged from drawer
    if (active.id.toString().startsWith("drawer-")) {
      const blockType = active.id.toString().replace("drawer-", "");

      // Check if dropped on a container
      if (over.id.toString().startsWith("container-")) {
        const containerId = over.id.toString().replace("container-", "");
        const container = blocks.find((b) => b.id === containerId);
        if (container) {
          const newBlock = createNewBlock(blockType);
          store.getState().updateBlock(containerId, {
            children: [...(container.children || []), newBlock],
          });
        }
      } else {
        // Dropped on root level - check if dropped over a specific block to insert at index
        const overIndex = blocks.findIndex((b) => b.id === over.id);
        if (overIndex !== -1) {
          store.getState().addBlock(blockType, overIndex);
        } else {
          handleAddBlock(blockType);
        }
      }
      return;
    }

    // Case 2: Reordering existing blocks
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newBlocks = [...blocks];
        const [movedBlock] = newBlocks.splice(oldIndex, 1);
        newBlocks.splice(newIndex, 0, movedBlock);
        store.getState().setBlocks(newBlocks);
      }
    }
  };

  // Render active drag overlay
  const activeBlock = activeDrag
    ? dynamicCategories
      .flatMap((cat) => cat.blocks)
      .find((b: any) => `drawer-${b.type}` === activeDrag.id) ||
    blocks.find((b) => b.id === activeDrag.id)
    : null;

  const activeBlockLabel = activeBlock
    ? "label" in (activeBlock as object)
      ? (activeBlock as Record<string, unknown>).label
      : (activeBlock as any).type
    : "Block";

  const borderClass = getBorderClass();

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isDropdownOpen]);

  return (
    <BlocksContext.Provider value={storeRef.current}>
      <div
        className="kyro-blocks-field"
        onPaste={handleContainerPaste}
        tabIndex={0}
        style={{ outline: "none" }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={pickerMode === "dropdown" ? "mb-4" : "flex items-center justify-between mb-2"}>
            <label className={`kyro-form-label ${pickerMode === "dropdown" ? "block mb-2" : ""}`}>{(field.label || field.name) as string}</label>
            {pickerMode === "dropdown" ? (
              <div ref={dropdownRef} className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={disabled}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] bg-[var(--kyro-surface)] rounded-md transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[var(--kyro-primary)]" />
                    <span className="font-semibold">Select an element to add...</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180 text-[var(--kyro-primary)]" : "opacity-50"}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-full bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 py-2 max-h-80 overflow-y-auto">
                    {dynamicCategories.map((category) => (
                      <div key={category.title}>
                        {dynamicCategories.length > 1 && (
                          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-[var(--kyro-text-muted)] uppercase">
                            {category.title}
                          </div>
                        )}
                        {(category as any).blocks.map((block: any) => (
                          <button
                            key={block.slug}
                            type="button"
                            onClick={() => {
                              handleAddBlock(block.slug);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]/50 transition-colors text-left"
                          >
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--kyro-text-muted)]">
                              {blockIcons[block.slug as keyof typeof blockIcons] || <Box className="w-4 h-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{block.label}</div>
                              {block.admin?.description && (
                                <div className="text-[10px] text-[var(--kyro-text-muted)] truncate">{block.admin.description}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--kyro-primary)] hover:bg-[var(--kyro-surface-accent)]/30 rounded-md transition-colors disabled:opacity-50 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Block
              </button>
            )}
          </div>

          <div className="mb-4">
            <BlockDrawer
              open={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              onSelect={handleAddBlock}
              onPasteBlock={handlePasteBlock}
            >
              <div className="space-y-4">
                {dynamicCategories.map((category) => (
                  <div key={category.title}>
                    <h3 className="text-xs font-semibold text-[var(--kyro-text-muted)] mb-2 tracking-wider">
                      {category.title}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(category as any).blocks.map((block: any) => (
                        <DraggableBlockType
                          key={block.slug}
                          block={{
                            type: block.slug,
                            label: block.label,
                            description: block.admin?.description || "",
                            icon: null,
                          }}
                          onSelect={handleAddBlock}
                        >
                          <div className="w-6 h-6 flex items-center justify-center rounded group-hover:bg-[var(--kyro-primary)]/10 group-hover:text-[var(--kyro-primary)] transition-all duration-300">
                            <span className="text-[var(--kyro-text-muted)]">
                              {blockIcons[
                                block.slug as keyof typeof blockIcons
                              ] || <Box className="w-4 h-4" />}
                            </span>
                          </div>
                        </DraggableBlockType>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </BlockDrawer>
          </div>

          {/* Block List with Drag-and-Drop */}
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={pickerMode === "dropdown" ? "flex flex-col gap-2 mt-3" : "space-y-4"}>
              {blocks.map((block, index) => {
                const blockSchema = (field.blocks as any[])?.find(
                  (b) => b.slug === block.type
                );
                return (
                  <SortableBlock
                    key={block.id || index}
                    block={block}
                    index={index}
                    blockSchema={blockSchema}
                    editingBlockId={editingBlockId}
                    setEditingBlockId={setEditingBlockId}
                    onDuplicate={duplicateBlock}
                    compact={pickerMode === "dropdown"}
                  />
                );
              })}
              {blocks.length === 0 && (
                <div className={pickerMode === "dropdown" ? "text-xs text-[var(--kyro-text-muted)] italic py-1" : "text-center py-12 text-[var(--kyro-text-muted)] border-2 border-dashed border-[var(--kyro-border)] rounded-lg"}>
                  {pickerMode === "dropdown" ? "No elements added" : "Click the button above to add your first block"}
                </div>
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeDrag && activeBlock && (
              <div className="bg-[var(--kyro-surface)] border border-[var(--kyro-primary)] rounded-md p-3 shadow-lg">
                {(activeBlock as Record<string, unknown>).label as string || (activeBlock as any).type || "Block"}
              </div>
            )}
          </DragOverlay>
        </DndContext>
        {error && <p className="kyro-form-error">{error}</p>}
      </div>
    </BlocksContext.Provider>
  );
};
