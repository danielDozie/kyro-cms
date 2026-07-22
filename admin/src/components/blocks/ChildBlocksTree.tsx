import React, { useState } from "react";
import { Plus, X, ChevronRight, ChevronDown } from "../ui/icons";
import {
  blockIcons,
  getBlockComponent,
  getBlockLabel,
  getBlockDisplayLabel,
} from "../fields/extensions/blockComponents";
import { createNewBlock } from "../fields/extensions/blocksStore";
import { BlockDrawer } from "../ui/BlockDrawer";
import { BlockEditModal } from "./BlockEditModal";
import { useStore } from "zustand";
import { BlocksContext } from "../fields/extensions/blocksStore";
import { useContext } from "react";
import type { BlockData } from "@kyro-cms/core/client";

interface ChildBlocksTreeProps {
  blockId: string;
  children: BlockData[];
  onUpdateChildren: (children: BlockData[]) => void;
  depth?: number;
  maxDepth?: number;
}

const MAX_DEPTH = 6;

export const ChildBlocksTree: React.FC<ChildBlocksTreeProps> = ({
  blockId,
  children,
  onUpdateChildren,
  depth = 0,
  maxDepth = MAX_DEPTH,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const store = useContext(BlocksContext);
  if (!store) throw new Error("ChildBlocksTree must be used within a BlocksContext");
  const dynamicCategories = useStore(store, (s) => s.dynamicCategories);
  const allowedBlocks = useStore(store, (s) => s.allowedBlocks);

  const canAddChildren = depth < maxDepth;
  const indentWidth = 16;

  const handleAddChild = (type: string) => {
    const newChild = createNewBlock(type);
    onUpdateChildren([...children, newChild]);
    setEditingBlockId(newChild.id);
  };

  const handleRemoveChild = (childId: string) => {
    const filtered = children.filter((c) => c.id !== childId);
    onUpdateChildren(filtered);
  };

  const handleUpdateChildData = (childId: string, newData: Record<string, unknown>) => {
    const updated = children.map((child) => {
      if (child.id === childId) {
        return { ...child, data: newData };
      }
      return child;
    });
    onUpdateChildren(updated as BlockData[]);
  };

  const handleUpdateChildChildren = (
    childId: string,
    newGrandchildren: BlockData[],
  ) => {
    const updated = children.map((child) => {
      if (child.id === childId) {
        return { ...child, children: newGrandchildren };
      }
      return child;
    });
    onUpdateChildren(updated);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderBlock = (child: BlockData) => {
    const hasChildren = child.children && child.children.length > 0;
    const isExpanded = expandedIds.has(child.id);
    const BlockComponent = getBlockComponent(child.type);
    const childHasOwnChildren = hasChildren;
    const isEditing = editingBlockId === child.id;
    const blockSchema = allowedBlocks.find((b: any) => b.slug === child.type);

    return (
      <div key={child.id} className="relative group">
        <div
          className={`flex items-center group/column gap-2 p-2 bg-[var(--kyro-bg-secondary)] rounded border transition-colors ${isEditing
            ? "bg-[var(--kyro-primary)]/10 border-[var(--kyro-primary)]"
            : "border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/50 hover:bg-[var(--kyro-primary)]/5"
            } ${canAddChildren ? "cursor-pointer" : ""}`}
          style={{ marginLeft: depth * indentWidth }}
          onClick={() => {
            if (canAddChildren) {
              setEditingBlockId(isEditing ? null : child.id);
            }
          }}
        >
          {childHasOwnChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(child.id);
              }}
              className="p-0.5 hover:bg-[var(--kyro-surface-accent)] rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-[var(--kyro-text-muted)]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[var(--kyro-text-muted)]" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {blockIcons[child.type] && (
            <div className="w-8 h-8 rounded bg-[var(--kyro-surface-accent)] flex items-center justify-center text-[var(--kyro-text-secondary)]">
              {blockIcons[child.type]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[var(--kyro-text-secondary)] truncate">
              {getBlockDisplayLabel(child)}
              {typeof child.data?.text === 'string' ? ` - ${child.data.text.slice(0, 30)}` : ""}
              {typeof child.data?.heading === 'string' ? ` - ${child.data.heading.slice(0, 30)}` : ""}
            </div>
            {blockSchema?.admin?.description && (
              <div className="text-[10px] text-[var(--kyro-text-muted)] mt-0.5 truncate opacity-80">
                {blockSchema.admin.description}
              </div>
            )}
          </div>

          {hasChildren && (
            <span className="text-[10px] bg-[var(--kyro-surface-accent)] px-2 py-0.5 rounded text-[var(--kyro-text-muted)] font-medium">
              {child.children?.length} nested
            </span>
          )}

          {confirmDeleteId === child.id ? (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  handleRemoveChild(child.id);
                  setConfirmDeleteId(null);
                }}
                className="px-2 py-1 text-xs bg-[var(--kyro-danger)] text-white rounded"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-2 py-1 text-xs bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] rounded hover:bg-[var(--kyro-border)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteId(child.id);
              }}
              className="p-1.5 rounded-md transition-opacity cursor-pointer hover:bg-[var(--kyro-danger-bg)]"
            >
              <X className="w-3.5 h-3.5 text-[var(--kyro-danger)] invisible group-hover/column:visible" />
            </button>
          )}
        </div>

        {isEditing && (
          <BlockEditModal
            block={child}
            onClose={() => setEditingBlockId(null)}
          />
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1">
            <NestedChildBlocks
              parentId={child.id}
              children={child.children ?? []}
              onUpdateChildren={(newGrandchildren) =>
                handleUpdateChildChildren(child.id, newGrandchildren)
              }
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {children.length > 0 && (
        <div className="space-y-1">{children.map(renderBlock)}</div>
      )}

      {canAddChildren && (
        <div style={{ marginLeft: depth * indentWidth }}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--kyro-primary)] hover:bg-[var(--kyro-surface-accent)] rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Block
          </button>

          <BlockDrawer
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSelect={handleAddChild}
          >
            {dynamicCategories.map((category) => (
              <div key={category.title} className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--kyro-text-muted)]  tracking-wide mb-2">
                  {category.title}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {category.blocks.map((block) => (
                    <button
                      key={block.slug}
                      type="button"
                      onClick={() => {
                        handleAddChild(block.slug);
                        setShowAddModal(false);
                      }}
                      className="flex flex-col items-center text-center gap-1 p-2 rounded-md border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/60 hover:bg-[var(--kyro-surface-accent)]/30 transition-all cursor-pointer group"
                    >
                      <div className="w-6 h-6 flex items-center justify-center rounded group-hover:bg-[var(--kyro-primary)]/10 group-hover:text-[var(--kyro-primary)] transition-all">
                        {blockIcons[block.slug as keyof typeof blockIcons]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium  tracking-tight text-[var(--kyro-text-primary)]">
                          {block.label}
                        </div>
                        <div className="text-[10px] text-[var(--kyro-text-muted)] mt-0.5">
                          {block.admin?.description || ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </BlockDrawer>
        </div>
      )}

      {children.length === 0 && canAddChildren && (
        <div
          className="text-xs text-[var(--kyro-text-muted)] italic py-2"
          style={{ marginLeft: depth * indentWidth }}
        >
          No blocks added. Click "Add Block" to add elements.
        </div>
      )}

      {depth >= maxDepth && children.length > 0 && (
        <div
          className="text-xs text-[var(--kyro-text-muted)] italic"
          style={{ marginLeft: depth * indentWidth }}
        >
          Maximum nesting level ({maxDepth}) reached
        </div>
      )}
    </div>
  );
};

interface NestedChildBlocksProps {
  parentId: string;
  children: BlockData[];
  onUpdateChildren: (children: BlockData[]) => void;
  depth: number;
  maxDepth: number;
}

const NestedChildBlocks: React.FC<NestedChildBlocksProps> = ({
  parentId,
  children,
  onUpdateChildren,
  depth,
  maxDepth,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const store = useContext(BlocksContext);
  if (!store) throw new Error("NestedChildBlocks must be used within a BlocksContext");
  const dynamicCategories = useStore(store, (s) => s.dynamicCategories);
  const allowedBlocks = useStore(store, (s) => s.allowedBlocks);

  const canAddChildren = depth < maxDepth;
  const indentWidth = 16;

  const handleAddChild = (type: string) => {
    const newChild = createNewBlock(type);
    onUpdateChildren([...children, newChild]);
    setEditingBlockId(newChild.id);
  };

  const handleRemoveChild = (childId: string) => {
    const filtered = children.filter((c) => c.id !== childId);
    onUpdateChildren(filtered);
  };

  const handleUpdateChildData = (childId: string, newData: Record<string, unknown>) => {
    const updated = children.map((child) => {
      if (child.id === childId) {
        return { ...child, data: newData };
      }
      return child;
    });
    onUpdateChildren(updated as BlockData[]);
  };

  const handleUpdateChildChildren = (
    childId: string,
    newGrandchildren: BlockData[],
  ) => {
    const updated = children.map((child) => {
      if (child.id === childId) {
        return { ...child, children: newGrandchildren };
      }
      return child;
    });
    onUpdateChildren(updated);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderBlock = (child: BlockData) => {
    const hasChildren = child.children && child.children.length > 0;
    const isExpanded = expandedIds.has(child.id);
    const BlockComponent = getBlockComponent(child.type);
    const childHasOwnChildren = hasChildren;
    const isEditing = editingBlockId === child.id;
    const blockSchema = allowedBlocks.find((b: any) => b.slug === child.type);

    return (
      <div key={child.id} className="relative group">
        <div
          className={`flex items-center gap-2 p-2 bg-[var(--kyro-bg-secondary)] rounded border transition-colors ${isEditing
            ? "bg-[var(--kyro-primary)]/10 border-[var(--kyro-primary)]"
            : "border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/50 hover:bg-[var(--kyro-primary)]/5"
            } ${canAddChildren ? "cursor-pointer" : ""}`}
          style={{ marginLeft: depth * indentWidth }}
          onClick={() => {
            if (canAddChildren) {
              setEditingBlockId(isEditing ? null : child.id);
            }
          }}
        >
          {childHasOwnChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(child.id);
              }}
              className="p-0.5 hover:bg-[var(--kyro-surface-accent)] rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-[var(--kyro-text-muted)]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[var(--kyro-text-muted)]" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {blockIcons[child.type] && (
            <div className="w-8 h-8 rounded bg-[var(--kyro-surface-accent)] flex items-center justify-center text-[var(--kyro-text-secondary)]">
              {blockIcons[child.type]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[var(--kyro-text-secondary)] truncate">
              {getBlockDisplayLabel(child)}
              {typeof child.data?.text === 'string' ? ` - ${child.data.text.slice(0, 30)}` : ""}
              {typeof child.data?.heading === 'string' ? ` - ${child.data.heading.slice(0, 30)}` : ""}
            </div>
            {blockSchema?.admin?.description && (
              <div className="text-[10px] text-[var(--kyro-text-muted)] mt-0.5 truncate opacity-80">
                {blockSchema.admin.description}
              </div>
            )}
          </div>

          {hasChildren && (
            <span className="text-[10px] bg-[var(--kyro-surface-accent)] px-2 py-0.5 rounded text-[var(--kyro-text-muted)] font-medium">
              {child.children?.length} nested
            </span>
          )}

          {confirmDeleteId === child.id ? (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  handleRemoveChild(child.id);
                  setConfirmDeleteId(null);
                }}
                className="px-2 py-1 text-xs bg-[var(--kyro-danger)] text-white rounded"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-2 py-1 text-xs bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] rounded hover:bg-[var(--kyro-border)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteId(child.id);
              }}
              className="p-1.5 rounded-md invisible group-hover:visible transition-opacity cursor-pointer hover:bg-[var(--kyro-danger-bg)]"
            >
              <X className="w-3.5 h-3.5 text-[var(--kyro-danger)]" />
            </button>
          )}
        </div>

        {isEditing && (
          <BlockEditModal
            block={child}
            onClose={() => setEditingBlockId(null)}
          />
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1">
            <NestedChildBlocks
              parentId={child.id}
              children={child.children ?? []}
              onUpdateChildren={(newGrandchildren) =>
                handleUpdateChildChildren(child.id, newGrandchildren)
              }
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {children.length > 0 && (
        <div className="space-y-1">{children.map(renderBlock)}</div>
      )}

      {canAddChildren && (
        <div style={{ marginLeft: depth * indentWidth }}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--kyro-primary)] hover:bg-[var(--kyro-surface-accent)] rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Block
          </button>

          <BlockDrawer
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSelect={handleAddChild}
          >
            {dynamicCategories.map((category) => (
              <div key={category.title} className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--kyro-text-muted)]  tracking-wide mb-2">
                  {category.title}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {category.blocks.map((block) => (
                    <button
                      key={block.slug}
                      type="button"
                      onClick={() => {
                        handleAddChild(block.slug);
                        setShowAddModal(false);
                      }}
                      className="flex flex-col items-center text-center gap-1 p-2 rounded-md border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/60 hover:bg-[var(--kyro-surface-accent)]/30 transition-all cursor-pointer group"
                    >
                      <div className="w-6 h-6 flex items-center justify-center rounded group-hover:bg-[var(--kyro-primary)]/10 group-hover:text-[var(--kyro-primary)] transition-all">
                        {blockIcons[block.slug as keyof typeof blockIcons]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium  tracking-tight text-[var(--kyro-text-primary)]">
                          {block.label}
                        </div>
                        <div className="text-[10px] text-[var(--kyro-text-muted)] mt-0.5">
                          {block.admin?.description || ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </BlockDrawer>
        </div>
      )}

      {children.length === 0 && canAddChildren && (
        <div
          className="text-xs text-[var(--kyro-text-muted)] italic py-2"
          style={{ marginLeft: depth * indentWidth }}
        >
          No blocks added. Click "Add Block" to add elements.
        </div>
      )}

      {depth >= maxDepth && children.length > 0 && (
        <div
          className="text-xs text-[var(--kyro-text-muted)] italic"
          style={{ marginLeft: depth * indentWidth }}
        >
          Maximum nesting level ({maxDepth}) reached
        </div>
      )}
    </div>
  );
};
