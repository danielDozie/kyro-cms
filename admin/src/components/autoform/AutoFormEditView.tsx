import "../../lib/i18n";
import { useState, useEffect } from "react";
import type { CollectionConfig, GlobalConfig, Field } from "@kyro-cms/core/client";
import { useAutoFormStore } from "../../lib/autoform-store";
import { RefreshCw, ExternalLink } from "../ui/icons";
import { StudioContentPreview } from "./StudioContentPreview";
import { Spinner } from "../ui/Spinner";

interface AutoFormEditViewProps {
  config: CollectionConfig | GlobalConfig;
  studio?: boolean;
  layout: "split" | "single";
  collectionSlug?: string;
  renderField: (field: Field) => React.ReactNode;
}

export function AutoFormEditView({
  config,
  studio = false,
  layout,
  collectionSlug,
  renderField,
}: AutoFormEditViewProps) {

  const { showPreview, sidebarCollapsed, formData, previewUrl } = useAutoFormStore();
  const [iframeLoading, setIframeLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewport, setViewport] = useState("desktop");
  const [previewMode, setPreviewMode] = useState(studio ? "content" : "website");

  useEffect(() => {
    if (previewUrl) {
      setIframeLoading(true);
    }
  }, [previewUrl, refreshKey]);

  const preview = showPreview ? (
    <div className="w-full h-[calc(100vh-240px)] min-h-[420px] flex flex-col ">
      <div className="w-full h-full flex-1 rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-bg-secondary)] overflow-hidden relative flex flex-col">
        <div className="bg-[var(--kyro-surface-accent)] border-b border-[var(--kyro-border)] px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${iframeLoading && !!previewUrl && previewMode === "website" ? "bg-amber-400 animate-ping" : "bg-emerald-500"}`} />
            <span className="text-xs font-semibold text-[var(--kyro-text-primary)]">
              {previewMode === "content" ? "Content preview" : "Website preview"}
            </span>
            {(iframeLoading && !!previewUrl && previewMode === "website") && (
              <span className="text-[10px] font-medium text-[var(--kyro-text-muted)] animate-pulse flex items-center gap-1">
                <Spinner size="sm" className="w-2.5 h-2.5 inline" />
                Loading…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 max-w-[65%]">
            {studio && <div className="studio-preview-sizes" role="group" aria-label="Preview source">{["content", "website"].map(mode => <button key={mode} type="button" aria-pressed={previewMode === mode} onClick={() => setPreviewMode(mode)}>{mode === "content" ? "Content" : "Website"}</button>)}</div>}
            <div className="studio-preview-sizes" role="group" aria-label="Preview width">{["desktop", "mobile"].map(size => <button key={size} type="button" aria-pressed={viewport === size} onClick={() => setViewport(size)}>{size === "desktop" ? "Desktop" : "Mobile"}</button>)}</div>
            {previewMode === "website" && <><div className="text-[11px] font-mono text-[var(--kyro-text-muted)] truncate bg-[var(--kyro-bg)] px-3 py-1 rounded-md border border-[var(--kyro-border)]">
              {previewUrl || "No preview route"}
            </div>
              <button
                type="button"
                onClick={() => {
                  setIframeLoading(true);
                  setRefreshKey((k) => k + 1);
                }}
                className="p-1 rounded-md hover:bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors border border-transparent hover:border-[var(--kyro-border)]"
                title="Reload Preview"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${iframeLoading ? "animate-spin" : ""}`} />
              </button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-md hover:bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors border border-transparent hover:border-[var(--kyro-border)]"
                  title="Open Preview in New Tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}</>}
          </div>
        </div>
        <div className="flex-1 w-full h-full min-h-[420px] bg-[var(--kyro-surface-accent)] relative overflow-hidden">
          {(iframeLoading && !!previewUrl && previewMode === "website") && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--kyro-bg-secondary)]/80 backdrop-blur-sm transition-opacity duration-300">
              <Spinner size="md" className="w-6 h-6 text-[var(--kyro-primary)] mb-2" />
              <p className="text-xs font-semibold text-[var(--kyro-text-secondary)]">
                {previewUrl ? "Loading preview..." : "Resolving preview route..."}
              </p>
              <p className="text-[10px] text-[var(--kyro-text-muted)] mt-1">
                Save your changes, then refresh to update the preview.
              </p>
            </div>
          )}
          {studio && previewMode === "content" ? <div className="studio-preview-document" style={{ maxWidth: viewport === "mobile" ? "375px" : "100%" }}><StudioContentPreview config={config} data={formData} /></div> : previewUrl ? (
            <iframe
              key={refreshKey}
              src={previewUrl}
              onLoad={() => setIframeLoading(false)}
              className="h-full border-none bg-white block mx-auto"
              style={{ width: viewport === "mobile" ? "min(375px, 100%)" : "100%" }}
              title="Website preview"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
              <p className="text-sm font-semibold text-[var(--kyro-text-secondary)]">
                No preview URL available
              </p>
              <p className="text-xs text-[var(--kyro-text-muted)] mt-1 max-w-sm">
                Save a draft to preview this document. Your website must provide a preview route for this collection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  if (showPreview && !studio) return preview;

  if (layout === "single") {
    return (
      <div className="editor-single-column w-full space-y-6 md:space-y-8">
        <div className="field-stack surface-tile p-4 md:p-8 rounded-lg">
          {config.fields.map((f: Field) => renderField(f))}
        </div>
      </div>
    );
  }

  const hasSidebarFields = config.fields.some((f: Field) => f.admin?.position === "sidebar");

  const fields = (
    <div
      className={`editor-field-layout w-full mx-auto grid gap-4 pb-16 ${sidebarCollapsed || !hasSidebarFields
          ? "grid-cols-1"
          : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]"
        }`}
    >
      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
        {config.tabs ? (
          renderField({ type: "tabs", tabs: config.tabs } as Field)
        ) : (
          <div className="field-stack surface-tile p-4 md:p-8 rounded-lg">
            {config.fields
              .filter(
                (f: Field) => !f.admin?.position || f.admin.position === "main",
              )
              .map((f: Field) => renderField(f))}
          </div>
        )}
      </div>

      {!sidebarCollapsed && hasSidebarFields && (
        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="field-stack surface-tile p-4 md:p-6 rounded-lg">
            <h3 className="text-sm font-medium text-[var(--kyro-text-secondary)]">
              Settings
            </h3>
            {config.fields
              .filter((f: Field) => f.admin?.position === "sidebar")
              .map((f: Field) => renderField(f))}
          </div>
        </div>
      )}
    </div>
  );
  return studio && showPreview ? <div className="studio-edit-preview"><div className="studio-edit-fields">{fields}</div><aside className="studio-preview-pane" aria-label="Document preview">{preview}</aside></div> : fields;
}
