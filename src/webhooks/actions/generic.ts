import type { WebhookConfig, WebhookPayload, DeliveryResult, DeliveryOptions } from "../types.js";
import { signPayload } from "../delivery.js";
import { httpPost } from "./http.js";

export async function deliverGeneric(
  webhook: WebhookConfig,
  payload: WebhookPayload,
  options: DeliveryOptions = {},
): Promise<DeliveryResult> {
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Kyro-CMS-Webhook/1.0",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Delivery": payload.id,
    "X-Webhook-Timestamp": payload.timestamp,
    ...(webhook.headers || {}),
  };

  if (webhook.secret) {
    headers["X-Webhook-Signature"] = signPayload(body, webhook.secret);
  }

  return httpPost(webhook.url, headers, body, options);
}
