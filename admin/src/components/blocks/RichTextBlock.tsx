import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { ChevronRight, X, AlignLeft } from "../ui/icons";
import { RichTextField } from "../fields";
import { useTranslation } from "react-i18next";

export const RichTextBlock: React.FC<{ block: any; index: number }> = ({
  block,
  index,
}) => {
    const { t } = useTranslation();
  const blockData = useBlockById(block.id);
  const { updateBlock, removeBlock, moveBlock } = useBlockActions();

  const data = (blockData?.data || block.data || {}) as Record<string, any>;

  const handleChange = (newValue: unknown) => {
    updateBlock(block.id, { data: { ...data, content: newValue } });
  };

  return (
    <div className="block-richtext border border-[var(--kyro-border)] rounded-md p-3 mb-2 relative group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlignLeft className="w-3.5 h-3.5 text-[var(--kyro-primary)]" />
          <span className="text-xs font-semibold text-[var(--kyro-text-muted)] ">
            Rich Text
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

      <RichTextField
        field={{ name: "content", label: "Content", type: "richtext" } as any}
        value={data.content}
        onChange={handleChange}
      />
    </div>
  );
};
