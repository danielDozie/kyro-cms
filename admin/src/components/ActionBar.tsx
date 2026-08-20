import { useState, useRef, useEffect } from "react";
import { IconSend, IconClock, IconUndo, IconCopy, IconEye, IconTrash2, IconMoreVertical, ClipboardPaste, ClipboardCopy } from "./ui/icons";
import { DropdownItem, DropdownSeparator } from "./ui/Dropdown";
import { SplitButton } from "./ui/SplitButton";
import { Spinner } from "./ui/Spinner";
import { useAutoFormStore } from "../lib/autoform-store";
import { useClickOutside } from "../hooks/useClickOutside";
import { useTranslation } from "react-i18next";

export type DocumentStatus = "draft" | "published" | "scheduled" | "archived";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface ActionBarProps {
  status: DocumentStatus;
  saveStatus: SaveStatus;
  hasChanges: boolean;
  onSave: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onDuplicate?: () => void;
  onViewHistory?: () => void;
  onPreview?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  onToggleSidebar?: () => void;
  publishedAt?: string | null;
  updatedAt?: string | null;
  onCopyData?: () => void;
  onPasteData?: () => void;
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-[var(--kyro-warning)]",
  published: "bg-[var(--kyro-success)]",
  scheduled: "bg-[var(--kyro-primary)]",
  archived: "bg-[var(--kyro-text-muted)]",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "var(--kyro-warning)",
  published: "var(--kyro-success)",
  scheduled: "var(--kyro-primary)",
  archived: "var(--kyro-text-muted)",
};

