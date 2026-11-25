import { ApiError } from "../utils/errors.js";
import { sanitizeDoc } from "../utils/sanitize.js";

export interface ConcurrencyCheckOptions {
  existingDoc: Record<string, any> | null | undefined;
  baseUpdatedAt?: string | null;
  baseRevision?: string | number | null;
  force?: boolean;
}

export function checkOptimisticConcurrency(options: ConcurrencyCheckOptions): void {
  const { existingDoc, baseUpdatedAt, baseRevision, force } = options;

  if (force === true || !existingDoc) {
    return;
  }

  // 1. Check timestamp-based OCC
  if (baseUpdatedAt && existingDoc.updatedAt) {
    const existingDate = new Date(existingDoc.updatedAt).getTime();
    const baseDate = new Date(baseUpdatedAt).getTime();

    if (!isNaN(existingDate) && !isNaN(baseDate)) {
      if (existingDate !== baseDate) {
        throw new ApiError(
          409,
          `Conflict: Document has been modified by another editor (current: ${existingDoc.updatedAt}, base: ${baseUpdatedAt})`,
          {
            code: "CONCURRENT_MODIFICATION",
            currentUpdatedAt: existingDoc.updatedAt,
            baseUpdatedAt,
            latestDoc: sanitizeDoc(existingDoc),
          }
        );
      }
    } else if (String(existingDoc.updatedAt) !== String(baseUpdatedAt)) {
      throw new ApiError(
        409,
        `Conflict: Document has been modified by another editor`,
        {
          code: "CONCURRENT_MODIFICATION",
          currentUpdatedAt: existingDoc.updatedAt,
          baseUpdatedAt,
          latestDoc: sanitizeDoc(existingDoc),
        }
      );
    }
  }

  // 2. Check revision/version-based OCC if provided
  if (baseRevision !== undefined && baseRevision !== null && existingDoc._version !== undefined) {
    if (String(existingDoc._version) !== String(baseRevision)) {
      throw new ApiError(
        409,
        `Conflict: Document revision mismatch (current: ${existingDoc._version}, base: ${baseRevision})`,
        {
          code: "CONCURRENT_MODIFICATION",
          currentRevision: existingDoc._version,
          baseRevision,
          latestDoc: sanitizeDoc(existingDoc),
        }
      );
    }
  }
}
