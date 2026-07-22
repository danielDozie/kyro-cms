export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
}

export interface AdminContext {
  user: AuthUser | null;
  tenant: TenantInfo | null;
  config: Record<string, unknown>;
  api: {
    baseUrl: string;
    token: string | null;
  };
}

export interface HookResult {
  success: boolean;
  error?: string;
}

export type LifecycleHook = (
  ctx: AdminContext,
) => void | HookResult | Promise<void | HookResult>;

export type DeployHook = (
  ctx: AdminContext,
) => HookResult | Promise<HookResult>;

export type DeployResultHook = (
  ctx: AdminContext,
  result: HookResult,
) => void | Promise<void>;
