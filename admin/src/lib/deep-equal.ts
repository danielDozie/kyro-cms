/**
 * Performs a deep equality check between two values.
 * Ignores the order of keys in objects.
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (
    typeof obj1 !== "object" ||
    obj1 === null ||
    typeof obj2 !== "object" ||
    obj2 === null
  ) {
    return false;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) {
        return false;
      }
    }
    return true;
  }

  if (Array.isArray(obj1) || Array.isArray(obj2)) {
    return false;
  }

  const keys1 = Object.keys(obj1).filter(k => k !== 'id' && k !== '_key' && k !== '_id');
  const keys2 = Object.keys(obj2).filter(k => k !== 'id' && k !== '_key' && k !== '_id');

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }
    if (!deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a value is "empty-like" (undefined, null, empty string, false, empty array, or empty object).
 * This helps prevent false dirty states when form fields initialize with default empty values.
 */
export function isEmpty(val: any): boolean {
  if (val === undefined || val === null || val === "" || val === false) {
    return true;
  }
  if (Array.isArray(val)) {
    return val.length === 0;
  }
  if (typeof val === "object") {
    if (Object.keys(val).length === 0) return true;
    if (val.type === "doc" && Array.isArray(val.content)) {
      return val.content.length === 0 || (val.content.length === 1 && val.content[0].type === "paragraph" && !val.content[0].content);
    }
  }
  return false;
}

