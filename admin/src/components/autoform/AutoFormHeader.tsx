import { isStudioEnabled } from "../../lib/config";
import { CompositionActions } from "./CompositionActions";
import "../../lib/i18n";
import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, Check } from "../ui/icons";
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/Dropdown";
import { SplitButton } from "../ui/SplitButton";
import type { SplitButtonStatus } from "../ui/SplitButton";
import { useAutoFormStore } from "../../lib/autoform-store";
import { useClickOutside } from "../../hooks/useClickOutside";
import { isStudioCollection } from "../../lib/studio";
import { confirmEditorSwitch } from "../../lib/editor-switch";
import { adminPath as ADMIN_BASE } from "../../lib/paths";
import { useTranslation } from "react-i18next";
import { CollaboratorAvatars } from "../collaboration/CollaboratorAvatars";

type View = "edit" | "version" | "api";

interface AutoFormHeaderProps {
  config?: any;
  studio?: boolean;
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
  config,
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
  const [compositionOpen, setCompositionOpen] = useState(false);
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


  useClickOutside(scheduleRef, () => {
    if (showSchedulePicker) setShowSchedulePicker(false);
  });

  const useTitleField = config?.admin?.useAsTitle;
  const rawTitle =
    (useTitleField && formData[useTitleField] !== undefined && formData[useTitleField] !== null && formData[useTitleField] !== ""
      ? formData[useTitleField]
      : null) ||
    formData.orderNumber ||
    formData.title ||
    formData.name ||
    formData.fullName ||
    formData.label ||
    formData.heading ||
    formData.email ||
    formData.slug ||
    (formData.tabs as { title?: string })?.title ||
    (formData.id ? `Order #${String(formData.id).slice(-6)}` : null) ||
    "Untitled";

  const docTitle =
    typeof rawTitle === "object" && rawTitle !== null
      ? (rawTitle as any).title || (rawTitle as any).name || (rawTitle as any).orderNumber || (rawTitle as any).fullName || "Untitled"
      : String(rawTitle);

  const lastModified = formData.updatedAt
    ? new Date(formData.updatedAt as string).toLocaleString()
    : "Just now";
  const createdAt = formData.createdAt
    ? new Date(formData.createdAt as string).toLocaleString()
    : "Just now";

  const draftsEnabled = config?.versions?.drafts === true;
  const statusLabel = !draftsEnabled ? (hasUnsavedChanges ? "Unsaved changes" : "Synced") : (hasUnpublishedChanges || hasUnsavedChanges)
    ? 'Unpublished draft'
    : documentStatus === 'published'
      ? 'Published'
      : 'Draft';

  const statusColor = documentStatus === 'published' && !hasUnsavedChanges && !hasUnpublishedChanges
    ? 'bg-[var(--kyro-success)]'
    : hasUnpublishedChanges
      ? 'bg-[var(--kyro-warning)]'
      : 'bg-[var(--kyro-text-muted)]';

