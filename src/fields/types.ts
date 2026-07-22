

// ============================================================================
// Base Field Interface
// ============================================================================

/**
 * Serializable condition for conditional field visibility.
 * Unlike function conditions, these survive JSON serialization
 * and can be used in admin configs that are built at compile time.
 */
export type DeclarativeCondition =
  | {
      /** The field name to evaluate (resolved from root form data, supports dot-notation) */
      field: string;
      /** Show the field when the target field equals this value */
      equals?: string | number | boolean;
      /** Show the field when the target field does NOT equal this value */
      notEquals?: string | number | boolean;
      /** Show the field when the target field's value is one of these */
      in?: (string | number | boolean)[];
      /** Show the field when the target field's value is greater than this */
      greaterThan?: number;
    }
  | { and: DeclarativeCondition[] }
  | { or: DeclarativeCondition[] };

export interface FieldAdmin {
  description?: string;
  placeholder?: string;
  readOnly?: boolean | ((
    data: Record<string, unknown>,
    siblingData: Record<string, unknown>,
  ) => boolean);
  hidden?: boolean | ((
    data: Record<string, unknown>,
    siblingData: Record<string, unknown>,
  ) => boolean);
  width?: string;
  position?: "sidebar" | "main";
  autoGenerate?: string;
  action?: string;
  method?: string;
  inline?: boolean;
  pickerMode?: "drawer" | "dropdown";
  condition?:
    | ((
        data: Record<string, unknown>,
        siblingData: Record<string, unknown>,
      ) => boolean)
    | DeclarativeCondition;
}

export interface BaseField {
  name: string;
  label?: string;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  defaultValue?: any;
  admin?: FieldAdmin;
  validate?: (
    value: any,
    options: ValidateOptions,
  ) => string | true | Promise<string | true>;
  hooks?: {
    beforeValidate?: Hook[];
    beforeChange?: Hook[];
    afterChange?: Hook[];
    afterRead?: Hook[];
  };
}

export interface ValidateOptions {
  data?: Record<string, any>;
  siblingData?: Record<string, any>;
  user?: unknown;
  operation?: string;
  required?: boolean;
}

export type Hook = (args: any) => Promise<any> | any;

// ============================================================================
// Primitive Fields
// ============================================================================

export type TextFieldVariant = "text" | "email" | "password" | "url" | "id";

export interface TextField extends BaseField {
  type: "text";
  variant?: TextFieldVariant;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  hasMany?: boolean;
  localized?: boolean;
}

export interface NumberField extends BaseField {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  hasMany?: boolean;
}

export interface CheckboxField extends BaseField {
  type: "checkbox";
}

export interface DateField extends BaseField {
  type: "date";
  minDate?: string;
  maxDate?: string;
  time?: boolean;
}

export interface EmailField extends BaseField {
  type: "email";
}

export interface PasswordField extends BaseField {
  type: "password";
}

export interface TextareaField extends BaseField {
  type: "textarea";
  minLength?: number;
  maxLength?: number;
  rows?: number;
  localized?: boolean;
}

export interface SelectField extends BaseField {
  type: "select";
  options?:
    | Array<{ label: string; value: string }>
    | ((args: { data: any; siblingData: any }) => Array<{ label: string; value: string }>);
  dynamicOptions?: string;
  hasMany?: boolean;
  defaultValue?: string | string[];
}

export interface RadioField extends BaseField {
  type: "radio";
  options:
    | Array<{ label: string; value: string }>
    | ((args: { data: any; siblingData: any }) => Array<{ label: string; value: string }>);
  defaultValue?: string;
}

export interface ColorField extends BaseField {
  type: "color";
  format?: "hex" | "rgb" | "hsl";
  defaultValue?: string;
}

export interface ImageField extends BaseField {
  type: "image";
  minCount?: number;
  maxCount?: number;
  allowedTypes?: string[];
  maxSize?: number;
}

// ============================================================================
// Complex Fields
// ============================================================================

export type RichTextBlock = Record<string, any>; // TipTap JSONContent

export interface RichTextField extends BaseField {
  type: "richtext";
  defaultValue?: Record<string, any>;
  localized?: boolean;
}

export interface JSONField extends BaseField {
  type: "json";
  defaultValue?: Record<string, any>;
}

export interface CodeField extends BaseField {
  type: "code";
  language?: string;
  defaultValue?: string;
}

export interface UploadField extends BaseField {
  type: "upload";
  relationTo: string;
  hasMany?: boolean;
  maxDepth?: number;
  defaultValue?: string;
}

export interface MarkdownField extends BaseField {
  type: "markdown";
  localized?: boolean;
  defaultValue?: string;
}

// ============================================================================
// Relational Fields
// ============================================================================

export interface RelationshipField extends BaseField {
  type: "relationship";
  /**
   * The collection slug(s) to relate to. 
   * Use "*" to allow relating to ANY registered collection.
   */
  relationTo: string | string[];
  hasMany?: boolean;
  maxDepth?: number;
  filterOptions?: (args: { data: any; user: any }) => Record<string, any>;
  defaultValue?: string | string[];
}

