import "../../lib/i18n";
import React from "react";
import { useTranslation } from "react-i18next";

interface CardFieldProps {
  title?: string;
  description?: string;
  icon?: string;
  link?: string;
  linkText?: string;
  onChange: (field: string, value: string) => void;
  compact?: boolean;
}

export const CardField: React.FC<CardFieldProps> = ({
  title = "",
  description = "",
  icon = "",
  link = "",
  linkText = "",
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
        value={title}
        onChange={(e) => onChange("title", e.target.value)}
        className={`${inputClass} font-bold text-base`}
        placeholder={t("fields.cardTitle", { defaultValue: "Card title..." })}
      />
      <textarea
        value={description}
        onChange={(e) => onChange("description", e.target.value)}
        className={textareaClass}
        placeholder={t("fields.cardDescription", { defaultValue: "Card description..." })}
      />
      <input
        type="text"
        value={icon}
        onChange={(e) => onChange("icon", e.target.value)}
        className={inputClass}
        placeholder={t("fields.iconEmojiOrName", { defaultValue: "Icon (emoji or name)..." })}
      />
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={linkText}
          onChange={(e) => onChange("linkText", e.target.value)}
          className="flex-1 px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
          placeholder={t("fields.linkText", { defaultValue: "Link text..." })}
        />
        <span className="text-[var(--kyro-text-muted)] text-xs">→</span>
        <input
          type="url"
          value={link}
          onChange={(e) => onChange("link", e.target.value)}
          className="flex-1 px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent font-mono text-xs"
          placeholder="https://..."
        />
      </div>
    </div>
  );
};

export default CardField;
