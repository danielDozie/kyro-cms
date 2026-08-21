import "../../lib/i18n";
import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { ChevronRight, X } from "../ui/icons";
import { ChildBlocksTree } from "./ChildBlocksTree";
import { useTranslation } from "react-i18next";
import type { BlockData } from "@kyro-cms/core/client";

export const ArrayBlock: React.FC<{ block: { id: string; data?: Record<string, unknown>; children?: BlockData[] }; index: number }> = ({
  block,
  index,
}) => {
    const { t } = useTranslation();
  const blockData = useBlockById(block.id);
  const { updateBlock, removeBlock, moveBlock } = useBlockActions();

  const data = (blockData?.data ?? block.data ?? {}) as Record<string, unknown>;
  const children = (blockData?.children ?? block.children ?? []) as BlockData[];

  return (
    <div className="block-array border border-[var(--kyro-border)] rounded-md p-3 mb-2 relative group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--kyro-text-muted)] ">
            Repeater
          </span>
          <span className="text-[10px] text-[var(--kyro-text-muted)]">
            ({children.length} items)
          </span>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => moveBlock(block.id, "up")}
            className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded"
            title={t("tooltips.moveUp", { defaultValue: "Move up" })}
          >
            <ChevronRight className="w-3 h-3 rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => moveBlock(block.id, "down")}
            className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded"
            title={t("tooltips.moveDown", { defaultValue: "Move down" })}
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => removeBlock(block.id)}
            className="p-1 hover:bg-[var(--kyro-danger-bg)] rounded text-[var(--kyro-danger)]"
            title={t("tooltips.remove", { defaultValue: "Remove" })}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <ChildBlocksTree
          blockId={block.id}
          children={children}
          onUpdateChildren={(c) => updateBlock(block.id, { children: c })}
        />
      </div>
    </div>
  );
};
