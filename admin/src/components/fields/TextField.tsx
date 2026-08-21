import "../../lib/i18n";
import type { TextField as TextFieldType } from "@kyro-cms/core/client";
import FieldLayout from "./FieldLayout";
import { useAutoFormStore } from "../../lib/autoform-store";
import { slugifyText } from "../../lib/slugify";
import { useTranslation } from "react-i18next";

interface TextFieldComponentProps {
  field: TextFieldType;
  value?: string | null;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function TextField({
  field,
  value,
  onChange,
  error,
  disabled,
}: TextFieldComponentProps) {
    const { t } = useTranslation();
  const isReadOnly =
    typeof field.admin?.readOnly === "function"
      ? false
      : Boolean(field.admin?.readOnly);
  const isTextarea = (field as TextFieldType).variant === "textarea";
  const isSlug = field.name === "slug";

  const { isSlugLocked, setIsSlugLocked, formData } = useAutoFormStore();

  const inputType =
    field.variant === "email"
      ? "email"
      : field.variant === "password"
        ? "password"
        : field.variant === "url"
          ? "url"
          : "text";

  const normalizedValue = value == null ? "" : String(value);

  const commonProps = {
    id: field.name,
    value: normalizedValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange?.(e.target.value),
    placeholder: field.admin?.placeholder as string | undefined,
    disabled: disabled || isReadOnly || (isSlug && isSlugLocked),
    minLength: field.minLength as number | undefined,
    maxLength: field.maxLength as number | undefined,
    required: field.required,
    className: `kyro-form-input ${isSlug ? "pr-24" : ""
      } ${disabled || isReadOnly || (isSlug && isSlugLocked) ? "opacity-70 bg-[var(--kyro-bg-secondary)] cursor-not-allowed" : ""}`,
  };

  return (
    <FieldLayout field={field} error={error}>
      <div className="relative">
        {isTextarea ? (
          <textarea {...commonProps} rows={(field as any).admin?.rows || 4} />
        ) : (
          <input type={inputType} {...commonProps} pattern={(field as any).pattern} />
        )}

        {isSlug && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {!isSlugLocked && (
              <button
                type="button"
                onClick={() =>
                  onChange?.(
                    slugifyText(
                      (formData[(field as any).admin?.autoGenerate || "title"] || "") as string,
                    ),
                  )
                }
                className="p-1 text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)]"
                title={t("tooltips.regenerateSlug", { defaultValue: "Regenerate slug" })}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSlugLocked(!isSlugLocked)}
              className={`p-1.5 rounded transition-colors ${isSlugLocked ? "text-[var(--kyro-primary)] bg-[var(--kyro-primary-alpha)]" : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"}`}
              title={isSlugLocked ? "Unlock slug" : "Lock slug"}
            >
              {isSlugLocked ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
              )}
            </button>
          </div>
        )}

        {field.name?.toLowerCase().includes("metatitle") && (
          <div className="flex items-center justify-between mt-1 text-[10px] font-bold  tracking-wider">
            <span className={(normalizedValue.length) > 60 ? "text-red-500" : normalizedValue.length >= 40 ? "text-green-500" : "text-amber-600"}>
              {normalizedValue.length} / 60 — {normalizedValue.length > 60 ? "Too Long" : normalizedValue.length >= 40 ? "Ideal" : "Short"}
            </span>
          </div>
        )}
      </div>
    </FieldLayout>
  );
}
