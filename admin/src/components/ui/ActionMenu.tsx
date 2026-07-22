import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton";
import { IconMoreVertical } from "./icons";

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
}

export function ActionMenu({ items, label = "Actions" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <IconButton
        icon={<IconMoreVertical className="w-4 h-4" />}
        label={label}
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
      />
      {open && (
        <div className="absolute right-0 z-50 min-w-[160px] bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-lg shadow-lg py-1">
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && <div className="border-t border-[var(--kyro-border)] my-1" />}
              <button
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors ${item.danger
                  ? "text-red-500 hover:bg-red-50"
                  : "text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"
                  }`}
                onClick={() => { item.onClick(); setOpen(false); }}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
