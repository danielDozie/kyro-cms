import type { ReactNode } from "react";
import type { FieldType } from "@kyro-cms/core";

export interface FieldEditorProps {
  name: string;
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  schema?: Record<string, unknown>;
}

export interface KyroField {
  id: string;
  type: FieldType;
  label?: string;
  editor: React.ComponentType<FieldEditorProps>;
  schema?: Record<string, unknown>;
  defaultValue?: unknown;
  validate?: (value: unknown) => string | null;
}
