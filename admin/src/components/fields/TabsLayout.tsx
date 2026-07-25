import React, { useState } from "react";
import type { Field } from "@kyro-cms/core/client";
import { SeoPreview } from "../ui/SeoPreview";

interface TabsLayoutProps {
  field: Field;
  formData: Record<string, unknown>;
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
  onTabDataChange,
  renderField,
}: TabsLayoutProps) {
  const [activeTab, setActiveTab] = useState(0);

  const fieldTabs = (field as Field & { tabs?: { label: string; fields: Field[] }[] }).tabs || [];
  const currentTab = fieldTabs[activeTab] || fieldTabs[0];

  // Tab data is stored nested under field.name when present
  const tabData: Record<string, unknown> = field.name
    ? (formData[field.name] as Record<string, unknown>) || {}
    : formData;

  // Removed copy/paste logic

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-[var(--kyro-border)] mb-6">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {fieldTabs.map((tab: { label: string }, index: number) => (
            <button
              key={index}
              type="button"
              className={`px-6 py-3 text-sm  tracking-widest font-medium transition-all border-b-2 -mb-[1px] whitespace-nowrap ${
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
          <h4 className="text-[10px] font-bold text-[var(--kyro-text-secondary)]  tracking-[0.2em] mb-6 opacity-50">
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
          />
        </div>
      )}
    </div>
  );
}
