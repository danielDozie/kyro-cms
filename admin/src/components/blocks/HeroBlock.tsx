import React from "react";
import type { BlockData } from "@kyro-cms/core/client";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { ChevronRight, X } from "../ui/icons";
import { HeroField } from "../fields/HeroField";
import { UploadField } from "../fields/UploadField";
import { ChildBlocksTree } from "./ChildBlocksTree";
import { useTranslation } from "react-i18next";

interface HeroBlockData {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  bgImage?: string | null;
}

export const HeroBlock: React.FC<{ block: { id: string; data?: Record<string, unknown>; children?: BlockData[] }; index: number }> = ({
  block,
  index,
}) => {
    const { t } = useTranslation();
  const blockData = useBlockById(block.id);
  const { updateBlock, removeBlock, moveBlock } = useBlockActions();

  const data = (blockData?.data ?? block.data ?? {}) as HeroBlockData;
  const children = (blockData?.children ?? block.children ?? []) as BlockData[];

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  return (
    <div className="block-hero border border-[var(--kyro-border)] rounded-md p-3 mb-2 relative group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--kyro-text-muted)] ">
            Hero Section
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
        <HeroField
          heading={data.title || ""}
          subheading={data.subtitle || ""}
          ctaText={data.ctaText || ""}
          ctaUrl={data.ctaUrl || ""}
          onChange={handleChange}
          compact
        />

        <UploadField
          field={{ label: "Background", name: "bgImage", maxCount: 1 }}
          value={data.bgImage}
          onChange={(v) => handleChange("bgImage", v)}
        />

        <div className="pt-3 border-t border-[var(--kyro-border)]">
          <label className="text-[10px] font-medium text-[var(--kyro-text-muted)] mb-1.5 block">
            Children ({children.length})
          </label>
          <ChildBlocksTree
            blockId={block.id}
            children={children}
            onUpdateChildren={(c) => updateBlock(block.id, { children: c })}
          />
        </div>
      </div>
    </div>
  );
};