export function ActionBar({
  status,
  saveStatus,
  hasChanges,
  onSave,
  onPublish,
  onUnpublish,
  onDuplicate,
  onViewHistory,
  onPreview,
  onDelete,
  onBack,
  onToggleSidebar,
  publishedAt,
  updatedAt,
  onCopyData,
  onPasteData,
}: ActionBarProps) {
  const { t } = useTranslation();
  const view = useAutoFormStore((s) => s.view) || "edit";
  const setView = useAutoFormStore((s) => s.setView);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useClickOutside(moreRef, () => {
    if (moreOpen) setMoreOpen(false);
  });

  const getSaveStatusText = () => {
    if (saveStatus === "saving") return "Saving...";
    if (saveStatus === "saved") return "Saved";
    if (saveStatus === "error") return "Error saving";
    if (hasChanges) return "Unsaved";
    return null;
  };

  const tabs = ["edit", "version", "api"] as const;
  const saveText = getSaveStatusText();

  const iconBtnClass = "p-1.5 rounded-lg hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] transition-all shrink-0";

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--kyro-surface)] border-b border-[var(--kyro-border)] w-full overflow-x-auto">
      {onBack && (
        <button type="button" onClick={onBack} className="p-1 rounded-lg hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] transition-all shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status] || "bg-[var(--kyro-text-muted)]"}`} />

      {saveText && (
        <span className={`text-[10px] whitespace-nowrap max-md:hidden ${saveStatus === "error" ? "text-[var(--kyro-error)]" : "text-[var(--kyro-text-muted)]"}`}>
          {saveStatus === "saving" && <Spinner size="sm" className="inline mr-0.5" />}
          {saveText}
        </span>
      )}

      <div className="flex items-center gap-0.5 bg-[var(--kyro-bg-secondary)] p-0.5 rounded-lg border border-[var(--kyro-border)] shrink-0 max-md:hidden">
        {tabs.map((v) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${view === v
                ? "bg-[var(--kyro-surface)] shadow-sm border border-[var(--kyro-border)] text-[var(--kyro-text-primary)]"
                : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
              }`}
          >
            {v === "edit" ? "Edit" : v === "version" ? "Ver" : "API"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {onPreview && (
          <button type="button" onClick={onPreview} className={`${iconBtnClass} max-md:hidden`} title={t("tooltips.preview", { defaultValue: "Preview" })}>
            <IconEye className="w-3.5 h-3.5" />
          </button>
        )}
        {onViewHistory && (
          <button type="button" onClick={onViewHistory} className={`${iconBtnClass} max-md:hidden`} title={t("tooltips.viewHistory", { defaultValue: "View History" })}>
            <IconClock className="w-3.5 h-3.5" />
          </button>
        )}
        {onDuplicate && (
          <button type="button" onClick={onDuplicate} className={`${iconBtnClass} max-md:hidden`} title={t("tooltips.duplicate", { defaultValue: "Duplicate" })}>
            <IconCopy className="w-3.5 h-3.5" />
          </button>
        )}
        {onCopyData && (
          <button type="button" onClick={onCopyData} className={`${iconBtnClass} max-md:hidden`} title={t("tooltips.copyData", { defaultValue: "Copy Data" })}>
            <ClipboardCopy className="w-3.5 h-3.5" />
          </button>
        )}
        {onPasteData && (
          <button type="button" onClick={onPasteData} className={`${iconBtnClass} max-md:hidden`} title={t("tooltips.pasteData", { defaultValue: "Paste Data" })}>
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete} className={`${iconBtnClass} hover:bg-[var(--kyro-danger-bg)] hover:text-[var(--kyro-danger)] max-md:hidden`} title={t("tooltips.delete", { defaultValue: "Delete" })}>
            <IconTrash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {onToggleSidebar && (
          <button type="button" onClick={onToggleSidebar} className={`${iconBtnClass} max-md:hidden`} title={t("tooltips.toggleSidebar", { defaultValue: "Toggle Sidebar" })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}

        {/* Mobile overflow menu */}
        <div ref={moreRef} className="relative md:hidden">
          <button type="button" onClick={() => setMoreOpen(!moreOpen)} className={iconBtnClass} title={t("tooltips.more", { defaultValue: "More" })}>
            <IconMoreVertical className="w-3.5 h-3.5" />
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 py-1 max-h-[70vh] overflow-y-auto">
              {saveText && (
                <div className="px-3 py-2 text-[10px] text-[var(--kyro-text-muted)] border-b border-[var(--kyro-border)] flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
                  <span className="capitalize">{status}</span>
                  <span>·</span>
                  {saveStatus === "saving" && <Spinner size="sm" className="inline" />}
                  <span>{saveText}</span>
                </div>
              )}
              <div className="flex gap-1 px-2 py-2 border-b border-[var(--kyro-border)]">
                {tabs.map((v) => (
                  <button key={v} type="button" onClick={() => { setView(v); setMoreOpen(false); }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all flex-1 ${view === v
                        ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]"
                        : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)]"
                      }`}
                  >
                    {v === "edit" ? "Edit" : v === "version" ? "Ver" : "API"}
                  </button>
                ))}
              </div>
              {onViewHistory && (
                <button type="button" onClick={() => { onViewHistory(); setMoreOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors">
                  <IconClock className="w-3.5 h-3.5" /> View History
                </button>
              )}
              {onDuplicate && (
                <button type="button" onClick={() => { onDuplicate(); setMoreOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors">
                  <IconCopy className="w-3.5 h-3.5" /> Duplicate
                </button>
              )}
              {onCopyData && (
                <button type="button" onClick={() => { onCopyData(); setMoreOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors">
                  <ClipboardCopy className="w-3.5 h-3.5" /> Copy Data
                </button>
              )}
              {onPasteData && (
                <button type="button" onClick={() => { onPasteData(); setMoreOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors">
                  <ClipboardPaste className="w-3.5 h-3.5" /> Paste Data
                </button>
              )}
              {onPreview && (
                <button type="button" onClick={() => { onPreview(); setMoreOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors">
                  <IconEye className="w-3.5 h-3.5" /> Preview
                </button>
              )}
              {onDelete && (
                <div className="border-t border-[var(--kyro-border)] mt-1 pt-1">
                  <button type="button" onClick={() => { onDelete(); setMoreOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--kyro-danger)] hover:bg-[var(--kyro-danger-bg)] transition-colors">
                    <IconTrash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-[var(--kyro-border)] mx-0.5" />

        {status === "published" && onUnpublish && (
          <button type="button" onClick={onUnpublish} disabled={saveStatus === "saving"}
            className="kyro-btn kyro-btn-secondary kyro-btn-sm flex items-center gap-1 shrink-0"
          >
            <IconUndo className="w-3.5 h-3.5" />
            <span className="max-md:hidden">Unpublish</span>
          </button>
        )}

        <SplitButton
          status={status}
          saveStatus={saveStatus}
          hasChanges={hasChanges}
          onPublish={onPublish || onSave}
        >
          {onPublish && (
            <DropdownItem icon={<IconSend className="w-4 h-4" />} onClick={onSave}>Save Draft</DropdownItem>
          )}
          {onDuplicate && (
            <DropdownItem icon={<IconCopy className="w-4 h-4" />} onClick={onDuplicate}>Duplicate</DropdownItem>
          )}
          {onCopyData && (
            <DropdownItem icon={<ClipboardCopy className="w-4 h-4" />} onClick={onCopyData}>Copy Data</DropdownItem>
          )}
          {onPasteData && (
            <DropdownItem icon={<ClipboardPaste className="w-4 h-4" />} onClick={onPasteData}>Paste Data</DropdownItem>
          )}
          {onViewHistory && (
            <DropdownItem icon={<IconClock className="w-4 h-4" />} onClick={onViewHistory}>View History</DropdownItem>
          )}
          {onPreview && (
            <DropdownItem icon={<IconEye className="w-4 h-4" />} onClick={onPreview}>Preview</DropdownItem>
          )}
          {(Boolean(onPublish) || Boolean(onDuplicate) || Boolean(onCopyData) || Boolean(onPasteData) || Boolean(onViewHistory) || Boolean(onPreview)) && <DropdownSeparator />}
          {onDelete && (
            <DropdownItem onClick={onDelete} danger icon={<IconTrash2 className="w-4 h-4" />}>Delete</DropdownItem>
          )}
        </SplitButton>
      </div>
    </div>
  );
}