export interface ArrayField extends BaseField {
  type: "array";
  fields: Field[];
  minRows?: number;
  maxRows?: number;
  labels?: { singular?: string; plural?: string };
  defaultValue?: Record<string, any>[];
}

export interface ListField extends BaseField {
  type: "list";
  defaultValue?: string[];
}

export interface GroupField extends BaseField {
  type: "group";
  fields: Field[];
  defaultValue?: Record<string, any>;
}

export interface BlockImage {
  url: string;
  alt?: string;
}

export interface BlockAdmin {
  group?: string;
  description?: string;
  images?: {
    icon?: BlockImage | string;
    thumbnail?: BlockImage | string;
  };
}

export interface Block {
  slug: string;
  label: string;
  fields: Field[];
  imageURL?: string;
  admin?: BlockAdmin;
}

export interface BlocksField extends BaseField {
  type: "blocks";
  blocks?: Block[];
  minRows?: number;
  maxRows?: number;
  defaultValue?: Array<{ blockType: string; [key: string]: any }>;
}

export interface RowField extends Omit<BaseField, "name"> {
  type: "row";
  fields: Field[];
  name?: string;
}

export interface CollapsibleField extends Omit<BaseField, "name"> {
  type: "collapsible";
  fields: Field[];
  label: string;
  name?: string;
}

export interface TabsField extends Omit<BaseField, "name"> {
  type: "tabs";
  tabs: Array<{
    label: string;
    fields: Field[];
    name?: string;
  }>;
  name?: string;
}

export interface ButtonField extends BaseField {
  type: "button";
  label: string;
  action?: string;
  method?: string;
  inline?: boolean;
}

export interface ActionField extends BaseField {
  type: "action";
  label: string;
  action?: string;
  method?: string;
  inline?: boolean;
}

export interface SecretField extends BaseField {
  type: "secret";
}

export interface IconField extends BaseField {
  type: "icon";
}

// ============================================================================
// Union Type
// ============================================================================

export type Field =
  | TextField
  | NumberField
  | CheckboxField
  | DateField
  | EmailField
  | PasswordField
  | TextareaField
  | SelectField
  | RadioField
  | ColorField
  | ImageField
  | RichTextField
  | JSONField
  | CodeField
  | UploadField
  | MarkdownField
  | RelationshipField
  | ArrayField
  | ListField
  | GroupField
  | BlocksField
  | RowField
  | CollapsibleField
  | TabsField
  | ButtonField
  | ActionField
  | SecretField
  | IconField;

export type FieldType = Field["type"];

// ============================================================================
// Field Type Guards
// ============================================================================

export function isTextField(field: Field): field is TextField {
  return field.type === "text";
}

export function isNumberField(field: Field): field is NumberField {
  return field.type === "number";
}

export function isRelationshipField(field: Field): field is RelationshipField {
  return field.type === "relationship";
}

export function isArrayField(field: Field): field is ArrayField {
  return field.type === "array";
}

export function isGroupField(field: Field): field is GroupField {
  return field.type === "group";
}

export function isBlocksField(field: Field): field is BlocksField {
  return field.type === "blocks";
}

export function isUploadField(field: Field): field is UploadField {
  return field.type === "upload";
}

export function isImageField(field: Field): field is ImageField {
  return field.type === "image";
}

export function isRichTextField(field: Field): field is RichTextField {
  return field.type === "richtext";
}

export function isSelectField(field: Field): field is SelectField {
  return field.type === "select";
}

export function isLayoutField(
  field: Field,
): field is RowField | CollapsibleField | TabsField {
  return (
    field.type === "row" ||
    field.type === "collapsible" ||
    field.type === "tabs"
  );
}

export function isIconField(field: Field): field is IconField {
  return field.type === "icon";
}

// ============================================================================
// Field Type List
// ============================================================================

export const PRIMITIVE_FIELD_TYPES = [
  "text",
  "number",
  "checkbox",
  "date",
  "email",
  "password",
  "textarea",
  "select",
  "radio",
  "color",
  "icon",
] as const;

export const COMPLEX_FIELD_TYPES = [
  "richtext",
  "json",
  "code",
  "upload",
  "image",
  "markdown",
] as const;

export const RELATIONAL_FIELD_TYPES = [
  "relationship",
  "array",
  "group",
  "blocks",
] as const;

export const LAYOUT_FIELD_TYPES = ["row", "collapsible", "tabs"] as const;

export const ALL_FIELD_TYPES = [
  ...PRIMITIVE_FIELD_TYPES,
  ...COMPLEX_FIELD_TYPES,
  ...RELATIONAL_FIELD_TYPES,
  ...LAYOUT_FIELD_TYPES,
] as const;

// ============================================================================
// Field Factory Functions
// ============================================================================

export function createRelationshipFieldConfig(
  name: string,
  relationTo: string | string[],
  options?: Partial<Omit<RelationshipField, "type" | "name" | "relationTo">>,
): RelationshipField {
  return {
    name,
    type: "relationship",
    relationTo,
    ...options,
    required: options?.required ?? false,
  };
}
