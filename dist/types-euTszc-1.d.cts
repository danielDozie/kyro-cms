/**
 * Serializable condition for conditional field visibility.
 * Unlike function conditions, these survive JSON serialization
 * and can be used in admin configs that are built at compile time.
 */
type DeclarativeCondition = {
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
} | {
    and: DeclarativeCondition[];
} | {
    or: DeclarativeCondition[];
};
interface FieldAdmin {
    description?: string;
    placeholder?: string;
    readOnly?: boolean | ((data: Record<string, unknown>, siblingData: Record<string, unknown>) => boolean);
    hidden?: boolean | ((data: Record<string, unknown>, siblingData: Record<string, unknown>) => boolean);
    width?: string;
    position?: "sidebar" | "main";
    autoGenerate?: string;
    action?: string;
    method?: string;
    inline?: boolean;
    pickerMode?: "drawer" | "dropdown";
    condition?: ((data: Record<string, unknown>, siblingData: Record<string, unknown>) => boolean) | DeclarativeCondition;
}
interface BaseField {
    name: string;
    label?: string;
    required?: boolean;
    unique?: boolean;
    indexed?: boolean;
    defaultValue?: any;
    admin?: FieldAdmin;
    validate?: (value: any, options: ValidateOptions) => string | true | Promise<string | true>;
    hooks?: {
        beforeValidate?: Hook[];
        beforeChange?: Hook[];
        afterChange?: Hook[];
        afterRead?: Hook[];
    };
}
interface ValidateOptions {
    data?: Record<string, any>;
    siblingData?: Record<string, any>;
    user?: unknown;
    operation?: string;
    required?: boolean;
}
type Hook = (args: any) => Promise<any> | any;
type TextFieldVariant = "text" | "email" | "password" | "url" | "id";
interface TextField extends BaseField {
    type: "text";
    variant?: TextFieldVariant;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    hasMany?: boolean;
    localized?: boolean;
}
interface NumberField extends BaseField {
    type: "number";
    min?: number;
    max?: number;
    step?: number;
    integer?: boolean;
    hasMany?: boolean;
}
interface CheckboxField extends BaseField {
    type: "checkbox";
}
interface DateField extends BaseField {
    type: "date";
    minDate?: string;
    maxDate?: string;
    time?: boolean;
}
interface EmailField extends BaseField {
    type: "email";
}
interface PasswordField extends BaseField {
    type: "password";
}
interface TextareaField extends BaseField {
    type: "textarea";
    minLength?: number;
    maxLength?: number;
    rows?: number;
    localized?: boolean;
}
interface SelectField extends BaseField {
    type: "select";
    options?: Array<{
        label: string;
        value: string;
    }> | ((args: {
        data: any;
        siblingData: any;
    }) => Array<{
        label: string;
        value: string;
    }>);
    dynamicOptions?: string;
    hasMany?: boolean;
    defaultValue?: string | string[];
}
interface RadioField extends BaseField {
    type: "radio";
    options: Array<{
        label: string;
        value: string;
    }> | ((args: {
        data: any;
        siblingData: any;
    }) => Array<{
        label: string;
        value: string;
    }>);
    defaultValue?: string;
}
interface ColorField extends BaseField {
    type: "color";
    format?: "hex" | "rgb" | "hsl";
    defaultValue?: string;
}
interface ImageField extends BaseField {
    type: "image";
    minCount?: number;
    maxCount?: number;
    allowedTypes?: string[];
    maxSize?: number;
}
type RichTextBlock = Record<string, any>;
interface RichTextField extends BaseField {
    type: "richtext";
    defaultValue?: Record<string, any>;
    localized?: boolean;
}
interface JSONField extends BaseField {
    type: "json";
    defaultValue?: Record<string, any>;
}
interface CodeField extends BaseField {
    type: "code";
    language?: string;
    defaultValue?: string;
}
interface UploadField extends BaseField {
    type: "upload";
    relationTo: string;
    hasMany?: boolean;
    maxDepth?: number;
    defaultValue?: string;
}
interface MarkdownField extends BaseField {
    type: "markdown";
    localized?: boolean;
    defaultValue?: string;
}
interface RelationshipField extends BaseField {
    type: "relationship";
    /**
     * The collection slug(s) to relate to.
     * Use "*" to allow relating to ANY registered collection.
     */
    relationTo: string | string[];
    hasMany?: boolean;
    maxDepth?: number;
    filterOptions?: (args: {
        data: any;
        user: any;
    }) => Record<string, any>;
    defaultValue?: string | string[];
}
interface ArrayField extends BaseField {
    type: "array";
    fields: Field[];
    minRows?: number;
    maxRows?: number;
    labels?: {
        singular?: string;
        plural?: string;
    };
    defaultValue?: Record<string, any>[];
}
interface ListField extends BaseField {
    type: "list";
    defaultValue?: string[];
}
interface GroupField extends BaseField {
    type: "group";
    fields: Field[];
    defaultValue?: Record<string, any>;
}
interface BlockImage {
    url: string;
    alt?: string;
}
interface BlockAdmin {
    group?: string;
    description?: string;
    images?: {
        icon?: BlockImage | string;
        thumbnail?: BlockImage | string;
    };
}
interface Block {
    slug: string;
    label: string;
    fields: Field[];
    imageURL?: string;
    admin?: BlockAdmin;
}
interface BlocksField extends BaseField {
    type: "blocks";
    blocks?: Block[];
    minRows?: number;
    maxRows?: number;
    defaultValue?: Array<{
        blockType: string;
        [key: string]: any;
    }>;
}
interface RowField extends Omit<BaseField, "name"> {
    type: "row";
    fields: Field[];
    name?: string;
}
interface CollapsibleField extends Omit<BaseField, "name"> {
    type: "collapsible";
    fields: Field[];
    label: string;
    name?: string;
}
interface TabsField extends Omit<BaseField, "name"> {
    type: "tabs";
    tabs: Array<{
        label: string;
        fields: Field[];
        name?: string;
    }>;
    name?: string;
}
interface ButtonField extends BaseField {
    type: "button";
    label: string;
    action?: string;
    method?: string;
    inline?: boolean;
}
interface ActionField extends BaseField {
    type: "action";
    label: string;
    action?: string;
    method?: string;
    inline?: boolean;
}
interface SecretField extends BaseField {
    type: "secret";
}
interface IconField extends BaseField {
    type: "icon";
}
type Field = TextField | NumberField | CheckboxField | DateField | EmailField | PasswordField | TextareaField | SelectField | RadioField | ColorField | ImageField | RichTextField | JSONField | CodeField | UploadField | MarkdownField | RelationshipField | ArrayField | ListField | GroupField | BlocksField | RowField | CollapsibleField | TabsField | ButtonField | ActionField | SecretField | IconField;
type FieldType = Field["type"];
declare function isTextField(field: Field): field is TextField;
declare function isNumberField(field: Field): field is NumberField;
declare function isRelationshipField(field: Field): field is RelationshipField;
declare function isArrayField(field: Field): field is ArrayField;
declare function isGroupField(field: Field): field is GroupField;
declare function isBlocksField(field: Field): field is BlocksField;
declare function isUploadField(field: Field): field is UploadField;
declare function isImageField(field: Field): field is ImageField;
declare function isRichTextField(field: Field): field is RichTextField;
declare function isSelectField(field: Field): field is SelectField;
declare function isLayoutField(field: Field): field is RowField | CollapsibleField | TabsField;
declare function isIconField(field: Field): field is IconField;
declare const PRIMITIVE_FIELD_TYPES: readonly ["text", "number", "checkbox", "date", "email", "password", "textarea", "select", "radio", "color", "icon"];
declare const COMPLEX_FIELD_TYPES: readonly ["richtext", "json", "code", "upload", "image", "markdown"];
declare const RELATIONAL_FIELD_TYPES: readonly ["relationship", "array", "group", "blocks"];
declare const LAYOUT_FIELD_TYPES: readonly ["row", "collapsible", "tabs"];
declare const ALL_FIELD_TYPES: readonly ["text", "number", "checkbox", "date", "email", "password", "textarea", "select", "radio", "color", "icon", "richtext", "json", "code", "upload", "image", "markdown", "relationship", "array", "group", "blocks", "row", "collapsible", "tabs"];
declare function createRelationshipFieldConfig(name: string, relationTo: string | string[], options?: Partial<Omit<RelationshipField, "type" | "name" | "relationTo">>): RelationshipField;

