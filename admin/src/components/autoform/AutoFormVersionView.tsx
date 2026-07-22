import React from "react";
import { Check, X } from "../ui/icons";
import { useAutoFormStore } from "../../lib/autoform-store";

interface AutoFormVersionViewProps {
  handleRestoreVersion: (versionId: string) => void;
  handleCompareVersions: () => Promise<void>;
  toggleCompareSelection: (versionId: string) => void;
}

export function AutoFormVersionView({
  handleRestoreVersion,
  handleCompareVersions,
  toggleCompareSelection,
}: AutoFormVersionViewProps) {
  const {
    compareMode,
    setCompareMode,
    compareSelected,
    setCompareSelected,
    compareDiffs,
    setCompareDiffs,
    loadingDiffs,
    loadingVersions,
    versions,
  } = useAutoFormStore();

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 pb-12">
      <div className="surface-tile p-0 overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-[var(--kyro-border)] flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="text-base md:text-lg font-bold text-[var(--kyro-text-primary)]">
              Version History
            </h2>
            <p className="text-[11px] text-[var(--kyro-text-muted)] mt-0.5">
              {compareMode
                ? `Select 2 versions · ${compareSelected.length}/2 chosen`
                : `${versions.length} snapshot${versions.length !== 1 ? "s" : ""} · Auto-saved`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {compareMode && compareSelected.length === 2 && (
              <button
                type="button"
                onClick={handleCompareVersions}
                disabled={loadingDiffs}
                className="kyro-btn kyro-btn-primary px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider hover:opacity-90 disabled:opacity-50"
              >
                {loadingDiffs ? "Comparing..." : "Compare"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareSelected([]);
                setCompareDiffs([]);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all ${compareMode
                ? "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                : "border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                }`}
            >
              {compareMode ? "Done" : "Compare"}
            </button>
          </div>
        </div>

        {compareDiffs.length > 0 && (
          <div className="border-b border-[var(--kyro-border)]">
            <div className="px-6 py-3 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--kyro-text-primary)] tracking-wider">
                {compareDiffs.length} change
                {compareDiffs.length !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setCompareDiffs([])}
                className="p-1 rounded hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {compareDiffs.map((d, i) => (
                <div
                  key={i}
                  className="flex flex-col md:grid md:grid-cols-4 gap-1 md:gap-3 px-4 md:px-6 py-2.5 text-[11px] font-mono border-t border-[var(--kyro-border)] hover:bg-[var(--kyro-bg-secondary)]"
                >
                  <div className="text-[var(--kyro-text-muted)] truncate font-semibold md:font-normal">
                    {d.field}
                  </div>
                  <div className="text-[var(--kyro-text-muted)] truncate hidden md:block">
                    {typeof d.oldValue === "object"
                      ? JSON.stringify(d.oldValue)
                      : String(d.oldValue ?? "null")}
                  </div>
                  <div className="md:col-span-2 text-[var(--kyro-text-primary)] truncate">
                    <span className="md:hidden text-[var(--kyro-text-muted)]">→ </span>
                    {typeof d.newValue === "object"
                      ? JSON.stringify(d.newValue)
                      : String(d.newValue ?? "null")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingVersions ? (
          <div className="flex justify-center py-16">
            <span className="animate-spin text-[var(--kyro-primary)]">⌛</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-16 text-[var(--kyro-text-muted)] text-sm italic">
            No versions yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--kyro-border)]">
            {versions.map((v, i) => {
              const isSelected = compareSelected.includes(v.id);
              const isAutoSaved = (v.changeDescription || "")
                .toLowerCase()
                .includes("auto");

              return (
                <div
                  key={v.id}
                  onClick={
                    compareMode ? () => toggleCompareSelection(v.id) : undefined
                  }
                  className={`transition-all ${compareMode
                    ? isSelected
                      ? "bg-[var(--kyro-primary)]/5 cursor-pointer"
                      : "hover:bg-[var(--kyro-bg-secondary)] cursor-pointer"
                    : "hover:bg-[var(--kyro-bg-secondary)]"
                    }`}
                >
                  {/* Desktop: grid row */}
                  <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 items-center">
                    <div className="col-span-1 flex items-center gap-2">
                      {compareMode ? (
                        <div
                          className={`w-4 h-4 rounded-full border ${isSelected
                            ? "border-[var(--kyro-primary)] bg-[var(--kyro-primary)]"
                            : "border-[var(--kyro-border)]"
                            }`}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4" />
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-[var(--kyro-text-muted)] w-5">
                          {versions.length - i}
                        </span>
                      )}
                    </div>
                    <div className="col-span-4 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--kyro-text-primary)] truncate flex items-center gap-2">
                        {v.changeDescription || "Snapshot"}
                        {isAutoSaved && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-[var(--kyro-bg-secondary)] text-[var(--kyro-text-secondary)] rounded font-bold tracking-wider">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--kyro-text-muted)]">
                        {new Date((v.createdAt || (v as any).created_at) as string).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="col-span-3">
                      {v.status && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold capitalize tracking-wider ${v.status === "published"
                            ? " text-[var(--kyro-success)]"
                            : " text-[var(--kyro-warning)]"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${v.status === "published" ? "bg-[var(--kyro-success)]" : "bg-[var(--kyro-warning)]"}`}
                          />
                          {v.status}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 text-[11px] text-[var(--kyro-text-muted)]">
                      {v.createdBy || "system"}
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {!compareMode && (
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(v.id)}
                          className="px-3 py-1.5 rounded-lg border border-[var(--kyro-border)] text-[11px] font-bold tracking-wider text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:border-[var(--kyro-primary)] transition-all active:scale-95"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile: card layout */}
                  <div className="md:hidden flex items-start gap-3 px-4 py-3">
                    <div className="pt-0.5 shrink-0">
                      {compareMode ? (
                        <div
                          className={`w-4 h-4 rounded-full border ${isSelected
                            ? "border-[var(--kyro-primary)] bg-[var(--kyro-primary)]"
                            : "border-[var(--kyro-border)]"
                            }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-[var(--kyro-text-muted)] w-5 inline-block text-center">
                          {versions.length - i}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--kyro-text-primary)] truncate flex items-center gap-1.5">
                        {v.changeDescription || "Snapshot"}
                        {isAutoSaved && (
                          <span className="text-[9px] px-1 py-0.5 bg-[var(--kyro-bg-secondary)] text-[var(--kyro-text-secondary)] rounded font-bold tracking-wider shrink-0">
                            Auto
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] text-[var(--kyro-text-muted)]">
                          {new Date((v.createdAt || (v as any).created_at) as string).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {v.status && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold capitalize tracking-wider ${v.status === "published"
                              ? "text-[var(--kyro-success)]"
                              : "text-[var(--kyro-warning)]"
                              }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${v.status === "published" ? "bg-[var(--kyro-success)]" : "bg-[var(--kyro-warning)]"}`}
                            />
                            {v.status}
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--kyro-text-muted)] opacity-60">
                          {v.createdBy || "system"}
                        </span>
                      </div>
                    </div>

                    {!compareMode && (
                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(v.id)}
                        className="shrink-0 px-2.5 py-1 rounded-lg border border-[var(--kyro-border)] text-[10px] font-bold tracking-wider text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:border-[var(--kyro-primary)] transition-all active:scale-95"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
