import { X } from "./icons";
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  showOverlay?: boolean;
  accentClass?: string;
}

export function SlidePanel({
  open,
  onClose,
  title,
  children,
  width = "md",
  showOverlay = false,
  accentClass,
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

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

  const widthClasses = {
    sm: "w-full sm:w-[320px]",
    md: "w-full sm:w-[400px]",
    lg: "w-full sm:w-[550px]",
    xl: "w-full sm:w-[700px]",
  };

  if (!open || !hydrated) return null;

  return createPortal(
    <>
      {showOverlay && (
        <div
          className="fixed inset-0 z-[99998] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        ref={panelRef}
        data-kyro-slide-panel="true"
        data-kyro-slide-width={width}
        className={`fixed right-0 top-0 bottom-0 z-[99999] ${widthClasses[width]} bg-[var(--kyro-surface)] ${accentClass ? `border-l-2 ${accentClass}` : "border-l border-[var(--kyro-border)]"
          } shadow-2xl flex flex-col animate-slideIn`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
          <h2 className="text-sm font-semibold text-[var(--kyro-text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn {
          animation: slideIn 300ms ease-out;
        }
      `}</style>
    </>,
    document.body,
  );
}
