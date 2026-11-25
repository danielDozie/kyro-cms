import React, { useState, useRef, useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  direction?: "up" | "down";
  menuClassName?: string;
  matchTriggerWidth?: boolean;
  density?: "default" | "compact";
}

export function Dropdown({ trigger, children, align = "right", direction = "up", menuClassName = "", matchTriggerWidth = false, density = "default" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
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
    const menuWidth = matchTriggerWidth ? rect.width : menuRef.current?.getBoundingClientRect().width || 192;

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
          right: Math.max(12, Math.min(window.innerWidth - rect.right, window.innerWidth - menuWidth - 12)),
          bottom: direction === "up" ? Math.max(12, window.innerHeight - rect.top + 8) : undefined,
          top: direction === "down" ? rect.bottom + 8 : undefined,
        });
      } else {
        setCoords({
          left: Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12)),
          bottom: direction === "up" ? Math.max(12, window.innerHeight - rect.top + 8) : undefined,
          top: direction === "down" ? rect.bottom + 8 : undefined,
        });
      }
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleScrollOrResize = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
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
  }, [open, align, direction, matchTriggerWidth]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
  }, [open]);

  const renderedTrigger = React.isValidElement(trigger)
    ? React.cloneElement(trigger as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>, {
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        "aria-haspopup": "menu",
        onClick: (event) => {
          event.stopPropagation();
          (trigger.props as React.ButtonHTMLAttributes<HTMLButtonElement>).onClick?.(event);
          if (!event.defaultPrevented) setOpen((prev) => !prev);
        },
        onKeyDown: (event) => {
          (trigger.props as React.ButtonHTMLAttributes<HTMLButtonElement>).onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        },
      })
    : trigger;

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {renderedTrigger}

      {open &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            data-density={matchTriggerWidth || density === "compact" ? "compact" : undefined}
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(event.relatedTarget) &&
                !triggerRef.current?.contains(event.relatedTarget)
              ) {
                setOpen(false);
              }
            }}
            onKeyDown={(event) => {
              const items = Array.from(
                menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") || [],
              );
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                triggerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
                return;
              }
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !items.length) return;
              event.preventDefault();
              const current = items.indexOf(document.activeElement as HTMLButtonElement);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
              items[next]?.focus();
            }}
            style={{
              position: "fixed",
              width: matchTriggerWidth ? triggerRef.current?.getBoundingClientRect().width : undefined,
              minWidth: matchTriggerWidth ? 0 : undefined,

              top: coords.top !== undefined ? `${coords.top}px` : "auto",
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : "auto",
              left: coords.left !== undefined ? `${coords.left}px` : "auto",
              right: coords.right !== undefined ? `${coords.right}px` : "auto",
            }}
            className={`workspace-popover z-[1000100] min-w-[192px] max-h-[80vh] overflow-y-auto py-2 bg-[var(--kyro-surface)] rounded-lg border border-[var(--kyro-border)] animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body,
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

export function DropdownItem({ children, onClick, icon, danger, disabled, className = "" }: DropdownItemProps) {
  return (
    <div className="px-1.5">
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-normal text-left transition-all rounded-md ${
          danger
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