  const renderAutoSaveStatus = (compact = false) => (
    <>
      {autoSaveStatus === "saving" && (
        <span className="flex items-center gap-1.5 text-[var(--kyro-text-muted)]">
          <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {draftsEnabled ? (compact ? "Syncing…" : "Syncing…") : "Syncing…"}
        </span>
      )}
      {(autoSaveStatus === "success" || (autoSaveStatus === "idle" && lastSavedAt && hasUnpublishedChanges)) && (
        <span className="text-[var(--kyro-success)] flex items-center gap-1">
          <Check className="w-3.5 h-3.5 shrink-0" />
          {compact
            ? (draftsEnabled ? "Synced" : "Synced")
            : lastSavedAt ? `${draftsEnabled ? "Synced" : "Synced"} ${Math.floor((Date.now() - lastSavedAt) / 60000)}m ago` : "Synced"}
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
          className="kyro-btn p-2 md:p-2.5 rounded-md border border-[var(--kyro-border)] hover:bg-[var(--kyro-bg-secondary)] transition-all"
          aria-label="Document actions"
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
      density="compact"
      menuClassName="editor-document-menu"
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
        {draftsEnabled ? "Save draft" : "Save changes"}
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
          Create new
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
      {draftsEnabled && (<DropdownItem
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
        Schedule publish
      </DropdownItem>)}
      {draftsEnabled && documentStatus === "published" && (
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
      {!globalSlug && collectionSlug && draftsEnabled && <>
        <DropdownSeparator />
        <DropdownItem
          onClick={() => setCompositionOpen(true)}
          disabled={hasUnsavedChanges || autoSaveStatus === "saving"}
          className="editor-composition-action"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        >
          <span className="flex items-center justify-between gap-3"><span>Convert / recover</span><small className="editor-action-tag">Advanced</small></span>
        </DropdownItem>
      </>}
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
      <div className="absolute right-0 top-2 p-4 rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)]  z-50 min-w-[260px]">
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
    <header className="editor-header">
      {!isNew && collectionSlug && config?.versions?.drafts && <CompositionActions collection={collectionSlug} open={compositionOpen} onClose={() => setCompositionOpen(false)} />}
      <div className="editor-heading-row">
        <div className="editor-identity">
          <h1 title={docTitle}>{docTitle}</h1>
        </div>
        <div className="editor-publish-actions">
          {!globalSlug && collectionSlug && config && isStudioEnabled && isStudioCollection(config) && (
            <button
              type="button"
              aria-haspopup="dialog"
              className="kyro-btn kyro-btn-md kyro-btn-secondary"
              onClick={() => confirmEditorSwitch(`${ADMIN_BASE}/studio/${collectionSlug}/${formData.id || "new"}`, "Studio", {
                editingDocument: true,
                saving: localSaveStatus === "saving",
              })}
            >
              Open Studio
            </button>
          )}
          <CollaboratorAvatars documentId={formData.id as string} collectionSlug={collectionSlug} />
          <button type="button" aria-pressed={showPreview} onClick={() => setShowPreview(!showPreview)} className="kyro-btn kyro-btn-md kyro-btn-secondary">
            <ExternalLink className="w-4 h-4" aria-hidden="true" />{showPreview ? "Close preview" : "Preview"}
          </button>
          {renderKebabMenu()}
          {renderSchedulePicker()}
          {isNew && draftsEnabled && <button type="button" className="kyro-btn kyro-btn-md kyro-btn-secondary" disabled={localSaveStatus === "saving"} onClick={handleSaveDraft}>Save draft</button>}
          {draftsEnabled ? <SplitButton status={documentStatus as SplitButtonStatus} saveStatus={localSaveStatus} hasChanges={hasUnsavedChanges || hasUnpublishedChanges} onPublish={handlePublish} disabled={localSaveStatus === "saving"} /> :
            <button type="button" className="kyro-btn kyro-btn-md kyro-btn-primary" onClick={handleSaveDraft}
              disabled={localSaveStatus === "saving" || (!isNew && !hasUnsavedChanges)}>
              {localSaveStatus === "saving" ? "Syncing…" : "Save changes"}
            </button>}
        </div>
      </div>
      <div className="editor-context-row">
        <div className="editor-view-tabs" aria-label="Document view">
          {(["edit", "version", "api"] as const).map(v => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v === "edit" ? "Content" : v === "version" ? "History" : "API"}</button>)}
        </div>
        <div className="editor-document-state">
          <span className="editor-status-label"><span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} aria-hidden="true" />{statusLabel}</span>
          <span role="status" aria-live="polite">{renderAutoSaveStatus(true)}</span>
          {hasUnsavedChanges && autoSaveStatus !== "saving" && autoSaveStatus !== "conflict" && <button type="button" onClick={() => useAutoFormStore.getState().loadDocument(lastSavedData, lastSavedData)} className="editor-revert">Revert changes</button>}
          <details className="editor-document-info"><summary>Details</summary><dl><dt>Modified</dt><dd>{lastModified}</dd><dt>Created</dt><dd>{createdAt}</dd></dl></details>
        </div>
      </div>
    </header>
  );
}
