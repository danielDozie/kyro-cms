import React from "react";
import type { ReactNode } from "react";
import { Dropdown } from "./Dropdown";
import { Spinner } from "./Spinner";

export type SplitButtonStatus = "draft" | "published" | "scheduled" | "archived";
export type SplitButtonSaveStatus = "idle" | "saving" | "saved" | "error";

export interface SplitButtonProps {
  /** Current publish status of the document */
  status: SplitButtonStatus;
  /** Live save operation status driven by the parent */
  saveStatus: SplitButtonSaveStatus;
  /** True when the form has unsaved changes vs last persisted version */
  hasChanges: boolean;
  /** Called when the main publish button is clicked */
  onPublish: () => void;
  /** Publish-variant items for the chevron dropdown (Save as Draft, Schedule) */
  children?: ReactNode;
  disabled?: boolean;
  direction?: "up" | "down";
}

export function SplitButton({
  status,
  saveStatus,
  hasChanges,
  onPublish,
  children,
  disabled,
  direction = "down",
}: SplitButtonProps) {
  const isPublishedAndClean =
    status === "published" && !hasChanges && saveStatus !== "saving" && saveStatus !== "error";

  const isDisabled = disabled || saveStatus === "saving" || isPublishedAndClean;

  // ── button colour ──────────────────────────────────────────────────────────
  const btnBase =
    "kyro-btn kyro-btn-sm text-[11px] font-regular tracking-widest transition-all duration-300 rounded-lg";

  const getBtnClass = () => {
    if (saveStatus === "saving") return `${btnBase} bg-[var(--kyro-primary)]/70 border-[var(--kyro-primary)]/70 text-[var(--kyro-sidebar-text-active)] cursor-wait`;
    if (saveStatus === "error")  return `${btnBase} bg-[var(--kyro-error)]   border-[var(--kyro-error)]   text-[var(--kyro-sidebar-text-active)]`;
    if (isPublishedAndClean)     return `${btnBase} bg-[var(--kyro-gray-200)] border-[var(--kyro-gray-200)] text-[var(--kyro-text-muted)] cursor-not-allowed`;
    // has changes or draft → primary action
    return `${btnBase} bg-[var(--kyro-primary)] border-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)] hover:bg-[var(--kyro-primary-hover)]`;
  };

  const chevronBase =
    "kyro-btn kyro-btn-md px-2 rounded-l-none border-l-[1px] border-white/20 transition-all duration-300";

  const getChevronClass = () => {
    if (saveStatus === "saving") return `${chevronBase} bg-[var(--kyro-primary)]/70 text-[var(--kyro-sidebar-text-active)] border-[var(--kyro-primary)]/70`;
    if (saveStatus === "error")  return `${chevronBase} bg-[var(--kyro-error)]   text-[var(--kyro-sidebar-text-active)] border-[var(--kyro-error)]`;
    if (isPublishedAndClean)     return `${chevronBase} bg-[var(--kyro-gray-200)] text-[var(--kyro-text-muted)] border-[var(--kyro-gray-200)]`;
    return `${chevronBase} bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)] border-[var(--kyro-primary)] hover:bg-[var(--kyro-primary-hover)]`;
  };

  // ── label ──────────────────────────────────────────────────────────────────
  const getLabel = () => {
    if (saveStatus === "saving") return "Publishing...";
    if (saveStatus === "error")  return "Retry";
    if (isPublishedAndClean)     return "Published";
    return "Publish Changes";
  };

  return (
    <div className="inline-flex items-center">
      {/* Main publish button */}
      <button
        type="button"
        onClick={onPublish}
        disabled={isDisabled}
        className={`${getBtnClass()} ${!children ? "rounded-r-lg border-r border-[var(--kyro-border)]" : ""}`}
      >
        {saveStatus === "saving" && <Spinner size="sm" className="inline mr-1.5" />}
        {isPublishedAndClean && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline mr-1">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {getLabel()}
      </button>

      {/* Chevron → publish-variant actions only */}
      {children && (
        <Dropdown
          trigger={
            <button type="button" className={getChevronClass()} disabled={saveStatus === "saving"}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          }
          direction={direction}
        >
          {children}
        </Dropdown>
      )}
    </div>
  );
}

