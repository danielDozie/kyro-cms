import "../../lib/i18n";
import React from "react";
import {
  useBlockById,
  useBlockActions,
} from "../fields/extensions/blocksStore";
import { ChevronRight, X } from "../ui/icons";
import { UploadField } from "../fields/UploadField";
import { useTranslation } from "react-i18next";

interface ImageBlockData {
  src?: string | null;
  alt?: string;
  caption?: string;
}

export const ImageBlock: React.FC<{ block: { id: string; data?: Record<string, unknown> }; index: number }> = ({
  block,
  index,
}) => {
    const { t } = useTranslation();
  const blockData = useBlockById(block.id);
  const { updateBlock, removeBlock, moveBlock } = useBlockActions();
  const data = (blockData?.data ?? block.data ?? {}) as ImageBlockData;

  const handleChange = (field: string, value: unknown) => {
    updateBlock(block.id, { data: { ...data, [field]: value } });
  };

  return (
    <div className="block-image border border-[var(--kyro-border)] rounded-lg p-4 mb-4 relative group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--kyro-text-muted)] ">
          Image
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button"
            onClick={() => moveBlock(block.id, "up")}
            className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded"
            title={t("tooltips.moveUp", { defaultValue: "Move up" })}
          >
            <ChevronRight className="w-3 h-3 rotate-90" />
          </button>
          <button type="button"
            onClick={() => removeBlock(block.id)}
            className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded"
            title={t("tooltips.remove", { defaultValue: "Remove" })}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-[var(--kyro-text-muted)] mb-1 block">
            Image Asset
          </label>
          <UploadField
            field={{ label: "Image Asset", name: "src", maxCount: 1 }}
            value={data.src}
            onChange={(value) => handleChange("src", value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--kyro-text-muted)] mb-1 block">
            Alt Text
          </label>
          <input
            type="text"
            value={data.alt || ""}
            onChange={(e) => handleChange("alt", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--kyro-border)] rounded bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] text-sm"
            placeholder={t("fields.alternativeText", { defaultValue: "Alternative text..." })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--kyro-text-muted)] mb-1 block">
            Caption
          </label>
          <input
            type="text"
            value={data.caption || ""}
            onChange={(e) => handleChange("caption", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--kyro-border)] rounded bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] text-sm"
            placeholder={t("fields.imageCaption", { defaultValue: "Image caption..." })}
          />
        </div>
      </div>
    </div>
  );
};
