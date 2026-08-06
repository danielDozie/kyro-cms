import React from "react";
import { useAutoFormStore } from "../../lib/autoform-store";
import { useTranslation } from "react-i18next";

interface AutoFormApiViewProps {
  collectionSlug?: string;
  globalSlug?: string;
}

export function AutoFormApiView({
  collectionSlug,
  globalSlug,
}: AutoFormApiViewProps) {
  const { t } = useTranslation();
  const { formData } = useAutoFormStore();

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="surface-tile p-8 min-w-0 rounded-lg">
          <h2 className="text-xl font-bold mb-6">Response Payload</h2>
          <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/5 overflow-x-auto max-h-[800px]">
            <pre className="text-blue-300 text-xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-tile p-8 space-y-6 rounded-lg">
            <h2 className="text-xl font-bold mb-6">API Info</h2>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold tracking-[0.1em] text-[var(--kyro-text-secondary)] opacity-50 block mb-2">
                  Reference Path
                </label>
                <div className="bg-[var(--kyro-bg-secondary)] px-4 py-3 rounded-md border border-[var(--kyro-border)] text-[11px] font-mono break-all selection:bg-[var(--kyro-primary)]/20 text-[var(--kyro-text-primary)]">
                  {globalSlug
                    ? `kyro.globals('${globalSlug}').get()`
                    : formData.id
                      ? `kyro.collection('${collectionSlug}').get('${formData.id}')`
                      : "Not saved yet"}
                </div>
              </div>

              {Boolean(formData.id) && (
                <div>
                  <label className="text-[10px] font-bold tracking-[0.1em] text-[var(--kyro-text-secondary)] opacity-50 block mb-2">
                    Document ID
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-[var(--kyro-bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--kyro-border)] text-[var(--kyro-text-primary)]">
                      {String(formData.id)}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(formData.id));
                      }}
                      className="p-1.5 hover:bg-[var(--kyro-bg-secondary)] rounded-lg transition-colors text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                      title={t("tooltips.copyId", { defaultValue: "Copy ID" })}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {globalSlug && (
                <div>
                  <label className="text-[10px] font-bold tracking-[0.1em] text-[var(--kyro-text-secondary)] opacity-50 block mb-2">
                    Global Slug
                  </label>
                  <code className="text-xs font-mono bg-[var(--kyro-bg-secondary)] px-3 py-1.5 rounded-lg border border-[var(--kyro-border)] text-[var(--kyro-text-primary)]">
                    {globalSlug}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
