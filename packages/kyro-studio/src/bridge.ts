import type { StudioBlock } from "./types";

export type StudioBridgeMessageType =
  "KYRO_STUDIO_READY" | "KYRO_STUDIO_SELECT" | "KYRO_STUDIO_DRAFT_UPDATE" | "KYRO_STUDIO_SCROLL_INTO_VIEW";

export interface StudioBridgeMessage<T = any> {
  type: StudioBridgeMessageType;
  documentId?: string;
  revision?: string;
  nodePath?: string;
  fieldName?: string;
  blocks?: StudioBlock[];
  origin?: string;
  payload?: T;
}

export function isStudioBridgeMessage(msg: unknown): msg is StudioBridgeMessage {
  if (!msg || typeof msg !== "object") return false;
  const m = msg as Record<string, any>;
  return (
    typeof m.type === "string" &&
    ["KYRO_STUDIO_READY", "KYRO_STUDIO_SELECT", "KYRO_STUDIO_DRAFT_UPDATE", "KYRO_STUDIO_SCROLL_INTO_VIEW"].includes(
      m.type,
    )
  );
}

export function createPreviewBridge(options: {
  allowedOrigins?: string[];
  onMessage?: (message: StudioBridgeMessage) => void;
}) {
  const allowed = options.allowedOrigins ? new Set(options.allowedOrigins) : null;

  function handleMessage(event: MessageEvent) {
    if (allowed && !allowed.has(event.origin)) {
      return;
    }
    if (isStudioBridgeMessage(event.data)) {
      if (options.onMessage) {
        options.onMessage(event.data);
      }
    }
  }

  window.addEventListener("message", handleMessage);

  return {
    send(target: Window, message: StudioBridgeMessage, targetOrigin = "*") {
      target.postMessage(message, targetOrigin);
    },
    destroy() {
      window.removeEventListener("message", handleMessage);
    },
  };
}
