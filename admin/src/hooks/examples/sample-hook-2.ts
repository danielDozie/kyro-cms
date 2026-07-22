import { onAdminReady } from "../lifecycle.ts";
import type { AdminContext, HookResult } from "../types.ts";

// Second MVP hook showcasing a different approach (logs to console)
export default function registerSampleHook2() {
  onAdminReady((ctx: AdminContext) => {
    // Minimal side-effect demonstration
    void ctx;
    return { success: true } as HookResult;
  });
}
