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
              className="border border-[var(--kyro-border)] rounded-[var(--kyro-radius-lg)] bg-[var(--kyro-surface-accent)]/15 overflow-hidden transition-all "
            >
              <button
                type="button"
                aria-expanded={isOpen}
                className={`w-full text-left flex items-center justify-between p-3 bg-[var(--kyro-surface)] cursor-pointer hover:bg-[var(--kyro-surface-accent)]/30 transition-colors select-none ${
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
                  <h3 className="text-sm font-medium text-[var(--kyro-text-primary)]">
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
              </button>

              {isOpen && (
                <div className="field-stack p-4">
                  {(tab.fields || []).map((f: Field) =>
                    renderField(
                      f,
                      field.name ? tabData : formData,
                      field.name ? onTabDataChange : (undefined as any),
                    ),
                  )}
                  {tab.label === "SEO Settings" && (
                    <div className="mt-8 pt-6 border-t border-[var(--kyro-border)]">
                      <h4 className="text-xs font-semibold text-[var(--kyro-text-muted)] uppercase tracking-normal mb-3">
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
              aria-pressed={activeTab === index}
              className={`px-4 py-2 text-sm font-normal transition-all border-b-2 rounded-none -mb-[1px] whitespace-nowrap ${
                activeTab === index
                  ? "border-[var(--kyro-primary)] text-[var(--kyro-accent-text)]"
                  : "border-transparent text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
              }`}
              style={{ borderRadius: 0 }}
              onClick={() => setActiveTab(index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field-stack">
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
          <h4 className="text-xs font-semibold text-[var(--kyro-text-muted)] uppercase tracking-normal mb-4">
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
