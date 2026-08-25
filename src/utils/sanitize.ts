/**
 * Utility function to recursively strip numeric string keys (e.g. '0', '1', '2', ...)
 * from document objects and query result structures, and properly convert BSON ObjectId instances to strings.
 */
export function sanitizeDoc<T = any>(input: T): T {
  if (input === null || input === undefined) return input;

  // Handle BSON / MongoDB ObjectId instances
  if (
    typeof input === "object" &&
    ((input as any)._bsontype === "ObjectID" ||
      (input as any)._bsontype === "ObjectId" ||
      (input as any).constructor?.name === "ObjectId" ||
      (input as any).constructor?.name === "ObjectID" ||
      typeof (input as any).toHexString === "function")
  ) {
    return String(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeDoc(item)) as unknown as T;
  }

  if (typeof input === "object" && !(input instanceof Date) && !(input instanceof RegExp)) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      if (/^\d+$/.test(key)) continue;
      cleaned[key] = sanitizeDoc((input as any)[key]);
    }
    // Ensure id is always a string if _id is present
    if (cleaned._id && (!cleaned.id || typeof cleaned.id === "object")) {
      cleaned.id = String(cleaned._id);
    }
    return cleaned as T;
  }

  return input;
}
