import React from "react";
import { ExternalLink } from "../ui/icons";
import { useTranslation } from "react-i18next";

interface LinkFieldProps {
  text?: string;
  url?: string;
  onChange: (field: string, value: string) => void;
  compact?: boolean;
}

export const LinkField: React.FC<LinkFieldProps> = ({
  text = "",
  url = "",
  onChange,
  compact = false,
}) => {
    const { t } = useTranslation();
  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
      {compact ? (
        <>
          <input
            type="text"
            value={text}
            onChange={(e) => onChange("text", e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
            placeholder={t("fields.linkText", { defaultValue: "Link text..." })}
          />
          <span className="text-[var(--kyro-text-muted)] text-xs">→</span>
          <input
            type="url"
            value={url}
            onChange={(e) => onChange("url", e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent font-mono text-xs"
            placeholder="https://..."
          />
          {text && url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1.5 rounded text-[var(--kyro-text-muted)] hover:text-[var(--kyro-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
              title={url}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </>
      ) : (
        <>
          <input
            type="text"
            value={text}
            onChange={(e) => onChange("text", e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
            placeholder={t("fields.linkText", { defaultValue: "Link text..." })}
          />
          <input
            type="url"
            value={url}
            onChange={(e) => onChange("url", e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent font-mono text-xs"
            placeholder="https://..."
          />
          {text && url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-[var(--kyro-text-muted)] hover:text-[var(--kyro-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
              title={url}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </>
      )}
    </div>
  );
};

export default LinkField;
