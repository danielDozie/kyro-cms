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
    <div className="workspace-field w-full group">
      {field.label && !hideLabel && (
        <div className="flex justify-between items-end mb-1.5">
          <label htmlFor={field.name} className="block text-sm font-medium text-[var(--kyro-text-primary)]">
            {field.label}
            {field.required && (
              <span className="text-[var(--kyro-error)] ml-1">*</span>
            )}
          </label>
        </div>
      )}

      <div className="relative">
        {children}
      </div>

      {((field.admin?.description as string | undefined) || error) && (
        <div className="flex flex-col gap-1 mt-1 px-0.5">
          {((field.admin?.description as string | undefined) && !error) && (
            <p className="text-xs leading-normal text-[var(--kyro-text-muted)]">
              {field.admin?.description as string}
            </p>
          )}
          {error && (
            <p className="text-xs leading-normal text-[var(--kyro-error)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--kyro-error)]" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
