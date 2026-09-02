import React, { useState, lazy, Suspense } from "react";
import type { IconField as IconFieldType } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";
import { DynamicIcon } from "../ui/DynamicIcon";
import { Search } from "../ui/icons";

const IconPickerModal = lazy(() =>
  import("../ui/IconPickerModal").then((m) => ({ default: m.IconPickerModal }))
);

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
            placeholder={(field.admin?.placeholder as string) || "e.g., lucide:utensils, hero:sparkles"}
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
          {normalizedValue ? (
            <DynamicIcon name={normalizedValue} className="w-5 h-5" fallback={Search} />
          ) : (
            <Search className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
          )}
          Browse
        </button>
      </div>

      {pickerOpen && (
        <Suspense fallback={null}>
          <IconPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(iconName) => {
              onChange?.(iconName);
            }}
          />
        </Suspense>
      )}
    </FieldLayout>
  );
}
