import "./overlays.css";
import { X } from "./icons";
import React, { useEffect, useRef, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ModalContent({ children }: { children: ReactNode }) {
  return <div className="text-[var(--kyro-text-secondary)]">{children}</div>;
}

export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 mt-6">{children}</div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  variant?: "default" | "danger" | "lightbox";
  compact?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
  variant = "default",
  compact = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';
    const getTargets = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(selector) || []).filter(el => el.getClientRects().length > 0);
    (dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") || getTargets()[0] || dialogRef.current)?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const targets = getTargets();
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); dialogRef.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "w-full h-full max-w-none rounded-none border-0",
  };

  const isLightbox = variant === "lightbox";

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 transition-all duration-500 ${isLightbox ? "bg-black/95 backdrop-blur-none" : "kyro-dialog-backdrop"}`}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={isLightbox ? undefined : titleId}
        aria-label={isLightbox ? title : undefined}
        tabIndex={-1}
        className={`workspace-dialog relative ${sizeClasses[size]} ${isLightbox ? "bg-transparent text-white" : "bg-[var(--kyro-surface)]"} ${!isLightbox && size !== "full" ? "rounded-[var(--kyro-radius-lg)]" : ""}  animate-in fade-in zoom-in-95 duration-300 ${!isLightbox ? "border" : ""} ${variant === "danger"
          ? "border-red-500/30"
          : "border-[var(--kyro-border)]"
          } flex flex-col overflow-hidden`}
      >
        {!isLightbox && (
          <div className={`flex items-center justify-between ${compact ? 'px-4 py-3' : 'px-6 py-4'} border-b border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/50 backdrop-blur-md`}>
            <h2 id={titleId} className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-[var(--kyro-text-primary)]`}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] rounded-md hover:bg-[var(--kyro-surface)] transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className={`flex-1 overflow-auto ${isLightbox ? "" : compact ? "px-4 py-4" : "px-6 py-6"}`}>{children}</div>
        {footer && !isLightbox && (
          <div className={`flex items-center justify-end ${compact ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-4'} border-t border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/50`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );

}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      compact
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="kyro-btn kyro-btn-md kyro-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`kyro-btn kyro-btn-md ${variant === "danger"
              ? "kyro-btn-danger"
              : "kyro-btn-primary"
              }`}
          >
            {loading ? "Loading..." : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[var(--kyro-text-secondary)]">{message}</p>
    </Modal>
  );
}
