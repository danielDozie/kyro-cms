import type { AuthUser, JWTPayload } from "../../auth/types.js";
import type { TenantContext } from "../../auth/rls/tenant.js";
import type { BaseAdapter } from "../../registry/types.js";
import {
  validateApiKey,
  extractApiKeyFromRequest,
  createApiKeyContext,
  hasApiKeyPermission,
} from "../../auth/api-key.js";
import { 
  getCurrentUser, 
  getSessionIdFromRequest, 
  validateSession,
  SESSION_CONFIG 
} from "./auth-session.js";

export interface AuthMiddlewareConfig {
  secret: string;
  issuer?: string;
  audience?: string;
  db?: BaseAdapter;
  userLookup?: (userId: string) => Promise<Partial<AuthUser> | null>;
  checkSession?: (userId: string, token: string, req?: Request, payload?: JWTPayload) => Promise<boolean>;
}

export interface AuthenticatedContext {
  user?: AuthUser;
  token?: string;
  tenantContext?: TenantContext;
  apiKeyContext?: ReturnType<typeof createApiKeyContext>;
}

export interface AuthMiddlewareResult {
  user?: Partial<AuthUser>;
  token?: string;
  tenantContext?: TenantContext;
  apiKeyContext?: ReturnType<typeof createApiKeyContext>;
  error?: string;
  status: number;
  authType?: "session" | "apikey";
}

export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const {
    secret,
    db,
    userLookup,
  } = config;

  return async function authMiddleware(
    req: Request,
  ): Promise<AuthMiddlewareResult> {
    // Check API Key first (keep for headless CMS)
    const apiKeyRaw = extractApiKeyFromRequest(req);

    if (apiKeyRaw && db) {
      const result = await validateApiKey(apiKeyRaw, db, userLookup);
      if (result.valid && result.user) {
        return {
          user: result.user,
          tenantContext: createTenantContextFromUser(result.user),
          apiKeyContext: createApiKeyContext(result),
          status: 200,
          authType: "apikey",
        };
      }
      if (result.error) {
        return {
          status: 401,
          error: result.error,
        };
      }
    }

    // Check session (Astro sessions with Keyv)
    const sessionId = getSessionIdFromRequest(req);
    if (sessionId) {
      try {
        // Validate session
        const validation = await validateSession(sessionId);
        
        if (!validation.valid) {
          return {
            status: 401,
            error: validation.reason || "Session invalid",
          };
        }
        
        const session = await getCurrentUser(req);
        if (session) {
          // Get user from database using session userId
          const user = userLookup 
            ? await userLookup(session.userId)
            : null;
          
          if (user) {
            return {
              user: user as AuthUser,
              tenantContext: createTenantContextFromUser(user),
              status: 200,
              authType: "session",
            };
          }
        }
      } catch (e) {
        console.error("Session validation error:", e);
      }
    }

    // No valid authentication found
    return {
      status: 401,
      error: "Authentication required",
    };
  };
}

export { hasApiKeyPermission };

export function createTenantContextFromUser(
  user: Partial<AuthUser>,
): TenantContext {
  return {
    tenantId: user.tenantId || "default",
    userId: user.id || "anonymous",
    role: user.role || "guest",
    roles: [user.role || "guest"],
    permissions: [],
    isSuperAdmin: user.role === "super_admin",
  };
}
