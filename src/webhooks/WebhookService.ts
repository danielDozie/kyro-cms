import { randomUUID } from "crypto";
import type { BaseAdapter } from "../registry/types.js";
import {
  type WebhookConfig,
  type CreateWebhookData,
  type UpdateWebhookData,
  type WebhookPayload,
  type WebhookDelivery,
  type WebhookEvent,
  type WebhookTriggerResult,
  WEBHOOK_COLLECTION,
  WEBHOOK_DELIVERY_COLLECTION,
} from "./types.js";
import {
  deliverWithRetry,
  buildDeliveryRecord,
  generateWebhookSecret,
} from "./delivery.js";

function normalizeEvents(events: any[]): WebhookEvent[] {
  const seen = new Set<string>();
  const result: WebhookEvent[] = [];
  for (const e of events) {
    const normalized = (e === "create" || e === "update" || e === "delete")
      ? `collection.${e}`
      : e;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized as WebhookEvent);
    }
  }
  return result;
}

export class WebhookService {
  private db: BaseAdapter;

  constructor(db: BaseAdapter) {
    this.db = db;
  }

  async getWebhooks(filters?: {
    status?: string;
    event?: WebhookEvent;
  }): Promise<WebhookConfig[]> {
    const result = await this.db.find({
      collection: WEBHOOK_COLLECTION,
      where: filters?.status ? { status: { equals: filters.status } } : {},
      limit: 100,
      page: 1,
      draft: true,
    });

    const webhooks = result.docs as unknown as WebhookConfig[];

    if (filters?.event) {
      return webhooks.filter((w) =>
        w.events.includes(filters.event as WebhookEvent),
      );
    }

    return webhooks;
  }

  async getWebhookById(id: string): Promise<WebhookConfig | null> {
    return this.db.findByID({
      collection: WEBHOOK_COLLECTION,
      id,
      draft: true,
    }) as Promise<WebhookConfig | null>;
  }

  async createWebhook(data: CreateWebhookData): Promise<WebhookConfig> {
    const now = new Date().toISOString();
    const secret = data.secret || generateWebhookSecret();

    const webhook = {
      id: randomUUID(),
      name: data.name,
      url: data.url,
      events: normalizeEvents(data.events),
      collections: data.collections || [],
      status: data.status || "active",
      secret,
      headers: data.headers || {},
      action: data.action || "generic",
      config: data.config || {},
      createdAt: now,
      updatedAt: now,
    };

    await this.db.create({
      collection: WEBHOOK_COLLECTION,
      data: webhook,
    });

    return webhook as WebhookConfig;
  }

  async updateWebhook(
    id: string,
    data: UpdateWebhookData,
  ): Promise<WebhookConfig | null> {
    const existing = await this.getWebhookById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...data,
      events: data.events ? normalizeEvents(data.events) : existing.events,
      collections: data.collections !== undefined ? data.collections : existing.collections,
      action: data.action !== undefined ? data.action : existing.action,
      config: data.config !== undefined ? { ...existing.config, ...data.config } : existing.config,
      updatedAt: new Date().toISOString(),
    };

    if (data.secret === "" && "secret" in data) {
      delete updated.secret;
    }

    await this.db.update({
      collection: WEBHOOK_COLLECTION,
      id,
      data: updated,
    });

    return updated as WebhookConfig;
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.db.delete({
      collection: WEBHOOK_COLLECTION,
      id,
    });
  }

  async trigger(
    event: WebhookEvent,
    payloadData: Omit<WebhookPayload, "id" | "event" | "timestamp">,
  ): Promise<WebhookTriggerResult[]> {
    const matchingWebhooks = await this.getWebhooks({
      status: "active",
      event,
    });

    const collection = payloadData.collection;
    const finalWebhooks = matchingWebhooks.filter(w => {
      // If collections array is empty or undefined, it means "all collections"
      if (!w.collections || w.collections.length === 0) return true;
      if (!collection) return true;
      return w.collections.includes(collection);
    });

    if (finalWebhooks.length === 0) {
      return [];
    }

    const payload: WebhookPayload = {
      id: randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      ...payloadData,
    };

    const results: WebhookTriggerResult[] = [];

    for (const webhook of finalWebhooks) {
      const result = await this.triggerWebhook(webhook, payload);
      results.push(result);
    }

    return results;
  }

  async triggerWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload,
  ): Promise<WebhookTriggerResult> {
    const deliveryId = randomUUID();

    try {
      const result = await deliverWithRetry(webhook, payload, deliveryId, {
        maxRetries: 5,
        retryDelay: 1000,
      });

      const deliveryRecord = buildDeliveryRecord(
        deliveryId,
        webhook.id,
        webhook.events[0],
        payload,
        1,
        result,
      );

      try {
        await this.db.create({
          collection: WEBHOOK_DELIVERY_COLLECTION,
          data: deliveryRecord,
        });
      } catch {
        console.warn(
          "[WebhookService] Failed to save delivery record:",
          deliveryId,
        );
      }

      if (!result.success) {
        await this.updateWebhook(webhook.id, {
          lastError: result.error || `HTTP ${result.status}`,
        }).catch(() => {});
      } else {
        await this.updateWebhook(webhook.id, {
          lastTriggered: new Date().toISOString(),
          lastError: null,
        }).catch(() => {});
      }

      return {
        deliveryId,
        webhookId: webhook.id,
        event: webhook.events[0],
        status: result.success ? "success" : "failed",
        responseStatus: result.status,
        duration: result.duration,
        error: result.error,
      };
    } catch (error: any) {
      return {
        deliveryId,
        webhookId: webhook.id,
        event: webhook.events[0],
        status: "failed",
        error: error.message,
      };
    }
  }

  async testWebhook(webhookId: string): Promise<WebhookTriggerResult | null> {
    const webhook = await this.getWebhookById(webhookId);
    if (!webhook) return null;

    const payload: WebhookPayload = {
      id: randomUUID(),
      event: webhook.events[0] || "collection.create",
      timestamp: new Date().toISOString(),
      collection: "test",
      operation: "create",
      data: { message: "This is a test webhook delivery from Kyro CMS" },
      user: {
        id: "system",
        email: "system@kyro.dev",
        role: "super_admin",
      },
    };

    return this.triggerWebhook(webhook, payload);
  }

  async getDeliveryHistory(
    webhookId: string,
    limit: number = 50,
  ): Promise<WebhookDelivery[]> {
    const result = await this.db.find({
      collection: WEBHOOK_DELIVERY_COLLECTION,
      where: { webhookId: { equals: webhookId } },
      sort: "-createdAt",
      limit,
      page: 1,
    });

    return result.docs as unknown as WebhookDelivery[];
  }

  async retryDelivery(
    deliveryId: string,
  ): Promise<WebhookTriggerResult | null> {
    const delivery = (await this.db.findByID({
      collection: WEBHOOK_DELIVERY_COLLECTION,
      id: deliveryId,
    })) as WebhookDelivery | null;

    if (!delivery) return null;

    const webhook = await this.getWebhookById(delivery.webhookId);
    if (!webhook) return null;

    return this.triggerWebhook(webhook, delivery.payload);
  }
}

export function createWebhookService(db: BaseAdapter): WebhookService {
  return new WebhookService(db);
}
