import "../lib/i18n";
import React from "react";
import { SlidePanel } from "./ui/SlidePanel";
import { Spinner } from "./ui/Spinner";
import { History, Eye, GitCompare, Undo2, CheckCircle2, Clock, User } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Version {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email?: string;
  };
  status: "draft" | "published";
  changelog?: string;
}

interface VersionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  versions: Version[];
  currentVersionId?: string;
  onPreview: (version: Version) => void;
  onRestore: (version: Version) => void;
  onCompare?: (v1: Version, v2: Version) => void;
  loading?: boolean;
}

export function VersionHistoryPanel({
  open,
  onClose,
  versions,
  currentVersionId,
  onPreview,
  onRestore,
  onCompare,
  loading = false,
}: VersionHistoryPanelProps) {
    const { t } = useTranslation();
  const formatDate = (dateValue: any) => {
    if (!dateValue) return "Unknown date";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      // Sometimes strings from DB like SQLite might need parsing
      const parsed = Date.parse(dateValue);
      if (!isNaN(parsed)) return new Date(parsed).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
      return "Invalid date";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeAgo = (dateValue: any) => {
    if (!dateValue) return "Unknown date";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return formatDate(dateValue);

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // If it's in the future (e.g. server clock skew), just say "Just now"
    if (diffMs < 0) return "Just now";

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateValue);
  };

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={t("tooltips.versionHistory", { defaultValue: "Version History" })}
      width="md"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : versions.length === 0 ? (
        <div className="text-center flex flex-col items-center justify-center py-16 text-[var(--kyro-text-muted)]">
          <History className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium text-[var(--kyro-text)]">No version history yet</p>
          <p className="text-sm mt-1">Versions are automatically saved as you work.</p>
        </div>
      ) : (
        <div className="space-y-3 px-1 pb-4 pt-1">
          {versions.map((version) => {
            const isCurrent = version.id === currentVersionId;
            return (
              <div
                key={version.id}
                className={`p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                  isCurrent
                    ? "border-[var(--kyro-primary)] bg-[var(--kyro-primary)]/5 shadow-sm"
                    : "border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/30 hover:bg-[var(--kyro-surface-accent)] hover:shadow-sm bg-[var(--kyro-surface)]"
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--kyro-primary)] shadow-[0_0_8px_var(--kyro-primary)]" />
                )}
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          version.status === "published"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {version.status === "published" && <CheckCircle2 className="w-3 h-3" />}
                        {version.status === "published" ? "Published" : "Draft"}
                      </span>
                      <span className="text-xs font-semibold text-[var(--kyro-text)] px-2 py-0.5 rounded-md bg-[var(--kyro-surface-accent)]">
                        v{version.version}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-medium text-[var(--kyro-primary)] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--kyro-primary)] animate-pulse" />
                          Current
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--kyro-text)] truncate mb-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--kyro-text-muted)]" />
                      {formatTimeAgo(version.createdAt)}
                    </div>
                    
                    {version.createdBy && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--kyro-text-muted)] mt-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{version.createdBy.name || version.createdBy.email}</span>
                      </div>
                    )}
                    
                    {version.changelog && (
                      <p className="text-xs text-[var(--kyro-text-secondary)] mt-2 italic border-l-2 border-[var(--kyro-border)] pl-2">
                        "{version.changelog}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button type="button"
                      onClick={() => onPreview(version)}
                      className="p-2 text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)] hover:bg-[var(--kyro-primary)]/10 rounded-md transition-colors"
                      title={t("tooltips.previewThisVersion", { defaultValue: "Preview this version" })}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onCompare && (
                      <button type="button"
                        onClick={() =>
                          onCompare(
                            version,
                            versions.find((v) => v.id === currentVersionId) || version,
                          )
                        }
                        className="p-2 text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)] hover:bg-[var(--kyro-primary)]/10 rounded-md transition-colors"
                        title={t("tooltips.compareWithCurrent", { defaultValue: "Compare with current" })}
                      >
                        <GitCompare className="w-4 h-4" />
                      </button>
                    )}
                    {!isCurrent && (
                      <button type="button"
                        onClick={() => onRestore(version)}
                        className="p-2 text-amber-600 hover:bg-amber-500/10 rounded-md transition-colors"
                        title={t("tooltips.restoreThisVersion", { defaultValue: "Restore this version" })}
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SlidePanel>
  );
}
