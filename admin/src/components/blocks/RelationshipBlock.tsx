import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { ChevronRight, X } from "../ui/icons";
import { RelationshipBlockField } from "../fields/RelationshipBlockField";
import { useTranslation } from "react-i18next";

interface RelationshipBlockData {
  relationTo?: string;
  hasMany?: boolean;
  selectedIds?: string[];
  selectedId?: string;
  labelField?: string;
}

export const RelationshipBlock: React.FC<{ block: { id: string; data?: Record<string, unknown> }; index: number }> = ({
  block,
  index,
}) => {
    const { t } = useTranslation();
  const blockData = useBlockById(block.id);
  const { updateBlock, removeBlock, moveBlock } = useBlockActions();

  const data = (blockData?.data ?? block.data ?? {}) as RelationshipBlockData;

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  return (
    <div className="block-relationship border border-[var(--kyro-border)] rounded-md p-3 mb-2 relative group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--kyro-text-muted)] ">
            Relationship
          </span>
          <span className="text-[10px] text-[var(--kyro-text-muted)]">
            → {data.relationTo || "pages"}
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

      <RelationshipBlockField
        relationTo={data.relationTo || "pages"}
        hasMany={data.hasMany || false}
        selectedIds={Array.isArray(data.selectedIds) ? data.selectedIds : []}
        selectedId={data.selectedId}
        labelField={data.labelField || "title"}
        onChange={handleChange}
        compact
      />
    </div>
  );
};