export { isRelationshipField as $, ALL_FIELD_TYPES as A, type BaseField as B, type CheckboxField as C, type DateField as D, type EmailField as E, type Field as F, type GroupField as G, type Hook as H, type IconField as I, type JSONField as J, createRelationshipFieldConfig as K, LAYOUT_FIELD_TYPES as L, type MarkdownField as M, type NumberField as N, isArrayField as O, type PasswordField as P, isBlocksField as Q, type RadioField as R, type SecretField as S, type TabsField as T, type UploadField as U, type ValidateOptions as V, isGroupField as W, isIconField as X, isImageField as Y, isLayoutField as Z, isNumberField as _, type ArrayField as a, isRichTextField as a0, isSelectField as a1, isTextField as a2, isUploadField as a3, type Block as b, type BlockAdmin as c, type BlockImage as d, type BlocksField as e, type CodeField as f, type CollapsibleField as g, type ColorField as h, type DeclarativeCondition as i, type FieldAdmin as j, type FieldType as k, type ImageField as l, type RelationshipField as m, type RichTextBlock as n, type RichTextField as o, type RowField as p, type SelectField as q, type TextField as r, type TextareaField as s, type ActionField as t, type ButtonField as u, COMPLEX_FIELD_TYPES as v, type ListField as w, PRIMITIVE_FIELD_TYPES as x, RELATIONAL_FIELD_TYPES as y, type TextFieldVariant as z };
