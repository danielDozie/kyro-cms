import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { ChevronRight, X } from "../ui/icons";
import { AccordionField, type AccordionItem } from "../fields/AccordionField";
import { useTranslation } from "react-i18next";

interface AccordionBlockData {
  items?: AccordionItem[];
}

export const AccordionBlock: React.FC<{ block: { id: string; data?: Record<string, unknown> }; index: number }> = ({
  block,
  index,
}) => {
    const { t } = useTranslation();
  const blockData = useBlockById(block.id);
  const { updateBlock, removeBlock, moveBlock } = useBlockActions();

  const data = (blockData?.data ?? block.data ?? {}) as AccordionBlockData;
  const items = Array.isArray(data.items) ? data.items : [];

  const handleChange = (items: AccordionItem[]) => {
    updateBlock(block.id, { data: { ...data, items } });
  };

  return (
    <div className="block-accordion border border-[var(--kyro-border)] rounded-md p-3 mb-2 relative group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--kyro-text-muted)] ">
            Accordion
          </span>
          <span className="text-[10px] text-[var(--kyro-text-muted)]">
            ({items.length} items)
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

      <AccordionField items={items} onChange={handleChange} compact />
    </div>
  );
};
