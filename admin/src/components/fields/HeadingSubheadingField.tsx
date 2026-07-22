import React from "react";
import { useTranslation } from "react-i18next";

interface HeadingSubheadingFieldProps {
  heading?: string;
  subheading?: string;
  onChange: (field: string, value: string) => void;
  compact?: boolean;
}

export const HeadingSubheadingField: React.FC<HeadingSubheadingFieldProps> = ({
  heading = "",
  subheading = "",
  onChange,
  compact = false,
}) => {
    const { t } = useTranslation();
  const inputClass = compact
    ? "w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
    : "w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  const textareaClass = compact
    ? "w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] min-h-[50px] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
    : "w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <input
        type="text"
        value={heading}
        onChange={(e) => onChange("title", e.target.value)}
        className={`${inputClass} font-bold text-base`}
        placeholder={t("fields.heading", { defaultValue: "Heading..." })}
      />
      <textarea
        value={subheading}
        onChange={(e) => onChange("subtitle", e.target.value)}
        className={textareaClass}
        placeholder={t("fields.subheading", { defaultValue: "Subheading..." })}
      />
    </div>
  );
};

export default HeadingSubheadingField;
