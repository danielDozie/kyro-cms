import React, { useState, useRef, useEffect, type ReactNode } from "react";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={`absolute z-[100] min-w-[200px] py-2 bg-[var(--kyro-surface)] rounded-2xl shadow-2xl border border-[var(--kyro-border)] animate-in fade-in zoom-in-95 duration-100 ${
            align === "right" ? "right-0" : "left-0"
          } ${
            direction === "down" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
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
