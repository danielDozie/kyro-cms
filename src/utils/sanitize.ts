/**
 * Utility function to recursively strip numeric string keys (e.g. '0', '1', '2', ...)
 * from document objects and query result structures.
 */
export function sanitizeDoc<T = any>(input: T): T {
  if (input === null || input === undefined) return input;

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeDoc(item)) as unknown as T;
  }

  if (typeof input === "object" && !(input instanceof Date) && !(input instanceof RegExp)) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      if (/^\d+$/.test(key)) continue;
      cleaned[key] = sanitizeDoc((input as any)[key]);
    }
    return cleaned as T;
  }

  return input;
}
