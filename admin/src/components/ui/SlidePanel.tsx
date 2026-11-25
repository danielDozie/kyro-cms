import { X } from "./icons";
import React, { useEffect, useRef, useState, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  headerDetail?: ReactNode;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  showOverlay?: boolean;
  accentClass?: string;
  contained?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function SlidePanel({
  open,
  onClose,
  title,
  headerDetail,
  children,
  width = "md",
  showOverlay = false,
  accentClass,
  contained = false,
  containerRef,
}: SlidePanelProps) {
  const panelTitleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState(open);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const timeout = window.setTimeout(() => setPresent(false), 180);
    return () => window.clearTimeout(timeout);
  }, [open]);


  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (!showOverlay || event.key !== "Tab") return;
      const targets = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
      const first = targets[0], last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); panelRef.current?.focus({ preventScroll: true }); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus({ preventScroll: true }); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus({ preventScroll: true }); }
    };
    document.addEventListener("keydown", handleEscape);
    if (showOverlay) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, showOverlay]);

  const widthClasses = {
    sm: "w-full sm:w-[320px]",
    md: "w-full sm:w-[400px]",
    lg: "w-full sm:w-[550px]",
    xl: "w-full sm:w-[700px]",
  };

  if ((!open && !present) || !hydrated) return null;

  const content = (
    <>
      {showOverlay && (
        <div
          style={{ position: contained ? "absolute" : "fixed", inset: 0, zIndex: contained ? 39 : 99998, background: "rgba(0,0,0,.45)" }}
          aria-hidden="true"
          onClick={onClose}
        />
      )}
      <div
        style={{
          position: contained ? "absolute" : "fixed",
          inset: "0 0 0 auto",
          maxWidth: "100%",
          boxSizing: "border-box",
          contain: "layout paint",
          willChange: "transform",
          width: `min(100vw, ${{ sm: 320, md: 400, lg: 550, xl: 700 }[width]}px)`,
          zIndex: contained ? 40 : 99999,
          display: "flex",
          flexDirection: "column",
          background: "var(--kyro-surface, #161616)",
          color: "var(--kyro-text-primary, #ededed)",
          borderLeft: "1px solid var(--kyro-border, #303030)",
          animation: `${open ? "kyro-panel-from-right" : "kyro-panel-to-right"} ${open ? 220 : 180}ms cubic-bezier(.2,.8,.2,1) both`,
          pointerEvents: open ? "auto" : "none",
        }}
        ref={panelRef}
        inert={!open}
        role="dialog"
        tabIndex={-1}
        aria-modal={showOverlay || undefined}
        aria-labelledby={panelTitleId}
        data-kyro-slide-panel="true"
        data-kyro-slide-width={width}
        className={`fixed right-0 top-0 bottom-0 z-[99999] ${widthClasses[width]} bg-[var(--kyro-surface)] ${accentClass ? `border-l-2 ${accentClass}` : "border-l border-[var(--kyro-border)]"
          }  flex flex-col`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
          <div className="block-panel-heading"><h2 id={panelTitleId} className="text-sm font-medium text-[var(--kyro-text-primary)]">{title}</h2>{headerDetail}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarGutter: "stable", padding: 16 }}>{children}</div>
      </div>
      <style>{`
        @keyframes kyro-panel-from-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes kyro-panel-to-right {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-kyro-slide-panel] { animation: none !important; }
        }
      `}</style>
    </>
  );
  return contained ? (containerRef?.current ? createPortal(content, containerRef.current) : content) : createPortal(content, document.body);
}
