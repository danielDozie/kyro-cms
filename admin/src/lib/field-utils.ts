import type { Field } from "@kyro-cms/core";

export type FieldConfig = Field;

/**
 * Recursively flattens structural wrapper fields (tabs, row, collapsible)
 * for admin table and list views, omitting hidden and ID fields.
 */
export function flattenAdminFields(fields: FieldConfig[]): FieldConfig[] {
  const result: FieldConfig[] = [];
  for (const field of fields || []) {
    if (field.hidden === true || field.admin?.hidden || field.name === "id") continue;

    if (field.type === "tabs" && field.tabs) {
      for (const tab of field.tabs) {
        if (tab.fields) {
          result.push(...flattenAdminFields(tab.fields));
        }
      }
    } else if (
      (field.type === "row" || field.type === "collapsible") &&
      field.fields
    ) {
      result.push(...flattenAdminFields(field.fields));
    } else {
      if (!field.name) continue;
      result.push(field);
    }
  }
  return result;
}
