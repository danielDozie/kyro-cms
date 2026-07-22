import type { BaseAdapter } from "../../registry/types.js";
import type { User, Request } from "../../hooks/types.js";
import {
  validateApiKey,
  extractApiKeyFromRequest,
  createApiKeyContext,
} from "../../auth/api-key.js";
import { createWebhookService } from "../../webhooks/index.js";

// ============================================================================
// Context Types
// ============================================================================

export interface ApiKeyContext {
  userId: string;
  user: Partial<User>;
  permissions: string[];
  apiKeyId: string;
  tenantId?: string;
  role?: string;
}

export interface KyroContext {
  db: BaseAdapter;
  registry: any;
  user?: User;
  tenantId?: string;
  req: Request;
  apiKey?: ApiKeyContext;
  webhookService?: ReturnType<typeof createWebhookService>;
  settings?: Record<string, any>;
  [key: string]: any;
}

// ============================================================================
// Context Factory
// ============================================================================

export async function createContext(options: {
  db: BaseAdapter;
  registry: any;
  req: Request;
  user?: User;
  tenantId?: string;
  settings?: Record<string, any>;
}): Promise<KyroContext> {
  const webhookService = createWebhookService(options.db);

  const baseContext: KyroContext = {
    db: options.db,
    registry: options.registry,
    req: options.req,
    user: options.user,
    tenantId: options.tenantId,
    webhookService,
    settings: options.settings,
  };

  const apiKeyRaw = extractApiKeyFromRequest(options.req as any);
  if (apiKeyRaw) {
    const result = await validateApiKey(apiKeyRaw, options.db, async (userId) => {
      try {
        const user = await options.db.findByID({ collection: 'users', id: userId });
        return user || null;
      } catch {
        return null;
      }
    });
    if (result.valid) {
      baseContext.user = (result.user as User) || options.user;
      baseContext.tenantId = result.tenantId || options.tenantId;
      baseContext.apiKey = createApiKeyContext(result) as ApiKeyContext;
    }
  }

  return baseContext;
}
