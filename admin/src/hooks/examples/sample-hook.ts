import { onAdminReady } from "../lifecycle.ts";
import type { AdminContext, HookResult } from "../types.ts";

// A tiny MVP hook that demonstrates registration via the public API
// and emits a trivial HookResult when the admin is ready.
export default function registerSampleHook() {
  onAdminReady((ctx: AdminContext) => {
    // Minimal side-effect; in real plugins, you could register editors or analytics
    void ctx;
    return { success: true } as HookResult;
  });
}
