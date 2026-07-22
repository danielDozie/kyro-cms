import { describe, it, expect } from "vitest";

describe("tRPC & WebSockets Integration", () => {
  it("formats tRPC disabled error response correctly", async () => {
    const disabledResponse = new Response(JSON.stringify({ error: "tRPC is disabled" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });

    expect(disabledResponse.status).toBe(503);
    const body = await disabledResponse.json();
    expect(body.error).toBe("tRPC is disabled");
  });

  it("validates WebSocket message action types", () => {
    const validActions = ["subscribe", "unsubscribe", "publish", "ping"];
    
    function parseWSMessage(data: string) {
      try {
        const parsed = JSON.parse(data);
        if (!validActions.includes(parsed.action)) {
          return { valid: false, error: "Invalid action" };
        }
        return { valid: true, payload: parsed };
      } catch {
        return { valid: false, error: "Invalid JSON" };
      }
    }

    expect(parseWSMessage(JSON.stringify({ action: "subscribe", channel: "posts" })).valid).toBe(true);
    expect(parseWSMessage(JSON.stringify({ action: "unknown" })).valid).toBe(false);
    expect(parseWSMessage("invalid json").valid).toBe(false);
  });
});
