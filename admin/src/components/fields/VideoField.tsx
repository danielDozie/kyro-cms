import React from "react";
import { UploadField } from "./UploadField";
import { useTranslation } from "react-i18next";

interface VideoFieldProps {
  src?: string;
  title?: string;
  onChange: (field: string, value: string) => void;
  onUploadChange?: (value: unknown) => void;
  compact?: boolean;
}

export const VideoField: React.FC<VideoFieldProps> = ({
  src = "",
  title = "",
  onChange,
  onUploadChange,
  compact = false,
}) => {
    const { t } = useTranslation();
  const isExternalUrl =
    src.includes("youtube.com") ||
    src.includes("vimeo.com") ||
    src.includes("youtu.be");

  if (compact) {
    return (
      <div className="space-y-2">
        <input
          type="url"
          value={src}
          onChange={(e) => onChange("src", e.target.value)}
          className="w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent font-mono text-xs"
          placeholder={t("fields.mp4UrlYoutubeOr", { defaultValue: "MP4 URL, YouTube, or Vimeo link..." })}
        />
        <input
          type="text"
          value={title}
          onChange={(e) => onChange("title", e.target.value)}
          className="w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
          placeholder={t("fields.videoTitleOptional", { defaultValue: "Video title (optional)..." })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <UploadField
        field={{ label: "Video Asset", name: "src", maxCount: 1 }}
        value={src}
        onChange={onUploadChange || ((v) => onChange("src", v))}
      />
      <span className="text-xs text-[var(--kyro-text-muted)]">
        or paste a URL
      </span>
      <input
        type="url"
        value={src}
        onChange={(e) => onChange("src", e.target.value)}
        className="w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent font-mono text-xs"
        placeholder={t("fields.mp4UrlYoutubeOr", { defaultValue: "MP4 URL, YouTube, or Vimeo link..." })}
      />
      <input
        type="text"
        value={title}
        onChange={(e) => onChange("title", e.target.value)}
        className="w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
        placeholder={t("fields.videoTitleOptional", { defaultValue: "Video title (optional)..." })}
      />
    </div>
  );
};

export default VideoField;
