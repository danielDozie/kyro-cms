import React from "react";
import type { CollectionConfig, GlobalConfig, Field } from "@kyro-cms/core/client";
import { useAutoFormStore } from "../../lib/autoform-store";
import { useTranslation } from "react-i18next";

interface AutoFormEditViewProps {
  config: CollectionConfig | GlobalConfig;
  layout: "split" | "single";
  collectionSlug?: string;
  renderField: (field: Field) => React.ReactNode;
}

export function AutoFormEditView({
  config,
  layout,
  collectionSlug,
  renderField,
}: AutoFormEditViewProps) {
  const { t } = useTranslation();
  const { showPreview, sidebarCollapsed, formData, previewUrl } = useAutoFormStore();

  if (layout === "single") {
    return (
      <div className="w-full space-y-6 md:space-y-8">
        <div className="surface-tile p-4 md:p-8 space-y-6 md:space-y-8 rounded-lg">
          {config.fields.map((f: Field) => renderField(f))}
        </div>
      </div>
    );
  }

  const showRightColumn = !sidebarCollapsed && !showPreview;
  const hasSidebarFields =
    config.fields.some((f: Field) => f.admin?.position === "sidebar") &&
    !showPreview;

  return (
    <div
      className={`w-full mx-auto grid gap-4 pb-32 transition-all duration-700 ${showPreview
        ? "grid-cols-1 lg:grid-cols-2"
        : sidebarCollapsed || !hasSidebarFields
          ? "grid-cols-1"
          : "grid-cols-1 lg:grid-cols-[1fr_380px]"
        }`}
    >
      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
        {config.tabs ? (
          renderField({ type: "tabs", tabs: config.tabs } as Field)
        ) : (
          <div className="surface-tile p-4 md:p-8 space-y-6 md:space-y-8 rounded-lg">
            {config.fields
              .filter(
                (f: Field) => !f.admin?.position || f.admin.position === "main",
              )
              .map((f: Field) => renderField(f))}
          </div>
        )}
      </div>

      {showPreview ? (
        <div className="sticky top-36 h-[calc(100vh-280px)] animate-in fade-in slide-in-from-right-10 duration-700">
          <div className="w-full h-full rounded-3xl border border-[var(--kyro-border)] bg-[var(--kyro-bg-secondary)] shadow-2xl overflow-hidden relative group">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-white/60">
                Live Preview Mode
              </span>
            </div>
            <iframe
              src={previewUrl || ""}
              className="w-full h-full border-none"
              title={t("tooltips.livePreview", { defaultValue: "Live Preview" })}
            />
            <div className="absolute inset-0 bg-transparent pointer-events-none border-[12px] border-[var(--kyro-surface)] rounded-3xl" />
          </div>
        </div>
      ) : sidebarCollapsed ? null : (
        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          {config.fields.some((f: Field) => f.admin?.position === "sidebar") && (
            <div className="surface-tile p-4 md:p-6 space-y-4 md:space-y-6 rounded-lg">
              <h3 className="text-[10px] font-bold tracking-[0.2em] opacity-40">
                Settings
              </h3>
              {config.fields
                .filter((f: Field) => f.admin?.position === "sidebar")
                .map((f: Field) => renderField(f))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
