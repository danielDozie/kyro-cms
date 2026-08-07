import type { Field } from "../../fields/types.js";

export function flattenFields(fields: Field[]): Field[] {
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

export function processFieldValue(row: any, field: Field): any {
  const f = field as any;
  let value = row[f.name];
  
  if (
    f.type === "json" ||
    f.type === "richtext" ||
    f.type === "array" ||
    f.type === "group" ||
    f.type === "blocks" ||
    f.type === "list" ||
    f.type === "relationship-block"
  ) {
    try {
      value = value ? JSON.parse(value) : null;
    } catch {
      value = null;
    }
  }

  if (f.type === "checkbox") {
    value = Boolean(value);
  }

  if (f.type === "date" && value) {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        value = null;
      } else {
        value = d.toISOString();
      }
    } catch {
      value = null;
    }
  }

  if ((f.type === "upload" || f.type === "image") && value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        value = parsed.map((item: any) => {
          if (typeof item === "object" && item !== null) {
            return item;
          }
          return { id: item };
        });
      } else {
        value = typeof parsed === "object" ? parsed : { id: parsed };
      }
    } catch {
      value = typeof value === "string" ? { id: value } : value;
    }
  }

  return value;
}
