import type { CollectionConfig } from '../../registry/types.js';
import type { Field } from '../../fields/types.js';

export function fieldToDrizzleType(field: Field, dialect: 'postgres' | 'sqlite' = 'postgres'): string {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'password':
    case 'color':
    case 'icon':
      return dialect === 'sqlite' ? 'text' : 'varchar';
    case 'textarea':
    case 'code':
    case 'markdown':
    case 'secret':
      return 'text';
    case 'number':
      return field.integer ? 'integer' : 'decimal';
    case 'checkbox':
      return 'boolean';
    case 'date':
      return 'timestamp';
    case 'select':
    case 'radio':
      return dialect === 'sqlite' ? 'text' : 'varchar';
    case 'richtext':
    case 'json':
    case 'array':
    case 'group':
    case 'blocks':
    case 'row':
    case 'collapsible':
    case 'tabs':
      return 'jsonb';
    case 'relationship':
      return dialect === 'sqlite' ? 'text' : 'varchar';
    case 'upload':
      return 'jsonb';
    default:
      return 'jsonb';
  }
}

export function collectionToDrizzleSchema(
  collection: CollectionConfig,
  dialect: 'postgres' | 'sqlite' = 'postgres'
): string {
  const tableName = collection.slug.replace(/-/g, '_');
  const lines: string[] = [];

  lines.push(`export const ${tableName} = pgTable('${tableName}', {`);

  // Add id field
  lines.push(`  id: uuid('id').primaryKey().defaultRandom(),`);

  // Process fields
  for (const field of collection.fields) {
    if (field.name === 'id' || field.type === 'password') continue;

    const dbType = fieldToDrizzleType(field, dialect);
    const isRequired = field.required;

    let fieldDef = `  ${field.name}: pg.${dbType}('${field.name}')`;

    // Add constraints
    if (field.unique) fieldDef += '.unique()';
    if (!isRequired) fieldDef += '.nullable()';

    // Add default value
    if (field.defaultValue !== undefined) {
      if (typeof field.defaultValue === 'string') {
        fieldDef += `.default('${field.defaultValue}')`;
      } else if (typeof field.defaultValue === 'boolean') {
        fieldDef += `.default(${field.defaultValue})`;
      } else {
        fieldDef += `.default(sql\`${JSON.stringify(field.defaultValue)}\`)`;
      }
    }

    fieldDef += ',';
    lines.push(fieldDef);
  }

  // Add timestamps
  if (collection.timestamps) {
    lines.push(`  createdAt: pg.timestamp('created_at').defaultNow(),`);
    lines.push(`  updatedAt: pg.timestamp('updated_at').defaultNow(),`);
  }

  // Add status field
  lines.push(`  status: ${dialect === 'sqlite' ? 'sqlite' : 'pg'}.varchar('status').default('draft'),`);
  lines.push(`  hasDraft: ${dialect === 'sqlite' ? 'sqlite' : 'pg'}.boolean('hasDraft').default(false),`);

  lines.push('});');

  return lines.join('\n');
}

export function processBlocksUploadFields(value: unknown, blockDefs: any[]): unknown {
  if (!Array.isArray(value)) return value;
  return value.map(block => {
    if (!block || typeof block !== "object") return block;
    const data = block.data ? { ...block.data } : undefined;
    if (!data) return block;
    const def = blockDefs.find((d: any) => d.slug === block.type || d.slug === block.slug);
    if (!def || !Array.isArray(def.fields)) return block;
    for (const f of def.fields) {
      if (f.name && (f.type === "upload" || f.type === "image") && data[f.name]) {
        const val = data[f.name];
        if (Array.isArray(val)) {
          data[f.name] = val.map((item: any) =>
            typeof item === "string" ? { id: item } : item
          );
        } else if (typeof val === "string") {
          data[f.name] = { id: val };
        }
      }
      if (f.type === "blocks" && f.name && data[f.name]) {
        const nestedDefs = (f as any).blocks || [];
        data[f.name] = processBlocksUploadFields(data[f.name], nestedDefs);
      }
    }
    return { ...block, data };
  });
}
