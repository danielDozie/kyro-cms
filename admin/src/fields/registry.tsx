import type { ReactNode, ComponentType } from "react";
import type { FieldType } from "@kyro-cms/core";
import type { KyroField, FieldEditorProps } from "./types.ts";

const fields: Map<string, KyroField> = new Map();

export function registerField(field: KyroField): void {
  if (!field.id || typeof field.id !== "string") {
    throw new Error("Field must have a valid id");
  }
  if (!field.type || typeof field.type !== "string") {
    throw new Error("Field must have a valid type");
  }
  fields.set(field.id, field);
}

export function unregisterField(id: string): void {
  fields.delete(id);
}

export function getField(id: string): KyroField | undefined {
  return fields.get(id);
}

export function getFields(): KyroField[] {
  return Array.from(fields.values());
}

export function getFieldByType(type: FieldType): KyroField | undefined {
  return Array.from(fields.values()).find((f) => f.type === type);
}

export function useFieldRenderer(
  fieldId: string,
  props: Omit<FieldEditorProps, "onChange"> & {
    onChange?: (value: unknown) => void;
  },
): ReactNode | null {
  const field = fields.get(fieldId);
  if (!field) {
    console.warn(`Field "${fieldId}" not found in registry`);
    return null;
  }
  const FieldEditor: ComponentType<FieldEditorProps> = field.editor;
  return <FieldEditor {...(props as FieldEditorProps)} />;
}
