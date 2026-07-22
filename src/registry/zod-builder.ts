import { z, type ZodTypeAny } from "zod";
import type {
  Field,
  TextField,
  NumberField,
  CheckboxField,
  DateField,
  EmailField,
  PasswordField,
  TextareaField,
  SelectField,
  RadioField,
  ColorField,
  RichTextField,
  JSONField,
  CodeField,
  UploadField,
  MarkdownField,
  RelationshipField,
  ArrayField,
  GroupField,
  BlocksField,
  RowField,
  CollapsibleField,
  TabsField,
  ValidateOptions,
} from "../fields/types.js";
import type { CollectionConfig, GlobalConfig } from "./types.js";

// ============================================================================
// Field → Zod Schema Generator
// ============================================================================

export function fieldToZod(field: Field): ZodTypeAny {
  switch (field.type) {
    case "text":
      return textToZod(field);
    case "number":
      return numberToZod(field);
    case "checkbox":
      return checkboxToZod(field);
    case "date":
      return dateToZod(field);
    case "email":
      return emailToZod(field);
    case "password":
      return passwordToZod(field);
    case "textarea":
      return textareaToZod(field);
    case "select":
      return selectToZod(field);
    case "radio":
      return radioToZod(field);
    case "color":
      return colorToZod(field);
    case "richtext":
      return richTextToZod(field);
    case "json":
      return jsonToZod(field);
    case "code":
      return codeToZod(field);
    case "upload":
      return uploadToZod(field);
    case "image":
      return uploadToZod(field as any);
    case "markdown":
      return markdownToZod(field);
    case "relationship":
      return relationshipToZod(field);
    case "relationship-block" as any:
      return relationshipToZod(field as any);
    case "array":
      return arrayToZod(field);
    case "list":
      return listToZod(field);
    case "group":
      return groupToZod(field);
    case "blocks":
      return blocksToZod(field);
    case "row":
      return rowToZod(field);
    case "collapsible":
      return collapsibleToZod(field);
    case "tabs":
      return tabsToZod(field);
    default:
      return z.any();
  }
}

// ============================================================================
// Primitive Field Schemas
// ============================================================================

