import { B as BaseAdapter } from './types-CaXXmV9h.js';

declare const WEBHOOK_EVENTS: {
    readonly COLLECTION_CREATE: "collection.create";
    readonly COLLECTION_UPDATE: "collection.update";
    readonly COLLECTION_DELETE: "collection.delete";
    readonly MEDIA_UPLOAD: "media.upload";
    readonly MEDIA_DELETE: "media.delete";
    readonly AUTH_LOGIN: "auth.login";
    readonly AUTH_REGISTER: "auth.register";
    readonly AUTH_LOGOUT: "auth.logout";
    readonly ORDER_CREATED: "order.created";
    readonly ORDER_PAID: "order.paid";
    readonly ORDER_SHIPPED: "order.shipped";
    readonly ORDER_DELIVERED: "order.delivered";
};
type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];
declare const ALL_WEBHOOK_EVENTS: WebhookEvent[];
type WebhookActionType = "generic" | "github-push";
interface WebhookActionConfig {
    githubOwner?: string;
    githubRepo?: string;
    githubBranch?: string;
}
interface WebhookConfig {
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
interface CreateWebhookData {
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
interface UpdateWebhookData {
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
interface WebhookPayload {
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
interface WebhookDelivery {
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
interface WebhookTriggerResult {
    deliveryId: string;
    webhookId: string;
    event: WebhookEvent;
    status: "queued" | "success" | "failed";
    responseStatus?: number;
    duration?: number;
    error?: string;
}
declare const WEBHOOK_COLLECTION = "_webhooks";
declare const WEBHOOK_DELIVERY_COLLECTION = "_webhook_deliveries";
interface DeliveryResult {
    success: boolean;
    status: number;
    statusText?: string;
    body?: string;
    duration: number;
    error?: string;
}
interface DeliveryOptions {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number, error: string) => void;
    onSuccess?: (result: DeliveryResult) => void;
    onFailure?: (error: string) => void;
}

declare class WebhookService {
    private db;
    constructor(db: BaseAdapter);
    getWebhooks(filters?: {
        status?: string;
        event?: WebhookEvent;
    }): Promise<WebhookConfig[]>;
    getWebhookById(id: string): Promise<WebhookConfig | null>;
    createWebhook(data: CreateWebhookData): Promise<WebhookConfig>;
    updateWebhook(id: string, data: UpdateWebhookData): Promise<WebhookConfig | null>;
    deleteWebhook(id: string): Promise<void>;
    trigger(event: WebhookEvent, payloadData: Omit<WebhookPayload, "id" | "event" | "timestamp">): Promise<WebhookTriggerResult[]>;
    triggerWebhook(webhook: WebhookConfig, payload: WebhookPayload): Promise<WebhookTriggerResult>;
    testWebhook(webhookId: string): Promise<WebhookTriggerResult | null>;
    getDeliveryHistory(webhookId: string, limit?: number): Promise<WebhookDelivery[]>;
    retryDelivery(deliveryId: string): Promise<WebhookTriggerResult | null>;
}
declare function createWebhookService(db: BaseAdapter): WebhookService;

export { ALL_WEBHOOK_EVENTS as A, type CreateWebhookData as C, type DeliveryResult as D, type UpdateWebhookData as U, type WebhookPayload as W, type WebhookDelivery as a, type WebhookConfig as b, type DeliveryOptions as c, WebhookService as d, WEBHOOK_COLLECTION as e, WEBHOOK_DELIVERY_COLLECTION as f, WEBHOOK_EVENTS as g, type WebhookEvent as h, type WebhookTriggerResult as i, createWebhookService as j };
