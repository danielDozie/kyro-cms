import { X } from "./icons";
import React, { useState } from "react";
import { createPortal } from "react-dom";

interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
}

export function PromptModal({
  open,
  onClose,
  onSubmit,
  title,
  placeholder = "",
  defaultValue = "",
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg mx-4 bg-[var(--kyro-surface)] rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-[var(--kyro-border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--kyro-border)]">
          <h2 className="text-lg font-semibold text-[var(--kyro-text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] rounded-lg hover:bg-[var(--kyro-surface-accent)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="w-full px-3 py-2 border border-[var(--kyro-input-border)] rounded-lg bg-[var(--kyro-input-bg)] text-[var(--kyro-text-primary)] placeholder-[var(--kyro-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-sm border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] hover:text-[var(--kyro-text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
