/**
 * Helper to extract default values from config recursively
 */
export function getDefaults(fields: any[], prefix = ""): Record<string, any> {
  const defaults: Record<string, any> = {};
  for (const field of fields || []) {
    if (field.defaultValue !== undefined) {
      const key = prefix + field.name;
      defaults[key] = field.defaultValue;
      // Also set nested defaults for groups
      if (field.type === "group" && field.fields) {
        for (const subField of field.fields) {
          if (subField.defaultValue !== undefined) {
            defaults[prefix + field.name + "." + subField.name] =
              subField.defaultValue;
          }
        }
      }
    }
    if (field.fields && Array.isArray(field.fields)) {
      Object.assign(defaults, getDefaults(field.fields, field.name + "."));
    }
    if (field.tabs) {
      for (const tab of field.tabs) {
        if (tab.fields) {
          Object.assign(defaults, getDefaults(tab.fields, prefix));
        }
      }
    }
  }
  return defaults;
}

/**
 * Helper to flatten nested object with dot notation keys
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix = "",
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      // Only recurse into plain objects, not Dates, Maps, or other class instances
      (val.constructor === Object || !val.constructor)
    ) {
      Object.assign(result, flattenObject(val, newKey));
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

/**
 * Helper to unflatten dot notation keys back to nested object
 */
export function unflattenObject(flat: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in flat) {
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = flat[key];
  }
  return result;
}
