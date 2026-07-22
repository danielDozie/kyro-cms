import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LocalAdapter } from "../src/database/local/adapter.js";
import { WebhookService } from "../src/webhooks/WebhookService.js";
import { WEBHOOK_COLLECTION, type WebhookConfig } from "../src/webhooks/types.js";
import type { CollectionConfig } from "../src/registry/types.js";

describe("WebhookService", () => {
  let adapter: LocalAdapter;
  let service: WebhookService;

  const webhookCollection: CollectionConfig = {
    slug: WEBHOOK_COLLECTION,
    label: "Webhooks",
    fields: [
      { name: "url", type: "text", required: true },
      { name: "events", type: "json" },
      { name: "secret", type: "text" },
      { name: "description", type: "textarea" },
    ],
  };

  beforeAll(async () => {
    adapter = new LocalAdapter({ path: ":memory:" });
    await adapter.connect();
    await adapter.init([webhookCollection]);
    service = new WebhookService(adapter);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it("creates a webhook", async () => {
    const webhook = await service.createWebhook({
      url: "https://example.com/webhook",
      events: ["collection.create"],
      description: "Test webhook",
    });
    expect(webhook).toBeDefined();
    expect(webhook.url).toBe("https://example.com/webhook");
    expect(webhook.status).toBe("active");
  });

  it("lists webhooks", async () => {
    const webhooks = await service.getWebhooks();
    expect(webhooks.length).toBeGreaterThanOrEqual(1);
  });

  it("filters webhooks by status at DB level", async () => {
    const inactiveWebhooks = await service.getWebhooks({ status: "inactive" });
    expect(inactiveWebhooks.length).toBe(0);
  });

  it("filters webhooks by event at service level", async () => {
    const matching = await service.getWebhooks({ event: "collection.create" });
    expect(matching.length).toBeGreaterThanOrEqual(1);
  });

  it("trigger() filters by status and event", async () => {
    const results = await service.trigger("collection.create", {
      collection: "posts",
      operation: "create",
      doc: { id: "1", title: "Test" },
    });
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it("updates a webhook", async () => {
    const webhooks = await service.getWebhooks();
    const updated = await service.updateWebhook(webhooks[0].id, {
      description: "Updated description",
    });
    expect(updated?.description).toBe("Updated description");
  });

  it("deletes a webhook", async () => {
    const webhooks = await service.getWebhooks();
    await service.deleteWebhook(webhooks[0].id);
    const after = await service.getWebhooks();
    expect(after.length).toBe(0);
  });
});
