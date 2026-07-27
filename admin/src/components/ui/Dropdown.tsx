import React, { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  direction?: "up" | "down";
}

export function Dropdown({
  trigger,
  children,
  align = "right",
  direction = "up",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const sidebar = triggerRef.current.closest("#kyro-sidebar");
    const isMinimized = sidebar?.getAttribute("data-minimized") === "true";
    const rect = triggerRef.current.getBoundingClientRect();

    if (isMinimized) {
      // Sidebar is minimized: float dropdown menu to the right of the sidebar rail
      setCoords({
        left: rect.right + 12,
        bottom: Math.max(12, window.innerHeight - rect.bottom),
      });
    } else {
      // Standard dropdown positioning inside trigger bounds
      if (align === "right") {
        setCoords({
          right: Math.max(12, window.innerWidth - rect.right),
          bottom: direction === "up" ? Math.max(12, window.innerHeight - rect.top + 8) : undefined,
          top: direction === "down" ? rect.bottom + 8 : undefined,
        });
      } else {
        setCoords({
          left: rect.left,
          bottom: direction === "up" ? Math.max(12, window.innerHeight - rect.top + 8) : undefined,
          top: direction === "down" ? rect.bottom + 8 : undefined,
        });
      }
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, align, direction]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>

      {open && mounted && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: coords.top !== undefined ? `${coords.top}px` : "auto",
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : "auto",
            left: coords.left !== undefined ? `${coords.left}px` : "auto",
            right: coords.right !== undefined ? `${coords.right}px` : "auto",
          }}
          className="z-[99999] min-w-[220px] max-h-[80vh] overflow-y-auto py-2 bg-[var(--kyro-surface)] rounded-2xl shadow-2xl border border-[var(--kyro-border)] animate-in fade-in zoom-in-95 duration-100"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DropdownItem({
  children,
  onClick,
  icon,
  danger,
  disabled,
  className = "",
}: DropdownItemProps) {
  return (
    <div className="px-1.5">
      <button type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-medium tracking-wide text-left transition-all rounded-xl ${danger
          ? "text-red-500 hover:bg-red-500/10"
          : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      >
        {icon && <span className="w-4 h-4 opacity-70">{icon}</span>}
        <span className="flex-1">{children}</span>
      </button>
    </div>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-[var(--kyro-border)] opacity-50" />;
}
