import type { Field } from "../fields/types.js";

export function findFieldByName(fields: Field[], name: string): Field | null {
  for (const field of fields) {
    if (field.name === name) {
      return field;
    }
    
    // Check nested fields
    if (field.type === "group" || field.type === "array") {
      const found = findFieldByName(field.fields || [], name);
      if (found) return found;
    }
    
    if (field.type === "blocks") {
      for (const block of field.blocks || []) {
        const found = findFieldByName(block.fields || [], name);
        if (found) return found;
      }
    }
    
    if (field.type === "tabs") {
      for (const tab of field.tabs || []) {
        const found = findFieldByName(tab.fields || [], name);
        if (found) return found;
      }
    }
    
    if (field.type === "collapsible" || field.type === "row") {
      const found = findFieldByName(field.fields || [], name);
      if (found) return found;
    }
  }
  return null;
}

export function formatZodErrors(errors: any[]): string {
  return errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
}

export function normalizeEmptyStrings(data: any, fields: any[]): void {
  if (!data || typeof data !== 'object') return;
  for (const field of fields) {
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      const target = field.name ? data[field.name] : data;
      if (target && typeof target === 'object') {
        for (const tab of field.tabs) {
          if (Array.isArray(tab.fields)) normalizeEmptyStrings(target, tab.fields);
        }
      }
      continue;
    }
    if (!field.name || !(field.name in data)) continue;
    const val = data[field.name];
    if (val === "") {
      const isTextual = field.type === 'text' || field.type === 'textarea' || field.type === 'code' || field.type === 'markdown';
      if (!isTextual) data[field.name] = null;
    }
    if ((field.type === 'group' || field.type === 'collapsible') && field.name && Array.isArray(field.fields) && data[field.name] && typeof data[field.name] === 'object') {
      normalizeEmptyStrings(data[field.name], field.fields);
    } else if (field.type === 'array' && field.name && Array.isArray(field.fields) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (item && typeof item === 'object') normalizeEmptyStrings(item, field.fields);
      }
    } else if (field.type === 'blocks' && field.name && Array.isArray(field.blocks) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (!item || typeof item !== 'object') continue;
        const blockTypeStr = item.type || item.blockType;
        if (!blockTypeStr) continue;
        const blockDef = field.blocks.find((b: any) => b.slug === blockTypeStr);
        if (!blockDef || !Array.isArray(blockDef.fields)) continue;
        const target = item.data && typeof item.data === 'object' ? item.data : item;
        normalizeEmptyStrings(target, blockDef.fields);
      }
    }
  }
}

export function convertRichtextFields(fields: any[], data: any): void {
  if (!data || typeof data !== 'object') return;
  for (const field of fields) {
    if (field.type === 'tabs' && Array.isArray(field.tabs)) {
      const target = field.name ? data[field.name] : data;
      if (target && typeof target === 'object') {
        for (const tab of field.tabs) {
          if (Array.isArray(tab.fields)) convertRichtextFields(tab.fields, target);
        }
      }
    }
    if (field.type === 'richtext' && field.name) {
      const val = data[field.name];
      if (typeof val === 'string') {
        data[field.name] = [{ type: "paragraph", children: [{ text: val }] }];
      } else if (val && typeof val === 'object' && !Array.isArray(val) && val.type === 'doc' && Array.isArray(val.content)) {
        data[field.name] = val.content;
      }
    }
    if ((field.type === 'group' || field.type === 'collapsible') && field.name && Array.isArray(field.fields) && data[field.name] && typeof data[field.name] === 'object') {
      convertRichtextFields(field.fields, data[field.name]);
    } else if (field.type === 'array' && field.name && Array.isArray(field.fields) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (item && typeof item === 'object') convertRichtextFields(field.fields, item);
      }
    } else if (field.type === 'blocks' && field.name && Array.isArray(field.blocks) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (!item || typeof item !== 'object') continue;
        const blockTypeStr = item.type || item.blockType;
        if (!blockTypeStr) continue;
        const blockDef = field.blocks.find((b: any) => b.slug === blockTypeStr);
        if (!blockDef || !Array.isArray(blockDef.fields)) continue;
        const target = item.data && typeof item.data === 'object' ? item.data : item;
        convertRichtextFields(blockDef.fields, target);
      }
    }
  }
}

export function clearUniqueFields(fields: any[], data: any): void {
  if (!data || typeof data !== 'object') return;
  for (const field of fields) {
    if (!field.name || !(field.name in data)) continue;
    
    if (field.unique) {
      if (field.type === 'text' || field.type === 'email') {
        data[field.name] = `${data[field.name] || field.name}-copy-${Date.now().toString(36)}`;
      } else {
        delete data[field.name];
      }
    }

    if (field.type === 'tabs' && field.name && Array.isArray(field.tabs) && data[field.name] && typeof data[field.name] === 'object') {
      for (const tab of field.tabs) {
        if (Array.isArray(tab.fields)) clearUniqueFields(tab.fields, data[field.name]);
      }
    } else if ((field.type === 'group' || field.type === 'collapsible') && field.name && Array.isArray(field.fields) && data[field.name] && typeof data[field.name] === 'object') {
      clearUniqueFields(field.fields, data[field.name]);
    } else if (field.type === 'array' && field.name && Array.isArray(field.fields) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (item && typeof item === 'object') {
          delete item.id;
          clearUniqueFields(field.fields, item);
        }
      }
    } else if (field.type === 'blocks' && field.name && Array.isArray(field.blocks) && Array.isArray(data[field.name])) {
      for (const item of data[field.name]) {
        if (!item || typeof item !== 'object') continue;
        delete item.id;
        const blockTypeStr = item.type || item.blockType;
        if (!blockTypeStr) continue;
        const blockDef = field.blocks.find((b: any) => b.slug === blockTypeStr);
        if (!blockDef || !Array.isArray(blockDef.fields)) continue;
        const target = item.data && typeof item.data === 'object' ? item.data : item;
        clearUniqueFields(blockDef.fields, target);
      }
    }
  }
}

