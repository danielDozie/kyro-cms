import type { User, Request } from '../hooks/types.js';

// ============================================================================
// Access Control Types
// ============================================================================

export interface WhereClause {
  [field: string]: any;
}

export interface AccessArgs {
  req: Request;
  user?: User;
  data?: unknown;
  doc?: unknown;
  id?: string;
  tenantId?: string;
  context?: Record<string, unknown>;
}

export type AccessControl = boolean | ((args: AccessArgs) => Promise<boolean | WhereClause> | boolean | WhereClause);

export interface CollectionAccess {
  create?: AccessControl;
  read?: AccessControl;
  update?: AccessControl;
  delete?: AccessControl;
  admin?: AccessControl;
  unlock?: AccessControl;
  readVersions?: AccessControl;
}

export interface GlobalAccess {
  read?: AccessControl;
  update?: AccessControl;
}

export interface FieldAccess {
  create?: AccessControl;
  read?: AccessControl;
  update?: AccessControl;
}

// ============================================================================
// Access Control Evaluation
// ============================================================================

export async function evaluateAccess(
  access: AccessControl,
  args: AccessArgs
): Promise<boolean | WhereClause> {
  if (typeof access === 'boolean') {
    return access;
  }
  if (typeof access === 'function') {
    return await access(args);
  }
  return true;
}

export function mergeWhereClauses(
  ...whereClauses: (WhereClause | boolean | undefined)[]
): WhereClause {
  const result: WhereClause = {};
  for (const clause of whereClauses) {
    if (clause && typeof clause === 'object') {
      Object.assign(result, clause);
    }
  }
  return result;
}

export function getWhereClause(
  access: AccessControl,
  args: AccessArgs
): Promise<WhereClause | undefined> {
  return evaluateAccess(access, args).then(result => {
    if (result === true) return undefined;
    if (result === false) return { _id: { $eq: null } };
    return result;
  });
}
