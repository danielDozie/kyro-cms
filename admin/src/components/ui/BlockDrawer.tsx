import "../../lib/i18n";
import React, { type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { SlidePanel } from "./SlidePanel";
import { ClipboardPaste } from "lucide-react";
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
      <p className="text-sm text-[var(--kyro-text-muted)] mb-4">
        Drag blocks into the editor or click to insert
      </p>

      {onPasteBlock && (
        <div className="mb-6 pb-6 border-b border-[var(--kyro-border)]">
          <button
            onClick={handlePaste}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] text-sm font-semibold transition-all hover:bg-[var(--kyro-primary)]/5"
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste Block from Clipboard
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
  children,
}: {
  block: { type: string; label: string; icon: React.ReactNode; description: string };
  onSelect: (type: string) => void;
  children?: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drawer-${block.type}`,
    data: { source: "drawer", blockType: block.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(block.type)}
      className={`flex flex-col items-center text-center gap-1 p-2 rounded-md border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/60 hover:bg-[var(--kyro-surface-accent)]/30 transition-all cursor-pointer group ${isDragging ? "opacity-50 border-[var(--kyro-primary)]" : ""
        }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="w-6 h-6 flex items-center justify-center rounded group-hover:bg-[var(--kyro-primary)]/10 group-hover:text-[var(--kyro-primary)] transition-all duration-300">
        {children || (
          <span className="text-[var(--kyro-text-muted)]">
            {/* Default icon */}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium  tracking-tight text-[var(--kyro-text-primary)] leading-tight">
          {block.label}
        </div>
        <div className="text-[10px] text-[var(--kyro-text-muted)] mt-0.5 leading-tight">
          {block.description}
        </div>
      </div>
    </div>
  );
}

export interface BlockType {
  type: string;
  label: string;
  icon: string;
}
