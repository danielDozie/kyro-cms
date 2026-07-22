export {
  registerField,
  unregisterField,
  getField,
  getFields,
  getFieldByType,
  useFieldRenderer,
} from "./registry.tsx";
export type { KyroField, FieldEditorProps } from "./types.ts";
export { default as sampleField } from "./examples/sample-field";
export { default as sampleField2 } from "./examples/sample-field-2.tsx";

// Re-export core field types for type-safe field registration
export type {
  FieldType,
  Field,
  TextField,
  NumberField,
  CheckboxField,
  DateField,
  SelectField,
  TextareaField,
  RichTextField,
  CodeField,
  JSONField,
  ImageField,
  UploadField,
  RelationshipField,
  BlocksField,
  ArrayField,
  GroupField,
} from "@kyro-cms/core";

export { ALL_FIELD_TYPES } from "@kyro-cms/core/client";
