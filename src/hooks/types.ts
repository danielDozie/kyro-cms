// ============================================================================
// Hook Types
// ============================================================================

export interface Request {
  body?: any;
  headers: Record<string, string>;
  method?: string;
  url?: string;
  cookies?: Record<string, string>;
  query?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  [key: string]: any;
}

export interface HookArgs<T = any> {
  collection?: string;
  global?: string;
  data?: T;
  originalDoc?: T;
  doc?: T;
  req: Request;
  user?: User;
  operation: 'create' | 'read' | 'update' | 'delete';
  tenantId?: string;
  field?: string;
  siblingData?: Record<string, any>;
  value?: any;
  previousValue?: any;
  context?: Record<string, any>;
}

export type Hook<T = any> = (args: HookArgs<T>) => Promise<T | void> | T | void;

export interface CollectionHooks {
  beforeValidate?: Hook[];
  beforeChange?: Hook[];
  afterChange?: Hook[];
  beforeRead?: Hook[];
  afterRead?: Hook[];
  beforeDelete?: Hook[];
  afterDelete?: Hook[];
  beforeLogin?: Hook[];
  afterLogin?: Hook[];
  afterLogout?: Hook[];
  afterRefresh?: Hook[];
  afterForgotPassword?: Hook[];
}

export interface FieldHooks {
  beforeValidate?: Hook[];
  beforeChange?: Hook[];
  afterChange?: Hook[];
  afterRead?: Hook[];
}

export interface GlobalHooks {
  beforeValidate?: Hook[];
  beforeChange?: Hook[];
  afterChange?: Hook[];
  beforeRead?: Hook[];
  afterRead?: Hook[];
}

// ============================================================================
// Hook Runner
// ============================================================================

export async function runHooks(
  hooks: Hook[],
  args: HookArgs
): Promise<any> {
  let result = args.data;
  
  for (const hook of hooks) {
    const hookResult = await hook({
      ...args,
      data: result,
    });
    if (hookResult !== undefined) {
      result = hookResult;
    }
  }
  
  return result;
}

export async function runFieldHooks(
  hooks: Hook[],
  args: HookArgs
): Promise<any> {
  return runHooks(hooks, args);
}
