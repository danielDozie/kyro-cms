import type { CheckboxField as CheckboxFieldType } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";

interface CheckboxFieldComponentProps {
  field: CheckboxFieldType;
  value?: boolean;
  onChange?: (value: boolean) => void;
  error?: string;
  disabled?: boolean;
}

export default function CheckboxField({
  field,
  value,
  onChange,
  error,
  disabled,
}: CheckboxFieldComponentProps) {
  const isReadOnly =
    typeof field.admin?.readOnly === "function"
      ? false
      : Boolean(field.admin?.readOnly);
  const checked = value ?? false;

  return (
    <FieldLayout
      field={field}
      error={error}
      hideLabel={true}
    >
      <label className="flex items-center gap-2.5 cursor-pointer group py-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled || isReadOnly}
          className={`w-4 h-4 rounded border-[var(--kyro-border)] text-[var(--kyro-primary)] focus:ring-[var(--kyro-primary)] transition-all ${
            disabled || isReadOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        />
        <span className="text-sm font-semibold text-[var(--kyro-text-primary)] tracking-tight group-hover:text-[var(--kyro-primary)] transition-colors">
          {field.label || field.name}
          {field.required && (
            <span className="text-[var(--kyro-error)] ml-1">*</span>
          )}
        </span>
      </label>
    </FieldLayout>
  );
}
