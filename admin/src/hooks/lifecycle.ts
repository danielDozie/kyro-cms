import type { AdminContext, HookResult, LifecycleHook } from "./types.ts";

type HookRegistry = {
  ready: LifecycleHook[];
  beforeDeploy: LifecycleHook[];
  afterDeploy: ((ctx: AdminContext, result: HookResult) => void)[];
};

const registry: HookRegistry = {
  ready: [],
  beforeDeploy: [],
  afterDeploy: [],
};

export function onAdminReady(hook: LifecycleHook) {
  registry.ready.push(hook);
  return () => {
    registry.ready = registry.ready.filter((h) => h !== hook);
  };
}

export function beforeDeploy(hook: LifecycleHook) {
  registry.beforeDeploy.push(hook);
  return () => {
    registry.beforeDeploy = registry.beforeDeploy.filter((h) => h !== hook);
  };
}

export function afterDeploy(
  hook: (ctx: AdminContext, result: HookResult) => void,
) {
  registry.afterDeploy.push(hook);
  return () => {
    registry.afterDeploy = registry.afterDeploy.filter((h) => h !== hook);
  };
}

export async function emitAdminReady(ctx: AdminContext): Promise<HookResult[]> {
  const results: HookResult[] = [];
  for (const hook of registry.ready) {
    try {
      const result = await hook(ctx);
      if (result && typeof result === "object" && "success" in result) {
        results.push(result);
      }
    } catch (error) {
      results.push({ success: false, error: String(error) });
    }
  }
  return results;
}

export async function emitBeforeDeploy(
  ctx: AdminContext,
): Promise<HookResult[]> {
  const results: HookResult[] = [];
  for (const hook of registry.beforeDeploy) {
    try {
      const result = await hook(ctx);
      if (result && typeof result === "object" && "success" in result) {
        results.push(result);
      }
    } catch (error) {
      results.push({ success: false, error: String(error) });
    }
  }
  return results;
}

export async function emitAfterDeploy(
  ctx: AdminContext,
  result: HookResult,
): Promise<void> {
  for (const hook of registry.afterDeploy) {
    try {
      await hook(ctx, result);
    } catch {
      // Silently ignore afterDeploy hook errors
    }
  }
}
