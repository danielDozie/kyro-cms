import type { DeliveryResult, DeliveryOptions } from "../types.js";

export async function httpPost(
  url: string,
  headers: Record<string, string>,
  body: string,
  options: DeliveryOptions = {},
): Promise<DeliveryResult> {
  const timeout = options.timeout || 30000;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    let responseBody: string | undefined;

    try {
      const text = await response.text();
      responseBody = text.slice(0, 1000);
    } catch {}

    const result: DeliveryResult = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
      duration,
    };

    if (result.success && options.onSuccess) {
      options.onSuccess(result);
    } else if (!result.success && options.onFailure) {
      options.onFailure(`HTTP ${response.status}: ${response.statusText}`);
    }

    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const errorMessage =
      error.name === "AbortError"
        ? `Request timed out after ${timeout}ms`
        : error.message || "Unknown error";

    if (options.onFailure) {
      options.onFailure(errorMessage);
    }

    return {
      success: false,
      status: 0,
      duration,
      error: errorMessage,
    };
  }
}
