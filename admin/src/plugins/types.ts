import type { AdminContext, HookResult } from "../hooks/types.js";

export interface KyroPlugin {
  name: string;
  version: string;
  description?: string;
  apply?: (config: Record<string, unknown>) => void;
  hooks?: {
    onAdminReady?: (
      ctx: AdminContext,
    ) => void | HookResult | Promise<void | HookResult>;
    beforeDeploy?: (
      ctx: AdminContext,
    ) => void | HookResult | Promise<void | HookResult>;
    afterDeploy?: (
      ctx: AdminContext,
      result: HookResult,
    ) => void | Promise<void>;
    beforeRender?: (ctx: AdminContext) => void;
    afterRender?: (ctx: AdminContext) => void;
  };
}
