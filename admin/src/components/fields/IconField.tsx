import React, { useState, useMemo } from "react";
import type { IconField as IconFieldType } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";
import { IconPickerModal } from "../ui/IconPickerModal";
import * as LucideIcons from "lucide-react";

interface IconFieldComponentProps {
  field: IconFieldType;
  value?: string | null;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function IconField({
  field,
  value,
  onChange,
  error,
  disabled,
}: IconFieldComponentProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const normalizedValue = value == null ? "" : String(value);

  // Convert kebab-case value back to PascalCase to render the preview component
  const pascalName = useMemo(() => {
    if (!normalizedValue) return "";
    return normalizedValue
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }, [normalizedValue]);

  const IconComponent = (LucideIcons as any)[pascalName];
  const isReadOnly = typeof field.admin?.readOnly === "function" ? false : Boolean(field.admin?.readOnly);

  return (
    <FieldLayout field={field} error={error}>
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            id={field.name}
            type="text"
            value={normalizedValue}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={(field.admin?.placeholder as string) || "e.g., activity"}
            disabled={disabled || isReadOnly}
            required={field.required}
            className={`kyro-form-input ${disabled || isReadOnly ? "opacity-70 bg-[var(--kyro-bg-secondary)] cursor-not-allowed" : ""}`}
          />
        </div>
        
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={disabled || isReadOnly}
          className="flex items-center gap-2 h-10 px-4 shrink-0 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl text-sm font-bold text-[var(--kyro-text-primary)] hover:border-[var(--kyro-primary)] hover:bg-[var(--kyro-primary-alpha)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {IconComponent ? (
            <IconComponent className="w-5 h-5" strokeWidth={2} />
          ) : (
            <LucideIcons.Search className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
          )}
          Browse
        </button>
      </div>

      {pickerOpen && (
        <IconPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(iconName) => {
            onChange?.(iconName);
          }}
        />
      )}
    </FieldLayout>
  );
}
