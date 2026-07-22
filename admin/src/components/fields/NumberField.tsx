import type { NumberField as NumberFieldType } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";

interface NumberFieldComponentProps {
  field: NumberFieldType;
  value?: number;
  onChange?: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

export default function NumberField({
  field,
  value,
  onChange,
  error,
  disabled,
}: NumberFieldComponentProps) {
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
        type="number"
        id={field.name}
        value={value ?? ""}
        onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
        placeholder={field.admin?.placeholder as string | undefined}
        disabled={disabled || isReadOnly}
        min={field.min as number | undefined}
        max={field.max as number | undefined}
        step={(field.step as number | string | undefined) || (field.integer ? 1 : "any")}
        required={field.required}
        className={`kyro-form-input ${
          disabled || isReadOnly ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
    </FieldLayout>
  );
}
