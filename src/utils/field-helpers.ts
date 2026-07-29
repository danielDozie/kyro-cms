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
