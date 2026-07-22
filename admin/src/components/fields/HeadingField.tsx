import React from "react";
import { useTranslation } from "react-i18next";

interface HeadingFieldProps {
  text?: string;
  onChange: (field: string, value: string) => void;
  compact?: boolean;
}

export const HeadingField: React.FC<HeadingFieldProps> = ({
  text = "",
  onChange,
  compact = false,
}) => {
    const { t } = useTranslation();
  const inputClass = compact
    ? "w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
    : "w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  return (
    <div className={compact ? "" : "space-y-3"}>
      <input
        type="text"
        value={text}
        onChange={(e) => onChange("text", e.target.value)}
        className={inputClass}
        placeholder={t("fields.enterHeadingText", { defaultValue: "Enter heading text..." })}
      />
    </div>
  );
};

export default HeadingField;
