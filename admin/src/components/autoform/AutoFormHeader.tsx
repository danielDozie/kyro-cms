import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ExternalLink, Check } from "../ui/icons";
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/Dropdown";
import { SplitButton } from "../ui/SplitButton";
import type { SplitButtonStatus } from "../ui/SplitButton";
import { useAutoFormStore } from "../../lib/autoform-store";
import { adminPath as ADMIN_BASE } from "../../lib/paths";
import { useTranslation } from "react-i18next";

type View = "edit" | "version" | "api";

interface AutoFormHeaderProps {
  collectionSlug?: string;
  globalSlug?: string;
  documentStatus: string;
  hasUnpublishedChanges: boolean;
  localSaveStatus: "idle" | "saving" | "saved" | "error";
  isDuplicating?: boolean;
  handleCreateNew: () => void;
  handleDuplicate: () => void;
  handleUnpublish: () => void;
  handleDelete: () => void;
  handlePublish: () => void;
  handleSaveDraft: () => void;
  handleSchedulePublish: (scheduledFor: string) => void;
  handleConflictOverride?: () => void;
}

export function AutoFormHeader({
  collectionSlug,
  globalSlug,
  documentStatus,
  hasUnpublishedChanges,
  localSaveStatus,
  isDuplicating,
  handleCreateNew,
  handleDuplicate,
  handleUnpublish,
  handleDelete,
  handlePublish,
  handleSaveDraft,
  handleSchedulePublish,
  handleConflictOverride,
}: AutoFormHeaderProps) {
    const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const {
    formData,
    hasUnsavedChanges,
    autoSaveStatus,
    lastSavedAt,
    retryCount,
    view,
    setView,
    showPreview,
    setShowPreview,
    setFormData,
    markSaved,
    lastSavedData,
  } = useAutoFormStore();

  const isNew = !formData.id;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setShowSchedulePicker(false);
      }
    };
    if (showSchedulePicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSchedulePicker]);

  const docTitle = String(
    (formData.tabs as { title?: string })?.title ||
    (typeof formData.title === "object" ? "" : formData.title) ||
    (typeof formData.name === "object" ? "" : formData.name) ||
    "Untitled",
  );

  const lastModified = formData.updatedAt
    ? new Date(formData.updatedAt as string).toLocaleString()
    : "Just now";
  const createdAt = formData.createdAt
    ? new Date(formData.createdAt as string).toLocaleString()
    : "Just now";

  const statusLabel = hasUnpublishedChanges
    ? 'Draft (unpublished changes)'
    : documentStatus === 'published'
      ? 'Published'
      : 'Draft';

  const statusLabelMobile = hasUnpublishedChanges
    ? 'Unpublished'
    : documentStatus === 'published'
      ? 'Published'
      : 'Draft';

  const statusColor = documentStatus === 'published' && !hasUnsavedChanges
    ? 'bg-[var(--kyro-success)]'
    : hasUnpublishedChanges
      ? 'bg-[var(--kyro-warning)]'
      : 'bg-[var(--kyro-text-muted)]';

  const statusBadgeBg = documentStatus === 'published' && !hasUnpublishedChanges
    ? 'bg-[var(--kyro-success)]/10 text-[var(--kyro-success)] border-[var(--kyro-success)]/20'
    : hasUnpublishedChanges
      ? 'bg-[var(--kyro-warning)]/10 text-[var(--kyro-warning)] border-[var(--kyro-warning)]/20'
      : 'bg-[var(--kyro-text-muted)]/10 text-[var(--kyro-text-muted)] border-[var(--kyro-text-muted)]/20';

  const renderAutoSaveStatus = (compact = false) => (
    <>
      {autoSaveStatus === "saving" && (
        <span className="flex items-center gap-1.5 text-[var(--kyro-text-muted)]">
          <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {compact ? "Saving…" : "Saving draft..."}
        </span>
      )}
      {autoSaveStatus === "success" && (
        <span className="text-[var(--kyro-success)] flex items-center gap-1">
          <Check className="w-3.5 h-3.5 shrink-0" />
          {compact
            ? "Saved"
            : lastSavedAt ? `Saved ${Math.floor((Date.now() - lastSavedAt) / 60000)}m ago` : "Draft saved"}
        </span>
      )}
      {autoSaveStatus === "retrying" && (
        <span className="text-[var(--kyro-warning)] flex items-center gap-1.5">
          <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {compact ? `Retry ${retryCount}/5` : `Retrying save (${retryCount}/5)`}
        </span>
      )}
      {autoSaveStatus === "offline" && (
        <span className="text-[var(--kyro-text-muted)] flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M10.61 10.61a3 3 0 0 0 4.24 4.24" />
            <path d="M13.36 13.36a3 3 0 0 0-4.24-4.24" />
            <path d="m2 2 20 20" />
            <path d="M18.36 5.64a9 9 0 0 0-12.72 0" />
            <path d="M22.61 1.39a15 15 0 0 0-21.22 0" />
          </svg>
          {compact ? "Offline" : "Offline — cached locally"}
        </span>
      )}
      {autoSaveStatus === "error" && (
        <span className="text-[var(--kyro-danger)]">{compact ? "Failed" : "Draft save failed"}</span>
      )}
      {autoSaveStatus === "conflict" && (
        compact ? (
          <span className="text-[var(--kyro-danger)] font-semibold">Conflict</span>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[var(--kyro-danger)] font-semibold">Conflict detected</span>
            <span className="opacity-30">—</span>
            <button
              type="button"
              onClick={() => handleConflictOverride?.()}
              className="text-[var(--kyro-primary)] hover:underline"
            >
              Keep my changes
            </button>
            <span className="opacity-30">|</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('kyro:soft-reload'))}
              className="text-[var(--kyro-danger)] hover:underline"
            >
              Reload server version
            </button>
          </div>
        )
      )}
    </>
  );

  const renderKebabMenu = () => !isNew && (
    <Dropdown
      trigger={
        <button
          type="button"
          className="kyro-btn p-2 md:p-2.5 rounded-xl border border-[var(--kyro-border)] hover:bg-[var(--kyro-bg-secondary)] transition-all"
          title={t("tooltips.moreActions", { defaultValue: "More actions" })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      }
      direction="down"
    >
      <DropdownItem
        onClick={handleSaveDraft}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        }
      >
        Save Draft
      </DropdownItem>
      {!globalSlug && (
        <DropdownItem
          onClick={handleCreateNew}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          Create New
        </DropdownItem>
      )}
      {!globalSlug && (
        <DropdownItem
          onClick={handleDuplicate}
          disabled={isDuplicating}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          }
        >
          {isDuplicating ? "Duplicating..." : "Duplicate"}
        </DropdownItem>
      )}
      <DropdownItem
        onClick={() => setShowSchedulePicker(true)}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        }
      >
        Schedule Publish
      </DropdownItem>
      {documentStatus === "published" && (
        <DropdownItem
          onClick={handleUnpublish}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          }
        >
          Unpublish
        </DropdownItem>
      )}
      {!globalSlug && (
        <>
          <DropdownSeparator />
          <DropdownItem
            onClick={handleDelete}
            danger
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            }
          >
            Delete
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );

  const renderSchedulePicker = () => showSchedulePicker && (
    <div ref={scheduleRef} className="relative">
      <div className="absolute right-0 top-2 p-4 rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)] shadow-2xl z-50 min-w-[260px]">
        <p className="text-xs font-medium mb-2">Schedule Publish</p>
        <input
          type="datetime-local"
          id="schedule-datetime"
          className="kyro-form-input text-xs mb-3 w-full"
          min={new Date().toISOString().slice(0, 16)}
        />
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => setShowSchedulePicker(false)}
            className="px-3 py-1.5 text-xs kyro-btn rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const val = (document.getElementById("schedule-datetime") as HTMLInputElement)?.value;
              if (val) handleSchedulePublish(val);
            }}
            className="px-3 py-1.5 text-xs kyro-btn-success rounded-lg"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE HEADER */}
      <header className="md:hidden border-b border-[var(--kyro-border)] z-50 bg-[var(--kyro-surface)] backdrop-blur-md rounded-lg">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <a
            href={`${ADMIN_BASE}/${collectionSlug}`}
            className="p-1.5 rounded-lg hover:bg-[var(--kyro-bg-secondary)] transition-colors shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </a>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight truncate min-w-0">{docTitle}</h1>
            <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${statusBadgeBg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
              {statusLabelMobile}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <SplitButton
              status={documentStatus as SplitButtonStatus}
              saveStatus={localSaveStatus}
              hasChanges={hasUnsavedChanges}
              onPublish={handlePublish}
              disabled={localSaveStatus === "saving"}
            />
            {renderKebabMenu()}
            {renderSchedulePicker()}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--kyro-border)]/50 bg-[var(--kyro-bg-secondary)]/30">
          <div className="flex items-center gap-0.5 bg-[var(--kyro-bg-secondary)] p-0.5 rounded-lg border border-[var(--kyro-border)]/50">
            {(["edit", "version", "api"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v as View)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${view === v
                  ? "bg-[var(--kyro-surface)] shadow-sm border border-[var(--kyro-border)] text-[var(--kyro-text-primary)]"
                  : "text-[var(--kyro-text-secondary)] opacity-50 active:opacity-100"
                  }`}
              >
                {v === "edit" ? "Edit" : v === "version" ? "History" : "API"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-medium">
            {renderAutoSaveStatus(true)}
            {hasUnsavedChanges && autoSaveStatus !== "saving" && autoSaveStatus !== "retrying" && autoSaveStatus !== "conflict" && (
              <button
                type="button"
                onClick={() => {
                  useAutoFormStore.getState().loadDocument(lastSavedData, lastSavedData);
                }}
                className="text-[var(--kyro-primary)] text-[10px] font-medium hover:underline"
              >
                Revert
              </button>
            )}
            <div className="h-4 w-px bg-[var(--kyro-border)] mx-0.5" />
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1.5 rounded-lg transition-all ${showPreview
                ? "bg-[var(--kyro-primary)]/10 text-[var(--kyro-primary)]"
                : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-bg-secondary)]"
                }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* DESKTOP HEADER */}
      <header className="hidden md:flex surface-tile px-8 py-6 items-center justify-between sticky top-0 border-b border-[var(--kyro-border)] mb-8 bg-[var(--kyro-surface)] z-50 backdrop-blur-md">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <a
              href={`${ADMIN_BASE}/${collectionSlug}`}
              className="p-2 border border-[var(--kyro-border)] rounded-xl hover:bg-[var(--kyro-bg-secondary)] transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </a>
            <h1 className="text-xl font-bold tracking-tighter truncate min-w-0">{docTitle}</h1>
            <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 rounded-full text-[10px] font-regular border ${statusBadgeBg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} />
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium tracking-wide opacity-60 ml-12">
            {renderAutoSaveStatus(false)}
            {hasUnsavedChanges && autoSaveStatus !== "saving" && autoSaveStatus !== "retrying" && autoSaveStatus !== "conflict" && (
              <>
                <span className="opacity-30">—</span>
                <button
                  type="button"
                  onClick={() => {
                    useAutoFormStore.getState().loadDocument(lastSavedData, lastSavedData);
                  }}
                  className="text-[var(--kyro-primary)] hover:underline"
                >
                  Revert changes
                </button>
              </>
            )}
            {lastSavedAt && autoSaveStatus !== "saving" && autoSaveStatus !== "retrying" && autoSaveStatus !== "success" && (
              <span className="border-l border-[var(--kyro-border)] pl-4">
                Draft saved {(() => {
                  const diffMs = now - lastSavedAt;
                  const diffMin = Math.floor(diffMs / 60_000);
                  const diffSec = Math.floor(diffMs / 1_000);
                  if (diffMin >= 1) return `${diffMin}m ago`;
                  if (diffSec >= 5) return `${diffSec}s ago`;
                  return "just now";
                })()}
              </span>
            )}
            <span className="border-l border-[var(--kyro-border)] pl-4">
              Modified {lastModified}
            </span>
            <span className="border-l border-[var(--kyro-border)] pl-4">
              Created {createdAt}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 bg-[var(--kyro-bg-secondary)] p-1 rounded-xl border border-[var(--kyro-border)]">
            {["edit", "version", "api"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v as View)}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${view === v ? "bg-[var(--kyro-surface)] shadow-sm border border-[var(--kyro-border)] text-[var(--kyro-text-primary)]" : "text-[var(--kyro-text-secondary)] opacity-50 hover:opacity-100"}`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-[var(--kyro-border)] mx-2" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`kyro-btn p-2.5 rounded-xl transition-all flex items-center gap-2 ${showPreview ? "shadow-lg" : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-bg-secondary)]"}`}
              title={t("tooltips.livePreview", { defaultValue: "Live Preview" })}
            >
              <ExternalLink className="w-4 h-4" />
              {showPreview && (
                <span className="text-[10px] font-bold tracking-widest pr-1">
                  Active
                </span>
              )}
            </button>
            {renderKebabMenu()}
            {renderSchedulePicker()}
            <SplitButton
              status={documentStatus as SplitButtonStatus}
              saveStatus={localSaveStatus}
              hasChanges={hasUnsavedChanges}
              onPublish={handlePublish}
              disabled={localSaveStatus === "saving"}
            />
          </div>
        </div>
      </header>
    </>
  );
}
