import { isStudioEnabled } from "../../lib/config";
import { layoutBlockTypes } from "@kyro-cms/core/client";
import "../../lib/i18n";
import React, { type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { SlidePanel } from "./SlidePanel";
import { Box, ClipboardPaste } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BlockDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (blockType: string) => void;
  onPasteBlock?: (blockData: any) => void;
  children?: ReactNode;
}

export function BlockDrawer({
  open,
  onClose,
  onSelect,
  onPasteBlock,
  children,
}: BlockDrawerProps) {
    const { t } = useTranslation();
  const [pasteError, setPasteError] = React.useState<string | null>(null);

  const handlePaste = async () => {
    try {
      setPasteError(null);
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (parsed.__kyro_block) {
        if (onPasteBlock) {
          onPasteBlock(parsed);
        }
      } else {
        setPasteError("Clipboard does not contain a valid Kyro block.");
      }
    } catch (err) {
      setPasteError("Failed to read block from clipboard.");
      console.error(err);
    }
  };

  if (!open) return null;

  return (
    <SlidePanel open={open} onClose={onClose} title={t("tooltips.insertBlock", { defaultValue: "Insert Block" })} width="md">
      {onPasteBlock && (
        <div className="mb-4 pb-4 border-b border-[var(--kyro-border)]">
          <button
            onClick={handlePaste}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] text-xs font-normal transition-all hover:bg-[var(--kyro-primary)]/5"
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste block
          </button>
          {pasteError && (
            <p className="text-xs text-red-500 mt-2 text-center font-medium">{pasteError}</p>
          )}
        </div>
      )}

      {children}
    </SlidePanel>
  );
}

// Draggable wrapper for block types in the drawer
export function DraggableBlockType({
  block,
  onSelect,
}: {
  block: { type: string; label: string; icon: React.ReactNode; description: string };
  onSelect: (type: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drawer-${block.type}`,
    data: { source: "drawer", blockType: block.type },
  });

  if (!isStudioEnabled && layoutBlockTypes.has(block.type)) return null;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(block.type)}
      className={`kyro-block-tile flex flex-col items-center justify-center text-center gap-2 p-3 rounded-md border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/60 hover:bg-[var(--kyro-surface-accent)]/30 transition-all cursor-pointer group ${isDragging ? "opacity-50 border-[var(--kyro-primary)]" : ""
        }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <BlockPickerIcon>{block.icon}</BlockPickerIcon>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium  tracking-tight text-[var(--kyro-text-primary)] leading-tight">
          {block.label}
        </div>

      </div>
    </div>
  );
}

export function BlockPickerIcon({ children }: { children?: ReactNode }) {
  return (
    <span className="kyro-block-picker-icon" aria-hidden="true">
      {children ?? <Box size={14} />}
    </span>
  );
}

export interface BlockType {
  type: string;
  label: string;
  icon: string;
}