function textToZod(field: TextField): ZodTypeAny {
  let schema: ZodTypeAny = z.string();
  if (field.minLength) schema = (schema as any).min(field.minLength);
  if (field.maxLength) schema = (schema as any).max(field.maxLength);
  if (field.pattern) schema = (schema as any).regex(new RegExp(field.pattern));
  if (field.variant === "email") schema = (schema as any).email();
  if (field.variant === "url") schema = (schema as any).url();
  if (field.hasMany) schema = z.array(schema);
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function numberToZod(field: NumberField): ZodTypeAny {
  let schema: ZodTypeAny = field.integer ? z.coerce.number().int() : z.coerce.number();
  if (field.min !== undefined) schema = (schema as any).min(field.min);
  if (field.max !== undefined) schema = (schema as any).max(field.max);
  if (field.step) {
    schema = (schema as any).refine(
      (val: number) => Number.isInteger(val / field.step!),
      `Value must be divisible by ${field.step}`,
    );
  }
  if (field.hasMany) schema = z.array(schema);
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function checkboxToZod(field: CheckboxField): ZodTypeAny {
  let schema: ZodTypeAny = z.boolean();
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function dateToZod(field: DateField): ZodTypeAny {
  let schema: ZodTypeAny = z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date format");
  if (field.minDate) {
    schema = (schema as any).refine(
      (val: string) => new Date(val) >= new Date(field.minDate!),
      `Date must be after ${field.minDate}`,
    );
  }
  if (field.maxDate) {
    schema = (schema as any).refine(
      (val: string) => new Date(val) <= new Date(field.maxDate!),
      `Date must be before ${field.maxDate}`,
    );
  }
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function emailToZod(field: EmailField): ZodTypeAny {
  let schema: ZodTypeAny = z.string().email("Invalid email");
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function passwordToZod(field: PasswordField): ZodTypeAny {
  let schema: ZodTypeAny = z
    .string()
    .min(6, "Password must be at least 6 characters");
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function textareaToZod(field: TextareaField): ZodTypeAny {
  let schema: ZodTypeAny = z.string();
  if (field.minLength) schema = (schema as any).min(field.minLength);
  if (field.maxLength) schema = (schema as any).max(field.maxLength);
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function selectToZod(field: SelectField): ZodTypeAny {
  let schema: ZodTypeAny;
  if (Array.isArray(field.options) && field.options.length > 0) {
    const values = field.options.map((opt) => opt.value);
    if (field.hasMany) {
      schema = z.array(z.enum(values as [string, ...string[]]));
    } else {
      schema = z.enum(values as [string, ...string[]]);
    }
  } else {
    schema = field.hasMany ? z.array(z.string()) : z.string();
  }
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function radioToZod(field: RadioField): ZodTypeAny {
  let schema: ZodTypeAny;
  if (Array.isArray(field.options) && field.options.length > 0) {
    const values = field.options.map((opt) => opt.value);
    schema = z.enum(values as [string, ...string[]]);
  } else {
    schema = z.string();
  }
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function colorToZod(field: ColorField): ZodTypeAny {
  let schema: ZodTypeAny = z.string();
  if (field.format === "hex")
    schema = (schema as any).regex(/^#[0-9A-Fa-f]{6}$/);
  if (field.format === "rgb")
    schema = (schema as any).regex(
      /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
    );
  if (field.format === "hsl")
    schema = (schema as any).regex(
      /^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$/,
    );
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

// ============================================================================
// Complex Field Schemas
// ============================================================================

function richTextToZod(field: RichTextField): ZodTypeAny {
  let schema: ZodTypeAny = z.array(z.record(z.any()));
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function jsonToZod(field: JSONField): ZodTypeAny {
  let schema: ZodTypeAny = z.union([z.record(z.any()), z.array(z.any())]);
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function codeToZod(field: CodeField): ZodTypeAny {
  let schema: ZodTypeAny = z.string();
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function uploadToZod(field: UploadField): ZodTypeAny {
  let schema: ZodTypeAny;

  if (field.relationTo) {
    const mediaSchema = z.object({
      id: z.string(),
      url: z.string().optional(),
      filename: z.string().optional(),
      mimeType: z.string().optional(),
    });
    schema = z.union([z.string(), mediaSchema]);
  } else {
    schema = z.string();
  }

  if (field.hasMany) {
    schema = z.array(schema);
  }

  if (!field.required) {
    schema = (schema as any).optional().nullable();
  }

  if (field.validate) {
    schema = addCustomValidation(schema, field.validate);
  }

  return schema;
}

function markdownToZod(field: MarkdownField): ZodTypeAny {
  let schema: ZodTypeAny = z.string();
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

// ============================================================================
// Relational Field Schemas
// ============================================================================

function relationshipToZod(field: RelationshipField): ZodTypeAny {
  let schema: ZodTypeAny;
  if (Array.isArray(field.relationTo)) {
    schema = z.object({
      relationTo: z.enum(field.relationTo as [string, ...string[]]),
      value: z.string(),
    });
  } else {
    schema = z.union([
      z.string(),
      z.object({ relationTo: z.string(), value: z.string() }),
    ]);
  }
  if (field.hasMany) schema = z.array(schema);
  if (!field.required) schema = schema.optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function arrayToZod(field: ArrayField): ZodTypeAny {
  const itemSchema = z.object(
    Object.fromEntries(
      field.fields.filter((f) => f.name).map((f) => [f.name!, fieldToZod(f)]),
    ),
  ).passthrough();
  let schema: ZodTypeAny = z.array(itemSchema);
  if (field.minRows) schema = (schema as any).min(field.minRows);
  if (field.maxRows) schema = (schema as any).max(field.maxRows);
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function listToZod(field: any): ZodTypeAny {
  let schema: ZodTypeAny = z.array(z.string());
  if (!field.required) schema = (schema as any).optional().nullable();
  return schema;
}

function groupToZod(field: GroupField): ZodTypeAny {
  const schema = z.object(
    Object.fromEntries(
      field.fields.filter((f) => f.name).map((f) => [f.name!, fieldToZod(f)]),
    ),
  );
  if (!field.required) return (schema as any).optional().nullable();
  return schema;
}

function blocksToZod(field: BlocksField): ZodTypeAny {
  const blocks = field.blocks || [];
  const blockSchemas = blocks.map((block) => {
    return z.object({
      blockType: z.literal(block.slug),
      ...Object.fromEntries(
        block.fields.filter((f) => f.name).map((f) => [f.name!, fieldToZod(f)]),
      ),
    });
  });

  const knownTypes = blocks.map((b) => b.slug);
  let schema: ZodTypeAny;

  if (knownTypes.length > 0) {
    const knownSchema = z
      .object({
        blockType: z.enum(knownTypes as [string, ...string[]]),
      })
      .catchall(z.any());
    const unknownSchema = z
      .object({
        blockType: z.string(),
      })
      .catchall(z.any());
    schema = z.array(z.union([knownSchema, unknownSchema, z.record(z.any())]));
  } else {
    schema = z.array(z.union([z.object({ blockType: z.string() }).catchall(z.any()), z.record(z.any())]));
  }

  if (field.minRows) schema = (schema as any).min(field.minRows);
  if (field.maxRows) schema = (schema as any).max(field.maxRows);
  if (!field.required) schema = (schema as any).optional().nullable();
  if (field.validate) schema = addCustomValidation(schema, field.validate);
  return schema;
}

function rowToZod(field: RowField): ZodTypeAny {
  const schema = z.object(
    Object.fromEntries(
      field.fields.filter((f) => f.name).map((f) => [f.name!, fieldToZod(f)]),
    ),
  );
  return schema;
}

function collapsibleToZod(field: CollapsibleField): ZodTypeAny {
  const schema = z.object(
    Object.fromEntries(
      field.fields.filter((f) => f.name).map((f) => [f.name!, fieldToZod(f)]),
    ),
  );
  return schema;
}

function tabsToZod(field: TabsField): ZodTypeAny {
  const schemas: Record<string, ZodTypeAny> = {};
  for (const tab of field.tabs) {
    for (const f of tab.fields) {
      if (f.name) {
        schemas[f.name] = fieldToZod(f);
      }
    }
  }
  return z.object(schemas).passthrough().optional();
}

// ============================================================================
// Custom Validation Helper
// ============================================================================

function addCustomValidation(
  schema: ZodTypeAny,
  validate: (
    value: any,
    options: ValidateOptions,
  ) => string | true | Promise<string | true>,
): ZodTypeAny {
  return schema.refine(
    async (val: any) => {
      const result = await validate(val, { required: false });
      return result === true;
    },
    {
      message: "Custom validation failed",
    },
  );
}

// ============================================================================
// Collection Schema Generator
// ============================================================================

function flattenFields(fields: Field[]): Field[] {
  const result: Field[] = [];
  for (const field of fields) {
    if (field.type === "tabs" && "tabs" in field) {
      for (const tab of field.tabs) {
        result.push(...flattenFields(tab.fields));
      }
    } else if (field.type === "row" && "fields" in field) {
      result.push(...flattenFields(field.fields));
    } else if (field.type === "collapsible" && "fields" in field) {
      result.push(...flattenFields(field.fields));
    } else {
      result.push(field);
    }
  }
  return result;
}

function buildNestedShape(fields: Field[]): Record<string, ZodTypeAny> {
  const shape: Record<string, ZodTypeAny> = {};
  
  for (const field of fields) {
    if (field.type === "tabs" && "tabs" in field) {
      const tabShape: Record<string, ZodTypeAny> = {};
      for (const tab of field.tabs) {
        const nestedShape = buildNestedShape(tab.fields);
        Object.assign(tabShape, nestedShape);
      }
      if (field.name) {
        shape[field.name] = z.object(tabShape).passthrough().optional();
      } else {
        Object.assign(shape, tabShape);
      }
    } else if (field.type === "row" && "fields" in field) {
      const rowShape = buildNestedShape(field.fields);
      if (field.name) {
        shape[field.name] = z.object(rowShape).passthrough().optional();
      } else {
        Object.assign(shape, rowShape);
      }
    } else if (field.type === "collapsible" && "fields" in field) {
      const collapsibleShape = buildNestedShape(field.fields);
      if (field.name) {
        shape[field.name] = z.object(collapsibleShape).passthrough().optional();
      } else {
        Object.assign(shape, collapsibleShape);
      }
    } else {
      if (!field.name) continue;
      shape[field.name] = fieldToZod(field);
    }
  }
  
  return shape;
}

function buildUpdateNestedShape(fields: Field[]): Record<string, ZodTypeAny> {
  const shape: Record<string, ZodTypeAny> = {};
  
  for (const field of fields) {
    if (field.type === "tabs" && "tabs" in field) {
      const tabShape: Record<string, ZodTypeAny> = {};
      for (const tab of field.tabs) {
        const nestedShape = buildUpdateNestedShape(tab.fields);
        Object.assign(tabShape, nestedShape);
      }
      if (field.name) {
        shape[field.name] = z.object(tabShape).passthrough().optional().nullable();
      } else {
        Object.assign(shape, tabShape);
      }
    } else if (field.type === "row" && "fields" in field) {
      const rowShape = buildUpdateNestedShape(field.fields);
      if (field.name) {
        shape[field.name] = z.object(rowShape).passthrough().optional().nullable();
      } else {
        Object.assign(shape, rowShape);
      }
    } else if (field.type === "collapsible" && "fields" in field) {
      const collapsibleShape = buildUpdateNestedShape(field.fields);
      if (field.name) {
        shape[field.name] = z.object(collapsibleShape).passthrough().optional().nullable();
      } else {
        Object.assign(shape, collapsibleShape);
      }
    } else if (field.type === "group" && "fields" in field) {
      if (field.name) {
        shape[field.name] = z.object(buildUpdateNestedShape(field.fields)).passthrough().optional().nullable();
      } else {
        Object.assign(shape, buildUpdateNestedShape(field.fields));
      }
    } else {
      if (!field.name) continue;
      shape[field.name] = fieldToZod(field).optional().nullable();
    }
  }
  
  return shape;
}

export function collectionToZod(collection: CollectionConfig): ZodTypeAny {
  const shape = buildNestedShape(collection.fields);

  if (collection.timestamps) {
    shape["createdAt"] = z.string().optional();
    shape["updatedAt"] = z.string().optional();
  }

  if (collection.tenantScoped) {
    shape["tenantId"] = z.string().optional();
  }

  shape["id"] = z.string().optional();

  return z.object(shape).passthrough();
}

export function collectionToCreateZod(
  collection: CollectionConfig,
): ZodTypeAny {
  const shape = buildNestedShape(collection.fields);
  return z.object(shape).passthrough();
}

export function collectionToUpdateZod(
  collection: CollectionConfig,
): ZodTypeAny {
  const shape: Record<string, ZodTypeAny> = {};
  
  for (const field of collection.fields) {
    if (!field.name) continue;
    
    if (field.type === "tabs" && "tabs" in field) {
      const tabShape: Record<string, ZodTypeAny> = {};
      for (const tab of field.tabs) {
        for (const tabField of tab.fields) {
          if (tabField.name) {
            tabShape[tabField.name] = fieldToZod(tabField).optional().nullable();
          }
        }
      }
      shape[field.name] = z.object(tabShape).optional().nullable();
    } else if (field.type === "row" && "fields" in field) {
      const rowShape: Record<string, ZodTypeAny> = {};
      for (const rowField of field.fields) {
        if (rowField.name) {
          rowShape[rowField.name] = fieldToZod(rowField).optional().nullable();
        }
      }
      Object.assign(shape, rowShape);
    } else if (field.type === "collapsible" && "fields" in field) {
      shape[field.name] = z.object(buildUpdateNestedShape(field.fields)).optional().nullable();
    } else if (field.type === "group" && "fields" in field) {
      shape[field.name] = z.object(buildUpdateNestedShape(field.fields)).optional().nullable();
    } else {
      shape[field.name] = fieldToZod(field).optional().nullable();
    }
  }

  return z.object(shape).passthrough();
}

export function collectionToWhereZod(collection: CollectionConfig): ZodTypeAny {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of collection.fields) {
    if (field.name) {
      shape[field.name] = z
        .object({
          equals: z.any().optional(),
          not_equals: z.any().optional(),
          in: z.array(z.any()).optional(),
          not_in: z.array(z.any()).optional(),
          greater_than: z.number().optional(),
          greater_than_equal: z.number().optional(),
          less_than: z.number().optional(),
          less_than_equal: z.number().optional(),
          like: z.string().optional(),
          not_like: z.string().optional(),
          contains: z.string().optional(),
          exists: z.boolean().optional(),
        })
        .optional();
    }
  }

  shape["AND"] = z.array(z.lazy(() => z.object(shape))).optional();
  shape["OR"] = z.array(z.lazy(() => z.object(shape))).optional();

  return z.object(shape).optional();
}

// ============================================================================
// Global Schema Generator
// ============================================================================

export function globalToZod(global: GlobalConfig): ZodTypeAny {
  const shape = buildNestedShape(global.fields);

  shape["id"] = z.string().optional();

  return z.object(shape).passthrough();
}

export function globalToUpdateZod(global: GlobalConfig): ZodTypeAny {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of global.fields) {
    if (!field.name) continue;
    if (field.type === "tabs" && "tabs" in field) {
      const tabShape: Record<string, ZodTypeAny> = {};
      for (const tab of field.tabs) {
        for (const tabField of tab.fields) {
          if (tabField.name) {
            tabShape[tabField.name] = fieldToZod(tabField).optional().nullable();
          }
        }
      }
      shape[field.name] = z.object(tabShape).optional().nullable();
    } else if (field.type === "collapsible" && "fields" in field) {
      shape[field.name] = z.object(buildUpdateNestedShape(field.fields)).optional().nullable();
    } else if (field.type === "group" && "fields" in field) {
      shape[field.name] = z.object(buildUpdateNestedShape(field.fields)).optional().nullable();
    } else {
      shape[field.name] = fieldToZod(field).optional().nullable();
    }
  }

  return z.object(shape).passthrough();
}
