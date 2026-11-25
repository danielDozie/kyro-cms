import React from "react";
import { useAutoFormStore } from "../../lib/autoform-store";
import "./VersionHistory.css";

interface AutoFormVersionViewProps {
  handleRestoreVersion: (versionId: string) => void;
  handleCompareVersions: () => Promise<void>;
  toggleCompareSelection: (versionId: string) => void;
}
const describeSnapshot = (description?: string) =>
  (description || "Document snapshot")
    .replace(/^Recovered layout snapshot\s+\S+$/i, "Layouts restored")
    .replace(/^Converted to content only; recovery\s+\S+$/i, "Converted to content only");
const displayValue = (value: unknown) =>
  typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "—");

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
  const visibleVersions = versions.slice(0, 15);
  return (
    <section className="version-history" aria-label="Version history">
      <header className="version-history-header">
        <div>
          <h2>Version history</h2>
          <p>
            {compareMode
              ? `Select two snapshots · ${compareSelected.length}/2 selected`
              : `${visibleVersions.length} snapshot${visibleVersions.length === 1 ? "" : "s"}${visibleVersions.length === 15 ? " · Latest 15" : ""}`}
          </p>
        </div>
        <div className="version-history-actions">
          {compareMode && compareSelected.length === 2 && (
            <button
              type="button"
              onClick={handleCompareVersions}
              disabled={loadingDiffs}
              className="kyro-btn kyro-btn-primary version-history-action"
            >
              {loadingDiffs ? "Comparing…" : "Compare selected"}
            </button>
          )}
          <button
            type="button"
            className="kyro-btn kyro-btn-secondary version-history-action"
            disabled={!visibleVersions.length}
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareSelected([]);
              setCompareDiffs([]);
            }}
          >
            {compareMode ? "Cancel comparison" : "Compare"}
          </button>
        </div>
      </header>
      {compareDiffs.length > 0 && (
        <section className="version-history-diffs" aria-label="Snapshot differences">
          <div className="version-history-diff-heading">
            <span>
              {compareDiffs.length} changed field{compareDiffs.length === 1 ? "" : "s"}
            </span>
            <button type="button" className="version-history-clear" onClick={() => setCompareDiffs([])}>
              Clear comparison
            </button>
          </div>
          {compareDiffs.map((diff, i) => (
            <details key={`${diff.field}-${i}`}>
              <summary>{diff.field}</summary>
              <div className="version-history-values">
                <div>
                  <span>Before</span>
                  <pre>{displayValue(diff.oldValue)}</pre>
                </div>
                <div>
                  <span>After</span>
                  <pre>{displayValue(diff.newValue)}</pre>
                </div>
              </div>
            </details>
          ))}
        </section>
      )}
      {loadingVersions ? (
        <p className="version-history-empty" role="status">
          Loading snapshots…
        </p>
      ) : !visibleVersions.length ? (
        <p className="version-history-empty">No snapshots yet.</p>
      ) : (
        <>
          <div className="version-history-columns" aria-hidden="true">
            <span>Version</span>
            <span>Change</span>
            <span>Status</span>
            <span>Saved</span>
            <span />
          </div>
          <ol className="version-history-list">
            {visibleVersions.map((v) => {
              const selected = compareSelected.includes(v.id);
              const rawDate = (v.createdAt || (v as any).created_at) as string;
              const date = new Date(rawDate);
              const dateValid = !Number.isNaN(date.getTime());
              const author = (v as any).createdBy || (v as any).created_by;
              const authorName =
                author && typeof author === "object"
                  ? author.name || author.email || "Editor"
                  : !author || author === "system"
                    ? "System"
                    : /^[a-f\d-]{20,}$/i.test(String(author))
                      ? "Editor"
                      : String(author);
              return (
                <li key={v.id} className="version-history-row" data-selected={selected || undefined}>
                  <div className="version-history-number">
                    {compareMode ? (
                      <input
                        type="checkbox"
                        aria-label={`Compare version ${v.version ?? v.id}`}
                        checked={selected}
                        onChange={() => toggleCompareSelection(v.id)}
                        disabled={!selected && compareSelected.length >= 2}
                      />
                    ) : (
                      <span title={`Snapshot ${v.id}`}>{v.version ? `#${v.version}` : "—"}</span>
                    )}
                  </div>
                  <div className="version-history-change">
                    <span title={v.changeDescription || "Document snapshot"}>
                      {describeSnapshot(v.changeDescription)}
                    </span>
                    <small title={typeof author === "string" ? author : undefined}>{authorName}</small>
                  </div>
                  <span className="version-history-status" data-status={v.status || "draft"}>
                    <i aria-hidden="true" />
                    {v.status || "draft"}
                  </span>
                  <time
                    dateTime={dateValid ? date.toISOString() : undefined}
                    title={dateValid ? date.toLocaleString() : undefined}
                  >
                    {dateValid
                      ? date.toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </time>
                  <div className="version-history-restore">
                    {!compareMode && (
                      <button
                        type="button"
                        className="kyro-btn kyro-btn-secondary version-history-action"
                        aria-label={`Restore version ${v.version ?? v.id}`}
                        onClick={() => handleRestoreVersion(v.id)}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
