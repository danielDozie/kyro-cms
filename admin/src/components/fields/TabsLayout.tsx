import React, { useState } from "react";
import type { Field } from "@kyro-cms/core/client";
import { SeoPreview } from "../ui/SeoPreview";
import { ChevronDown } from "../ui/icons";

interface TabsLayoutProps {
  field: Field;
  formData: Record<string, unknown>;
  collectionSlug?: string;
  onTabDataChange: (value: unknown) => void;
  renderField: (
    field: Field,
    parentData: Record<string, unknown>,
    onChange: (value: unknown) => void,
  ) => React.ReactNode;
}

export function TabsLayout({
  field,
  formData,
  collectionSlug,
  onTabDataChange,
  renderField,
}: TabsLayoutProps) {
  const isAccordion = (field as any).admin?.layout === "accordion";
  const [activeTab, setActiveTab] = useState<number>(0);

  const [openAccordionIndices, setOpenAccordionIndices] = useState<Set<number>>(() => {
    if ((field as any).admin?.initCollapsed) return new Set();
    return new Set();
  });

  const fieldTabs = (field as Field & { tabs?: { label: string; fields: Field[] }[] }).tabs || [];
  const currentTab = fieldTabs[activeTab] || fieldTabs[0];

  // Tab data is stored nested under field.name when present
  const tabData: Record<string, unknown> = field.name
    ? (formData[field.name] as Record<string, unknown>) || {}
    : formData;

  if (isAccordion) {
    return (
      <div className="space-y-4">
        {fieldTabs.map((tab, idx) => {
          const isOpen = openAccordionIndices.has(idx);
          return (
            <div
              key={idx}
              className="border border-[var(--kyro-border)] rounded-[var(--kyro-radius-lg)] bg-[var(--kyro-surface-accent)]/15 overflow-hidden transition-all shadow-xs"
            >
              <div
                className={`flex items-center justify-between p-4 bg-[var(--kyro-surface)] cursor-pointer hover:bg-[var(--kyro-surface-accent)]/30 transition-colors select-none ${
                  isOpen ? "border-b border-[var(--kyro-border)]" : ""
                }`}
                onClick={() => {
                  setOpenAccordionIndices((prev) => {
                    const next = new Set(prev);
                    if (next.has(idx)) next.delete(idx);
                    else next.add(idx);
                    return next;
                  });
                }}
              >
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--kyro-text-primary)]">
                    {tab.label}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-muted)] border border-[var(--kyro-border)]">
                    {(tab.fields || []).length} {(tab.fields || []).length === 1 ? "field" : "fields"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--kyro-text-muted)] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>

              {isOpen && (
                <div className="p-6 space-y-6">
                  {(tab.fields || []).map((f: Field) =>
                    renderField(
                      f,
                      field.name ? tabData : formData,
                      field.name ? onTabDataChange : (undefined as any),
                    ),
                  )}
                  {tab.label === "SEO Settings" && (
                    <div className="mt-8 pt-6 border-t border-[var(--kyro-border)]">
                      <h4 className="text-[10px] font-bold text-[var(--kyro-text-secondary)] tracking-[0.2em] mb-4 opacity-50">
                        Live Google Preview
                      </h4>
                      <SeoPreview
                        title={String(
                          (typeof tabData.metaTitle === "object" ? "" : tabData.metaTitle) ||
                          (typeof tabData.title === "object" ? "" : tabData.title) ||
                          "Untitled"
                        )}
                        description={String(
                          (typeof tabData.metaDescription === "object" ? "" : tabData.metaDescription) ||
                          "Please enter a description..."
                        )}
                        slug={String(
                          (typeof formData.slug === "object" ? "" : formData.slug) ||
                          "your-slug"
                        )}
                        collectionSlug={collectionSlug}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-[var(--kyro-border)] mb-6">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {fieldTabs.map((tab: { label: string }, index: number) => (
            <button
              key={index}
              type="button"
              className={`px-6 py-3 text-sm tracking-widest font-medium transition-all border-b-2 -mb-[1px] whitespace-nowrap ${
                activeTab === index
                  ? "border-[var(--kyro-primary)] text-[var(--kyro-primary)]"
                  : "border-transparent text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] opacity-60 hover:opacity-100"
              }`}
              onClick={() => setActiveTab(index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        {currentTab?.fields.map((f: Field) =>
          renderField(
            f,
            field.name ? tabData : formData,
            field.name ? onTabDataChange : undefined as any,
          ),
        )}
      </div>

      {currentTab?.label === "SEO Settings" && (
        <div className="mt-12 pt-8 border-t border-[var(--kyro-border)]">
          <h4 className="text-[10px] font-bold text-[var(--kyro-text-secondary)] tracking-[0.2em] mb-6 opacity-50">
            Live Google Preview
          </h4>
          <SeoPreview
            title={String(
              (typeof tabData.metaTitle === "object" ? "" : tabData.metaTitle) ||
              (typeof tabData.title === "object" ? "" : tabData.title) ||
              "Untitled"
            )}
            description={String(
              (typeof tabData.metaDescription === "object" ? "" : tabData.metaDescription) ||
              "Please enter a description..."
            )}
            slug={String(
              (typeof formData.slug === "object" ? "" : formData.slug) ||
              "your-slug"
            )}
            collectionSlug={collectionSlug}
          />
        </div>
      )}
    </div>
  );
}
