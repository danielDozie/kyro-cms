import React, { useState } from "react";
import type { Field } from "@kyro-cms/core/client";
import { ChevronDown } from "../ui/icons";

interface GroupLayoutProps {
  field: Field;
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown>) => void;
  renderField: (
    field: Field,
    parentData: Record<string, unknown>,
    onChange: (value: Record<string, unknown>) => void,
  ) => React.ReactNode;
}

export function GroupLayout({
  field,
  value,
  onChange,
  renderField,
}: GroupLayoutProps) {
  const groupData = value || {};
  const isCollapsible = field.admin?.collapsible !== false;
  const initialOpen = field.admin?.initCollapsed ? false : !isCollapsible;
  const [isOpen, setIsOpen] = useState(initialOpen);

  const subFields = (field as Field & { fields?: Field[] }).fields || [];

  return (
    <div className="kyro-form-group border border-[var(--kyro-border)] rounded-[var(--kyro-radius-lg)] bg-[var(--kyro-surface-accent)]/20 overflow-hidden transition-all shadow-xs">
      <div
        className={`flex items-center justify-between p-4 bg-[var(--kyro-surface)] select-none ${
          isCollapsible ? "cursor-pointer hover:bg-[var(--kyro-surface-accent)]/30 transition-colors" : ""
        } ${isOpen && subFields.length > 0 ? "border-b border-[var(--kyro-border)]" : ""}`}
        onClick={() => {
          if (isCollapsible) {
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--kyro-text-primary)]">
            {field.label || field.name}
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-muted)] border border-[var(--kyro-border)]">
            {subFields.length} {subFields.length === 1 ? "field" : "fields"}
          </span>
        </div>

        {isCollapsible && (
          <ChevronDown
            className={`w-4 h-4 text-[var(--kyro-text-muted)] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {isOpen && (
        <div className={`p-5 ${field.admin?.inline ? "flex items-start gap-4" : "space-y-5"}`}>
          {subFields.map((f: Field) => renderField(f, groupData, onChange))}
        </div>
      )}
    </div>
  );
}
