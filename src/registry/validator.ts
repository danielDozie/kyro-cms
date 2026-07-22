import type { CollectionConfig, GlobalConfig } from './types.js';
import type { Field, Block } from '../fields/types.js';

// ============================================================================
// Helper: Recursively find field by name (searches nested fields too)
// ============================================================================

function findFieldByName(fields: Field[], name: string): boolean {
  for (const field of fields) {
    if (field.name === name) {
      return true;
    }
    // Search nested fields in tabs, row, collapsible, and group
    if ('tabs' in field && field.tabs) {
      for (const tab of field.tabs) {
        if (findFieldByName(tab.fields, name)) {
          return true;
        }
      }
    }
    if ('fields' in field && field.fields) {
      if (findFieldByName(field.fields, name)) {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// Validation Errors
// ============================================================================

export class ConfigValidationError extends Error {
  public errors: string[];
  
  constructor(errors: string[]) {
    super(`Configuration validation failed:\n${errors.join('\n')}`);
    this.name = 'ConfigValidationError';
    this.errors = errors;
  }
}

// ============================================================================
// Collection Validation
// ============================================================================

export function validateCollection(config: CollectionConfig): string[] {
  const errors: string[] = [];
  
  // Slug validation
  if (!config.slug) {
    errors.push(`Collection is missing a "slug" property`);
  } else if (!/^[a-z][a-z0-9_-]*$/.test(config.slug)) {
    errors.push(`Collection slug "${config.slug}" must be lowercase alphanumeric with dashes`);
  }
  
  // Fields validation
  if (!config.fields || config.fields.length === 0) {
    errors.push(`Collection "${config.slug}" has no fields defined`);
  } else {
    const fieldErrors = validateFields(config.fields, config.slug);
    errors.push(...fieldErrors);
  }
  
  // Access validation
  if (config.access) {
    for (const [action, handler] of Object.entries(config.access)) {
      if (typeof handler !== 'boolean' && typeof handler !== 'function') {
        errors.push(`Collection "${config.slug}" has invalid access.${action} (must be boolean or function)`);
      }
    }
  }
  
  // Admin validation
  if (config.admin?.useAsTitle) {
    const fieldExists = findFieldByName(config.fields, config.admin!.useAsTitle);
    if (!fieldExists) {
      errors.push(`Collection "${config.slug}" admin.useAsTitle references unknown field "${config.admin.useAsTitle}"`);
    }
  }
  
  if (config.admin?.defaultColumns) {
    for (const col of config.admin.defaultColumns) {
      const fieldExists = findFieldByName(config.fields, col);
      if (!fieldExists) {
        errors.push(`Collection "${config.slug}" admin.defaultColumns references unknown field "${col}"`);
      }
    }
  }
  
  // Upload validation
  if (config.upload) {
    if (config.upload.fileSize && config.upload.fileSize <= 0) {
      errors.push(`Collection "${config.slug}" upload.fileSize must be positive`);
    }
  }
  
  // Versions validation
  if (config.versions) {
    if (config.versions.maxPerDoc && config.versions.maxPerDoc <= 0) {
      errors.push(`Collection "${config.slug}" versions.maxPerDoc must be positive`);
    }
  }
  
  // Auth validation
  if (config.auth) {
    const hasEmailField = config.fields.some(f => f.name === 'email');
    const hasPasswordField = config.fields.some(f => f.name === 'password');
    if (!hasEmailField) {
      errors.push(`Collection "${config.slug}" with auth enabled requires an "email" field`);
    }
    if (!hasPasswordField) {
      errors.push(`Collection "${config.slug}" with auth enabled requires a "password" field`);
    }
  }
  
  return errors;
}

// ============================================================================
// Global Validation
// ============================================================================

export function validateGlobal(config: GlobalConfig): string[] {
  const errors: string[] = [];
  
  // Slug validation
  if (!config.slug) {
    errors.push(`Global is missing a "slug" property`);
  } else if (!/^[a-z][a-z0-9_-]*$/.test(config.slug)) {
    errors.push(`Global slug "${config.slug}" must be lowercase alphanumeric with dashes`);
  }
  
  // Fields validation
  if (!config.fields || config.fields.length === 0) {
    errors.push(`Global "${config.slug}" has no fields defined`);
  } else {
    const fieldErrors = validateFields(config.fields, `global:${config.slug}`);
    errors.push(...fieldErrors);
  }
  
  return errors;
}

// ============================================================================
// Field Validation
// ============================================================================

export function validateFields(fields: Field[], context: string): string[] {
  const errors: string[] = [];
  const fieldNames = new Set<string>();
  
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    
    // Skip layout fields without names
    if (field.type === 'row' || field.type === 'collapsible' || field.type === 'tabs') {
      // Validate nested fields
      if ('fields' in field && field.fields) {
        const nestedErrors = validateFields(field.fields, context);
        errors.push(...nestedErrors);
      } else if ('tabs' in field) {
        for (const tab of (field as any).tabs) {
          const tabErrors = validateFields(tab.fields, context);
          errors.push(...tabErrors);
        }
      }
      continue;
    }
    
    // Name validation
    const fieldName = field.name as string | undefined;
    if (!fieldName) {
      errors.push(`${context}: Field at index ${i} is missing a "name" property`);
      continue;
    }
    
    if (fieldNames.has(fieldName)) {
      errors.push(`${context}: Duplicate field name "${fieldName}"`);
    }
    fieldNames.add(fieldName);
    
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(fieldName)) {
      errors.push(`${context}: Field name "${fieldName}" must be alphanumeric with underscores`);
    }
    
    // Type validation
    if (!field.type) {
      errors.push(`${context}: Field "${fieldName}" is missing a "type" property`);
      continue;
    }
    
    // Field-specific validation
    switch (field.type) {
      case 'relationship':
        if (!field.relationTo) {
          errors.push(`${context}: Relationship field "${fieldName}" is missing "relationTo"`);
        }
        break;
      
      case 'array':
        if (!field.fields || field.fields.length === 0) {
          errors.push(`${context}: Array field "${fieldName}" has no fields defined`);
        } else {
          const arrayErrors = validateFields(field.fields, `${context}.${fieldName}`);
          errors.push(...arrayErrors);
        }
        break;
      
      case 'group':
        if (!field.fields || field.fields.length === 0) {
          errors.push(`${context}: Group field "${fieldName}" has no fields defined`);
        } else {
          const groupErrors = validateFields(field.fields, `${context}.${fieldName}`);
          errors.push(...groupErrors);
        }
        break;
      
      case 'blocks':
        if (!field.blocks || field.blocks.length === 0) {
          errors.push(`${context}: Blocks field "${fieldName}" has no blocks defined`);
        } else {
          const blockErrors = validateBlocks(field.blocks, `${context}.${fieldName}`);
          errors.push(...blockErrors);
        }
        break;
      
      case 'select':
      case 'radio':
        if (typeof field.options === 'function') {
          // Dynamic options are evaluated at runtime with data context, so we bypass schema validation here.
          break;
        }
        if ((!field.options || field.options.length === 0) && !(field as any).dynamicOptions) {
          errors.push(`${context}: ${field.type} field "${fieldName}" has no options defined`);
        } else if (Array.isArray(field.options)) {
          const values = field.options.map((o: any) => o.value);
          const uniqueValues = new Set(values);
          if (values.length !== uniqueValues.size) {
            errors.push(`${context}: ${field.type} field "${fieldName}" has duplicate option values`);
          }
        }
        break;
      
      case 'upload':
        if (!field.relationTo) {
          errors.push(`${context}: Upload field "${fieldName}" is missing "relationTo"`);
        }
        break;
    }
    
    // Min/Max validation
    if ('min' in field && 'max' in field && (field as any).min > (field as any).max) {
      errors.push(`${context}: Field "${fieldName}" has min greater than max`);
    }
    
    if ('minLength' in field && 'maxLength' in field && (field as any).minLength > (field as any).maxLength) {
      errors.push(`${context}: Field "${fieldName}" has minLength greater than maxLength`);
    }
    
    if ('minRows' in field && 'maxRows' in field && (field as any).minRows > (field as any).maxRows) {
      errors.push(`${context}: Field "${fieldName}" has minRows greater than maxRows`);
    }
  }
  
  return errors;
}

// ============================================================================
// Block Validation
// ============================================================================

export function validateBlocks(blocks: Block[], context: string): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  
  for (const block of blocks) {
    if (!block.slug) {
      errors.push(`${context}: Block is missing a "slug" property`);
      continue;
    }
    
    if (slugs.has(block.slug)) {
      errors.push(`${context}: Duplicate block slug "${block.slug}"`);
    }
    slugs.add(block.slug);
    
    if (!block.label) {
      errors.push(`${context}: Block "${block.slug}" is missing a "label" property`);
    }
    
    if (!block.fields || block.fields.length === 0) {
      errors.push(`${context}: Block "${block.slug}" has no fields defined`);
    } else {
      const blockErrors = validateFields(block.fields, `${context}.${block.slug}`);
      errors.push(...blockErrors);
    }
  }
  
  return errors;
}

// ============================================================================
// Full Configuration Validation
// ============================================================================

export function validateConfig(collections: CollectionConfig[], globals: GlobalConfig[] = []): void {
  const errors: string[] = [];
  const slugs = new Set<string>();
  
  // Check for duplicate collection slugs
  for (const collection of collections) {
    if (slugs.has(collection.slug)) {
      errors.push(`Duplicate collection slug "${collection.slug}"`);
    }
    slugs.add(collection.slug);
  }
  
  // Check for duplicate global slugs
  for (const global of globals) {
    if (slugs.has(global.slug)) {
      errors.push(`Duplicate global slug "${global.slug}"`);
    }
    slugs.add(global.slug);
  }
  
  // Validate all collections
  for (const collection of collections) {
    const collectionErrors = validateCollection(collection);
    errors.push(...collectionErrors);
  }
  
  // Validate all globals
  for (const global of globals) {
    const globalErrors = validateGlobal(global);
    errors.push(...globalErrors);
  }
  
  // Validate relationships reference existing collections
  for (const collection of collections) {
    const relationshipErrors = validateRelationships(collection.fields, collections);
    errors.push(...relationshipErrors);
  }
  
  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
}

function validateRelationships(fields: Field[], collections: CollectionConfig[]): string[] {
  const errors: string[] = [];
  const collectionSlugs = new Set(collections.map(c => c.slug));
  
  for (const field of fields) {
    if (field.type === 'relationship') {
      const targets = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo];
      for (const target of targets) {
        if (target !== '*' && !collectionSlugs.has(target)) {
          console.warn(`[Kyro Config Warning]: Relationship field "${field.name}" references unknown collection "${target}". Select options will not be available until this collection is registered.`);
        }
      }
    }
    
    if (field.type === 'upload') {
      const targets = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo];
      for (const target of targets) {
        if (!collectionSlugs.has(target)) {
          errors.push(`Upload field "${field.name}" references unknown collection "${target}"`);
        }
      }
    }
    
    if ('fields' in field && field.fields) {
      const nestedErrors = validateRelationships(field.fields, collections);
      errors.push(...nestedErrors);
    }
    
    if ('tabs' in field) {
      for (const tab of (field as any).tabs) {
        const tabErrors = validateRelationships(tab.fields, collections);
        errors.push(...tabErrors);
      }
    }
    
    if ('blocks' in field) {
      for (const block of (field as any).blocks) {
        const blockErrors = validateRelationships(block.fields, collections);
        errors.push(...blockErrors);
      }
    }
  }
  
  return errors;
}
