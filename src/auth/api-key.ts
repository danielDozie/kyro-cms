import { timingSafeEqual } from "crypto";
import type { BaseAdapter } from "../registry/types.js";
import type { AuthUser, UserRole } from "./types.js";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  key: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  userId?: string;
  user?: Partial<AuthUser>;
  permissions?: string[];
  apiKeyId?: string;
  error?: string;
  tenantId?: string;
  role?: UserRole;
}

export interface ApiKeyContext {
  userId: string;
  user: Partial<AuthUser>;
  permissions: string[];
  apiKeyId: string;
  tenantId?: string;
  role?: UserRole;
}

export const API_KEY_COLLECTION = "api_keys";

function generateKeyPrefix(key: string): string {
  return key.substring(0, 8);
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function validateApiKey(
  rawKey: string,
  db: BaseAdapter,
  userLookup?: (userId: string) => Promise<Partial<AuthUser> | null>,
): Promise<ApiKeyValidationResult> {
  if (!rawKey || typeof rawKey !== "string") {
    return { valid: false, error: "No API key provided" };
  }

  if (!rawKey.startsWith("kyro_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const keyPrefix = generateKeyPrefix(rawKey);

  try {
    const result = await db.find({
      collection: API_KEY_COLLECTION,
      where: { keyPrefix: { equals: keyPrefix } },
      limit: 100,
      page: 1,
    });

    if (!result.docs || result.docs.length === 0) {
      return { valid: false, error: "Invalid API key" };
    }

    let matchedKey: ApiKeyRecord | null = null;
    for (const doc of result.docs) {
      const record = doc as unknown as ApiKeyRecord;
      if (constantTimeCompare(record.key, rawKey)) {
        matchedKey = record;
        break;
      }
    }

    if (!matchedKey) {
      return { valid: false, error: "Invalid API key" };
    }

    if (matchedKey.expiresAt) {
      const expiresAt = new Date(matchedKey.expiresAt);
      if (expiresAt < new Date()) {
        return { valid: false, error: "API key has expired" };
      }
    }

    try {
      await db.update({
        collection: API_KEY_COLLECTION,
        id: matchedKey.id,
        data: { lastUsedAt: new Date().toISOString() },
      });
    } catch {
      // Non-critical: don't fail if lastUsedAt update fails
    }

    const user: Partial<AuthUser> = {
      id: matchedKey.userId,
      role: (matchedKey as any).role || "author",
      tenantId: (matchedKey as any).tenantId,
    };

    if (userLookup) {
      const dbUser = await userLookup(matchedKey.userId);
      if (dbUser) {
        Object.assign(user, dbUser);
      }
    }

    return {
      valid: true,
      userId: matchedKey.userId,
      user,
      permissions: matchedKey.permissions || [],
      apiKeyId: matchedKey.id,
      tenantId: user.tenantId,
      role: user.role,
    };
  } catch (error) {
    console.error("[ApiKey] Validation error:", error);
    return { valid: false, error: "Failed to validate API key" };
  }
}

export function extractApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    if (authHeader.startsWith("ApiKey ")) {
      return authHeader.slice(7).trim();
    }
    if (authHeader.startsWith("Bearer ")) {
      return null;
    }
  }

  const xApiKey = request.headers.get("X-API-Key");
  if (xApiKey) {
    return xApiKey.trim();
  }

  return null;
}

export function createApiKeyContext(
  result: ApiKeyValidationResult,
): ApiKeyContext | null {
  if (!result.valid || !result.userId) {
    return null;
  }
  return {
    userId: result.userId,
    user: result.user || {},
    permissions: result.permissions || [],
    apiKeyId: result.apiKeyId || "",
    tenantId: result.tenantId,
    role: result.role,
  };
}

export function hasApiKeyPermission(
  permissions: string[],
  required: string,
): boolean {
  if (permissions.length === 0) return false;
  if (permissions.includes("*")) return true;
  if (permissions.includes(required)) return true;

  const [resource, action] = required.split(":");
  if (permissions.includes(`${resource}:*`)) return true;

  return false;
}

export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 32; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `kyro_${suffix}`;
}

export function generateApiKeyPrefix(key: string): string {
  return key.substring(0, 8);
}
