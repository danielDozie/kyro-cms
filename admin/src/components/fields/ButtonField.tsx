import "../../lib/i18n";
import React from "react";
import { ExternalLink } from "../ui/icons";
import { useTranslation } from "react-i18next";

interface ButtonFieldProps {
  text?: string;
  url?: string;
  onChange: (field: string, value: string) => void;
  compact?: boolean;
}

export const ButtonField: React.FC<ButtonFieldProps> = ({
  text = "Button",
  url = "",
  onChange,
  compact = false,
}) => {
    const { t } = useTranslation();
  const inputClass = compact
    ? "flex-1 px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
    : "flex-1 px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => onChange("text", e.target.value)}
        className={inputClass}
        placeholder={t("fields.buttonText", { defaultValue: "Button text..." })}
      />
      <span className="text-[var(--kyro-text-muted)] text-xs">→</span>
      <input
        type="url"
        value={url}
        onChange={(e) => onChange("url", e.target.value)}
        className={`${inputClass} font-mono text-xs`}
        placeholder="https://..."
      />
      {text && url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`shrink-0 ${compact ? "p-1.5" : "p-2"} rounded text-[var(--kyro-text-muted)] hover:text-[var(--kyro-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors`}
          title={url}
        >
          <ExternalLink className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </a>
      )}
    </div>
  );
};

export default ButtonField;
