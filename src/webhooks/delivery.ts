import { createHmac, randomBytes } from "crypto";
import type {
  WebhookConfig,
  WebhookPayload,
  WebhookDelivery,
  DeliveryResult,
  DeliveryOptions,
} from "./types.js";
import { getActionHandler } from "./actions/index.js";

export type { DeliveryResult, DeliveryOptions } from "./types.js";

export function signPayload(payload: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export async function deliverWebhook(
  webhook: WebhookConfig,
  payload: WebhookPayload,
  options: DeliveryOptions = {},
): Promise<DeliveryResult> {
  const handler = getActionHandler(webhook.action);
  return handler(webhook, payload, options);
}

export async function deliverWithRetry(
  webhook: WebhookConfig,
  payload: WebhookPayload,
  deliveryId: string,
  options: DeliveryOptions = {},
): Promise<DeliveryResult> {
  const maxRetries = options.maxRetries ?? 5;
  const baseDelay = options.retryDelay ?? 1000;
  let lastResult: DeliveryResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      if (options.onRetry) {
        options.onRetry(attempt, `Retrying in ${delay}ms...`);
      }
      await sleep(delay);
    }

    if (options.onRetry && attempt > 0) {
      options.onRetry(attempt, `Attempt ${attempt + 1}/${maxRetries + 1}`);
    }

    lastResult = await deliverWebhook(webhook, payload, {
      ...options,
      onRetry: undefined,
      onSuccess: undefined,
      onFailure: undefined,
    });

    if (lastResult.success) {
      return lastResult;
    }

    if (lastResult.error?.includes("timed out") && attempt < maxRetries) {
      continue;
    }

    if (lastResult.status >= 400 && lastResult.status < 500) {
      return lastResult;
    }
  }

  return (
    lastResult || {
      success: false,
      status: 0,
      duration: 0,
      error: "All delivery attempts failed",
    }
  );
}

export function buildDeliveryRecord(
  deliveryId: string,
  webhookId: string,
  event: string,
  payload: WebhookPayload,
  attempt: number,
  result: DeliveryResult,
): WebhookDelivery {
  return {
    id: deliveryId,
    webhookId,
    event: event as any,
    payload,
    attempt,
    status: result.success ? "success" : "failed",
    responseStatus: result.status || undefined,
    responseBody: result.body,
    duration: result.duration,
    error: result.error,
    createdAt: new Date().toISOString(),
    deliveredAt: result.success ? new Date().toISOString() : undefined,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createTestPayload(): WebhookPayload {
  return {
    id: `test_${Date.now()}`,
    event: "collection.create",
    timestamp: new Date().toISOString(),
    collection: "test",
    operation: "create",
    data: { message: "This is a test webhook delivery" },
    user: { id: "system", email: "system@kyro.dev", role: "super_admin" },
  };
}
