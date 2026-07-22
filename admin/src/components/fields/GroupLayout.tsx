import React from "react";
import type { Field } from "@kyro-cms/core/client";

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

  return (
    <div className="kyro-form-group border border-[var(--kyro-border)] rounded-[var(--kyro-radius-lg)] p-6 bg-[var(--kyro-surface-accent)]/30">
      <div className="flex items-center justify-between mb-6 border-b border-[var(--kyro-border)] pb-2">
        <h3 className="text-sm font-bold tracking-widest text-[var(--kyro-text-primary)]">
          {field.label || field.name}
        </h3>

      </div>
      <div className={field.admin?.inline ? "flex items-start gap-4" : "space-y-6"}>
        {(field as Field & { fields?: Field[] }).fields?.map((f: Field) =>
          renderField(f, groupData, onChange),
        )}
      </div>
    </div>
  );
}
