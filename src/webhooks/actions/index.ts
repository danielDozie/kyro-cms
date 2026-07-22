import type { WebhookActionType, WebhookConfig, WebhookPayload, DeliveryResult, DeliveryOptions } from "../types.js";
import { deliverGeneric } from "./generic.js";
import { deliverGithubPush } from "./github-push.js";

export type ActionHandler = (
  webhook: WebhookConfig,
  payload: WebhookPayload,
  options?: DeliveryOptions,
) => Promise<DeliveryResult>;

const handlers: Record<WebhookActionType, ActionHandler> = {
  generic: deliverGeneric,
  "github-push": deliverGithubPush,
};

export function getActionHandler(action?: WebhookActionType): ActionHandler {
  return handlers[action || "generic"] || handlers.generic;
}

export { deliverGeneric, deliverGithubPush };
