import type { DeclarativeCondition } from "./core-types";

export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof path !== "string") return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function evaluateDeclarativeCondition(
  cond: DeclarativeCondition | undefined,
  currentData: Record<string, unknown>,
  formData: Record<string, unknown>
): boolean {
  if (!cond) return true;

  if ("and" in cond && Array.isArray(cond.and)) {
    return cond.and.every((c: DeclarativeCondition) => evaluateDeclarativeCondition(c, currentData, formData));
  }
  if ("or" in cond && Array.isArray(cond.or)) {
    return cond.or.some((c: DeclarativeCondition) => evaluateDeclarativeCondition(c, currentData, formData));
  }

  if ("field" in cond && cond.field) {
    const targetField = cond.field;
    let val = getNestedValue(currentData, targetField);
    if (val === undefined) {
      val = getNestedValue(formData, targetField);
    }

    if ("equals" in cond) {
      return val === cond.equals;
    }
    if ("notEquals" in cond) {
      return val !== cond.notEquals;
    }
    if ("in" in cond && Array.isArray(cond.in)) {
      return cond.in.includes(val as string | number | boolean);
    }
    if ("greaterThan" in cond && cond.greaterThan !== undefined) {
      return typeof val === "number" && val > cond.greaterThan;
    }

    return Boolean(val);
  }

  return true;
}
