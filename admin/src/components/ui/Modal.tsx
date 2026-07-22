import { X } from "./icons";
import React, { useEffect, type ReactNode } from "react";
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
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
  variant = "default",
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

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
        className={`absolute inset-0 transition-all duration-500 ${isLightbox ? "bg-black/95 backdrop-blur-none" : "bg-[var(--kyro-black)]/40 backdrop-blur-md"}`}
        onClick={onClose}
      />
      <div
        className={`relative ${sizeClasses[size]} ${isLightbox ? "bg-transparent text-white" : "bg-[var(--kyro-surface)]"} ${!isLightbox && size !== "full" ? "rounded-[var(--kyro-radius-lg)]" : ""} shadow-2xl animate-in fade-in zoom-in-95 duration-300 ${!isLightbox ? "border" : ""} ${variant === "danger"
          ? "border-red-500/30"
          : "border-[var(--kyro-border)]"
          } flex flex-col overflow-hidden`}
      >
        {!isLightbox && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/50 backdrop-blur-md">
            <h2 className="text-xl font-bold text-[var(--kyro-text-primary)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] rounded-xl hover:bg-[var(--kyro-surface)] transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className={`flex-1 overflow-auto ${isLightbox ? "" : "px-8 py-8"}`}>{children}</div>
        {footer && !isLightbox && (
          <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/50">
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
