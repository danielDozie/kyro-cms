import React from "react";
import { ChevronRight, X } from "../ui/icons";
import { useBlockActions } from "../fields/extensions/blocksStore";
import { useTranslation } from "react-i18next";

interface BlockWrapperProps {
  id: string;
  type: string;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  id,
  type,
  label,
  children,
  className = "",
}) => {
    const { t } = useTranslation();
  const { moveBlock, removeBlock } = useBlockActions();

  return (
    <div className={`block-${type} border border-[var(--kyro-border)] rounded-md p-3 mb-2 relative group bg-[var(--kyro-surface)] transition-all hover:border-[var(--kyro-primary)]/30 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-[var(--kyro-text-muted)]  tracking-wider">
          {label || type}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => moveBlock(id, "up")}
            className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded text-[var(--kyro-text-muted)] hover:text-[var(--kyro-primary)]"
            title={t("tooltips.moveUp", { defaultValue: "Move up" })}
          >
            <ChevronRight className="w-3 h-3 rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => moveBlock(id, "down")}
            className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded text-[var(--kyro-text-muted)] hover:text-[var(--kyro-primary)]"
            title={t("tooltips.moveDown", { defaultValue: "Move down" })}
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => removeBlock(id)}
            className="p-1 hover:bg-[var(--kyro-error)]/10 rounded text-[var(--kyro-error)]"
            title={t("tooltips.remove", { defaultValue: "Remove" })}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="block-content">
        {children}
      </div>
    </div>
  );
};
