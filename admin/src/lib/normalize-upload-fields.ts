/**
 * Recursively walks the given value and converts full media upload objects
 * back to their ID strings before sending to the server.
 *
 * The UploadField stores full media objects { id, url, filename, mimeType }
 * in formData for display purposes, but the server expects just the ID string.
 * Without normalization, the server stores the full object as a JSON string,
 * which causes 404s on the next load when trying to fetch the media.
 */
export function normalizeUploadFields(value: unknown, isRoot = false): unknown {
  if (value === null || value === undefined || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(v => normalizeUploadFields(v, false));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    // Heuristic: detect a full media object by checking for id + url/filename/mimeType
    // and a small number of keys (media objects typically have ~6-8 keys).
    const keys = Object.keys(obj);
    const hasId = "id" in obj && (typeof obj.id === "string" || obj.id === null);
    const hasMediaField = "url" in obj && ("filename" in obj || "mimeType" in obj);
    
    if (!isRoot && hasId && hasMediaField && keys.length <= 25) {
      return obj.id;
    }

    // Heuristic for polymorphic relationships: { relationTo: '...', value: { id: '...' } }
    if (!isRoot && "relationTo" in obj && "value" in obj && typeof obj.value === "object" && obj.value !== null) {
      const valObj = obj.value as Record<string, unknown>;
      if ("id" in valObj && (typeof valObj.id === "string" || typeof valObj.id === "number")) {
        return { relationTo: obj.relationTo, value: valObj.id };
      }
    }

    // Heuristic for regular populated relationships: must have id, createdAt, updatedAt
    if (!isRoot && hasId && "createdAt" in obj && "updatedAt" in obj) {
      return obj.id;
    }

    // Recursively normalize nested objects (tabs, groups, blocks, arrays)
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key] = normalizeUploadFields(obj[key], false);
    }
    return result;
  }

  return value;
}
