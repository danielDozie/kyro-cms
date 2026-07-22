import React from "react";
import type { Field } from "@kyro-cms/core/client";

interface FieldLayoutProps {
  field: Field;
  error?: string;
  children: React.ReactNode;
  hideLabel?: boolean;
}

export default function FieldLayout({
  field,
  error,
  children,
  hideLabel = false,
}: FieldLayoutProps) {
  return (
    <div className="space-y-2.5 w-full group">
      {field.label && !hideLabel && (
        <div className="flex justify-between items-end mb-1">
          <label className="block text-xs font-bold  tracking-widest text-[var(--kyro-text-secondary)] opacity-50 group-focus-within:opacity-100 group-focus-within:text-[var(--kyro-primary)] transition-all duration-300">
            {field.label}
            {field.required && (
              <span className="text-[var(--kyro-error)] ml-1">*</span>
            )}
          </label>
        </div>
      )}

      <div className="relative transform transition-transform duration-200 focus-within:scale-[1.002]">
        {children}
      </div>

      {((field.admin?.description as string | undefined) || error) && (
        <div className="flex flex-col gap-1.5 px-1">
          {((field.admin?.description as string | undefined) && !error) && (
            <p className="text-[11px] leading-relaxed text-[var(--kyro-text-muted)] font-medium opacity-60 italic">
              {field.admin?.description as string}
            </p>
          )}
          {error && (
            <p className="text-[11px] leading-relaxed text-[var(--kyro-error)] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--kyro-error)] shadow-[0_0_8px_var(--kyro-error)]" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>

  );
}
