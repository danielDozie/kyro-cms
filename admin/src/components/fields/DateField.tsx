import type { DateField as DateFieldType } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";

interface DateFieldComponentProps {
  field: DateFieldType;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function DateField({
  field,
  value = "",
  onChange,
  error,
  disabled,
}: DateFieldComponentProps) {
  const isReadOnly =
    typeof field.admin?.readOnly === "function"
      ? false
      : Boolean(field.admin?.readOnly);

  return (
    <FieldLayout
      field={field}
      error={error}
    >
      <input
        type={field.time ? "datetime-local" : "date"}
        id={field.name}
        value={value == null ? "" : value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || isReadOnly}
        min={field.minDate as string | undefined}
        max={field.maxDate as string | undefined}
        required={field.required}
        className={`kyro-form-input ${
          disabled || isReadOnly ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
    </FieldLayout>
  );
}
