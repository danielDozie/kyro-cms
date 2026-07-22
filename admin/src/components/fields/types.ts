import type { ReactNode } from "react";
import type { Field } from "@kyro-cms/core/client";

export interface FieldComponentProps<TField extends Field = Field> {
  field: TField;
  value?: unknown;
  onChange?: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export interface Compactable {
  compact?: boolean;
}

export type FieldChangeHandler = (field: string, value: unknown) => void;

export type RenderFieldFn = (
  field: Field,
  parentData: Record<string, unknown>,
  onChange: (value: unknown) => void,
) => ReactNode;
