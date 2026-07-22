import React from "react";
import { useTranslation } from "react-i18next";

interface HeroFieldProps {
  heading?: string;
  subheading?: string;
  ctaText?: string;
  ctaUrl?: string;
  onChange: (field: string, value: string) => void;
  compact?: boolean;
}

export const HeroField: React.FC<HeroFieldProps> = ({
  heading = "",
  subheading = "",
  ctaText = "",
  ctaUrl = "",
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

  if (compact) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={heading}
          onChange={(e) => onChange("title", e.target.value)}
          className={`${inputClass} font-bold text-base`}
          placeholder={t("fields.heroHeading", { defaultValue: "Hero heading..." })}
        />
        <textarea
          value={subheading}
          onChange={(e) => onChange("subtitle", e.target.value)}
          className={textareaClass}
          placeholder={t("fields.heroSubheading", { defaultValue: "Hero subheading..." })}
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={ctaText}
            onChange={(e) => onChange("ctaText", e.target.value)}
            className="flex-1 px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
            placeholder={t("fields.ctaText", { defaultValue: "CTA text..." })}
          />
          <span className="text-[var(--kyro-text-muted)] text-xs">→</span>
          <input
            type="url"
            value={ctaUrl}
            onChange={(e) => onChange("ctaUrl", e.target.value)}
            className="flex-1 px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent font-mono text-xs"
            placeholder="https://..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={heading}
        onChange={(e) => onChange("title", e.target.value)}
        className={`${inputClass} font-bold text-base`}
        placeholder={t("fields.heroHeading", { defaultValue: "Hero heading..." })}
      />
      <textarea
        value={subheading}
        onChange={(e) => onChange("subtitle", e.target.value)}
        className={textareaClass}
        placeholder={t("fields.heroSubheading", { defaultValue: "Hero subheading..." })}
      />
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={ctaText}
          onChange={(e) => onChange("ctaText", e.target.value)}
          className="flex-1 px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
          placeholder={t("fields.ctaText", { defaultValue: "CTA text..." })}
        />
        <span className="text-[var(--kyro-text-muted)] text-xs">→</span>
        <input
          type="url"
          value={ctaUrl}
          onChange={(e) => onChange("ctaUrl", e.target.value)}
          className="flex-1 px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent font-mono text-xs"
          placeholder="https://..."
        />
      </div>
    </div>
  );
};

export default HeroField;
