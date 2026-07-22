import type { SecretField as SecretFieldType } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";

interface SecretFieldComponentProps {
  field: SecretFieldType;
  value?: string | null;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function SecretField({
  field,
  value,
  onChange,
  error,
  disabled,
}: SecretFieldComponentProps) {

  const fullValue = value ?? "";
  const displayValue = fullValue.length > 8
    ? fullValue.slice(0, -8) + "*".repeat(8)
    : fullValue;



  return (
    <FieldLayout field={field} error={error}>
      <div className="relative">
        <input
          id={field.name}
          type="text"
          value={displayValue}
          readOnly
          disabled={disabled}
          className="kyro-form-input font-mono text-xs tracking-wider opacity-70 bg-[var(--kyro-bg-secondary)] cursor-not-allowed select-none"
          spellCheck={false}
        />
      </div>
    </FieldLayout>
  );
}
