export const WEBHOOK_EVENTS = {
  COLLECTION_CREATE: "collection.create",
  COLLECTION_UPDATE: "collection.update",
  COLLECTION_DELETE: "collection.delete",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_DELETE: "media.delete",
  AUTH_LOGIN: "auth.login",
  AUTH_REGISTER: "auth.register",
  AUTH_LOGOUT: "auth.logout",
  ORDER_CREATED: "order.created",
  ORDER_PAID: "order.paid",
  ORDER_SHIPPED: "order.shipped",
  ORDER_DELIVERED: "order.delivered",
} as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = Object.values(WEBHOOK_EVENTS);

// ============================================================================
// Webhook Actions
// ============================================================================

export type WebhookActionType = "generic" | "github-push";

export const WEBHOOK_ACTIONS: Record<WebhookActionType, { label: string; description: string }> = {
  generic: { label: "Custom URL", description: "POST to any endpoint with Kyro payload" },
  "github-push": { label: "GitHub Push", description: "Push an empty commit to simulate a push event" },
};

export interface WebhookActionConfig {
  githubOwner?: string;
  githubRepo?: string;
  githubBranch?: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  collections?: string[];
  status: "active" | "inactive" | "error";
  secret?: string;
  headers?: Record<string, string>;
  action?: WebhookActionType;
  config?: WebhookActionConfig;
  lastTriggered?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookData {
  name: string;
  url: string;
  events: (WebhookEvent | "create" | "update" | "delete")[];
  collections?: string[];
  status?: "active" | "inactive";
  secret?: string;
  headers?: Record<string, string>;
  action?: WebhookActionType;
  config?: WebhookActionConfig;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: (WebhookEvent | "create" | "update" | "delete")[];
  collections?: string[];
  status?: "active" | "inactive" | "error";
  secret?: string;
  headers?: Record<string, string>;
  action?: WebhookActionType;
  config?: WebhookActionConfig;
  lastTriggered?: string | null;
  lastError?: string | null;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  collection?: string;
  operation?: "create" | "update" | "delete";
  data?: unknown;
  previousData?: unknown;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  attempt: number;
  status: "pending" | "success" | "failed" | "retrying";
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  duration?: number;
  createdAt: string;
  deliveredAt?: string;
  nextRetryAt?: string;
}

export interface WebhookTriggerResult {
  deliveryId: string;
  webhookId: string;
  event: WebhookEvent;
  status: "queued" | "success" | "failed";
  responseStatus?: number;
  duration?: number;
  error?: string;
}

export const WEBHOOK_COLLECTION = "_webhooks";
export const WEBHOOK_DELIVERY_COLLECTION = "_webhook_deliveries";

// ============================================================================
// Delivery types (used by action handlers)
// ============================================================================

export interface DeliveryResult {
  success: boolean;
  status: number;
  statusText?: string;
  body?: string;
  duration: number;
  error?: string;
}

export interface DeliveryOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: string) => void;
  onSuccess?: (result: DeliveryResult) => void;
  onFailure?: (error: string) => void;
}
