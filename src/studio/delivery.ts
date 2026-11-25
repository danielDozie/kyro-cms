import type { PublishDeliveryRecord, DeliveryStatus } from "./types.js";
import { deliverWebhook } from "../webhooks/delivery.js";
import type { WebhookConfig, WebhookPayload } from "../webhooks/types.js";
import { randomUUID } from "crypto";

export interface DeliveryConfig {
  mode?: "ssr" | "ssg";
  webhookUrl?: string;
  webhookSecret?: string;
  cachePurgeUrl?: string;
  cachePurgeTags?: string[];
}

const deliveryStore = new Map<string, PublishDeliveryRecord>();
const idempotentKeyMap = new Map<string, string>(); // idempotencyKey -> deliveryId

export class PublishDeliveryCoordinator {
  private config: DeliveryConfig;

  constructor(config: DeliveryConfig = {}) {
    this.config = config;
  }

  async triggerPublishDelivery(options: {
    collection: string;
    documentId: string;
    revision: string;
    slug?: string;
    docData?: Record<string, any>;
  }): Promise<PublishDeliveryRecord> {
    const { collection, documentId, revision, slug, docData } = options;
    const idempotencyKey = `${collection}:${documentId}:${revision}`;

    // Idempotency check: if this revision is already registered
    const existingId = idempotentKeyMap.get(idempotencyKey);
    if (existingId && deliveryStore.has(existingId)) {
      const record = deliveryStore.get(existingId)!;
      if (record.status === "live" || record.status === "delivering") {
        return record;
      }
    }

    const deliveryId = randomUUID();
    idempotentKeyMap.set(idempotencyKey, deliveryId);

    const mode = this.config.mode || "ssr";
    const record: PublishDeliveryRecord = {
      id: deliveryId,
      collection,
      documentId,
      revision,
      status: "delivering",
      mode,
      targetUrl: this.config.webhookUrl || this.config.cachePurgeUrl,
      attempts: 1,
      lastAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    deliveryStore.set(deliveryId, record);

    // Dispatch delivery asynchronously
    this.executeDelivery(record, { slug, docData }).catch((err) => {
      console.warn(`[PublishDelivery] Delivery ${deliveryId} failed:`, err);
    });

    return record;
  }

  private async executeDelivery(
    record: PublishDeliveryRecord,
    payloadData: { slug?: string; docData?: any }
  ): Promise<void> {
    try {
      if (record.mode === "ssg" && this.config.webhookUrl) {
        // Trigger deploy webhook
        const webhookConfig: WebhookConfig = {
          id: `delivery-${record.id}`,
          name: "Publish SSG Rebuild",
          url: this.config.webhookUrl,
          events: ["collection.published" as any],
          status: "active",
          action: "generic",
          secret: this.config.webhookSecret,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const payload: WebhookPayload = {
          id: `payload-${record.id}-${Date.now()}`,
          event: "collection.published" as any,
          collection: record.collection,
          operation: "publish" as any,
          data: {
            id: record.documentId,
            revision: record.revision,
            slug: payloadData.slug,
          },
          timestamp: new Date().toISOString(),
        };

        const result = await deliverWebhook(webhookConfig, payload);
        if (result.success) {
          record.status = "live";
          record.completedAt = new Date().toISOString();
        } else {
          record.status = "delivery_failed";
          record.error = result.error || (result.status ? `HTTP ${result.status}` : "Delivery failed");
        }
      } else if (this.config.cachePurgeUrl) {
        // SSR Cache Invalidation
        const res = await fetch(this.config.cachePurgeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.config.webhookSecret ? { "X-Kyro-Secret": this.config.webhookSecret } : {}),
          },
          body: JSON.stringify({
            event: "purge",
            collection: record.collection,
            documentId: record.documentId,
            slug: payloadData.slug,
            tags: this.config.cachePurgeTags || [record.collection, `${record.collection}:${record.documentId}`],
          }),
        });

        if (res.ok) {
          record.status = "live";
          record.completedAt = new Date().toISOString();
        } else {
          record.status = "delivery_failed";
          record.error = `Purge failed with HTTP ${res.status}`;
        }
      } else {
        // Direct local delivery (e.g. dynamic SSR headless engine)
        record.status = "live";
        record.completedAt = new Date().toISOString();
      }
    } catch (e) {
      record.status = "delivery_failed";
      record.error = e instanceof Error ? e.message : String(e);
    }
  }

  async retryDelivery(deliveryId: string): Promise<PublishDeliveryRecord> {
    const record = deliveryStore.get(deliveryId);
    if (!record) {
      throw new Error(`Delivery record "${deliveryId}" not found`);
    }

    record.attempts++;
    record.status = "delivering";
    record.lastAttemptAt = new Date().toISOString();
    record.error = undefined;

    await this.executeDelivery(record, {});
    return record;
  }

  getDeliveryStatus(deliveryId: string): PublishDeliveryRecord | undefined {
    return deliveryStore.get(deliveryId);
  }
}

let defaultCoordinator: PublishDeliveryCoordinator | null = null;

export function getDeliveryCoordinator(config?: DeliveryConfig): PublishDeliveryCoordinator {
  if (!defaultCoordinator || config) {
    defaultCoordinator = new PublishDeliveryCoordinator(config);
  }
  return defaultCoordinator;
}
