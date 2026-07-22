/**
 * Recursively resolves a field value from formData regardless of
 * whether it lives at root level, inside a tab container, group,
 * or collapsible.
 *
 * Mirrors the `useAsTitle` pattern — finds where a field actually
 * lives in the config, then reads from the correct location in formData.
 *
 * @param fields  - The top-level field definitions from the collection/global config
 * @param formData - The current form data object
 * @param fieldName - The name of the field to resolve
 * @returns The field value, or undefined if not found
 */
export function resolveFieldValue(
  fields: Record<string, unknown>[],
  formData: Record<string, unknown>,
  fieldName: string,
): unknown {
  // 1. Check root level first
  if (fieldName in formData) {
    return formData[fieldName];
  }

  // 2. Search inside containers (tabs, groups, collapsibles)
  return searchContainers(fields, formData, fieldName);
}

function searchContainers(
  fields: Record<string, unknown>[],
  formData: Record<string, unknown>,
  fieldName: string,
): unknown {
  for (const field of fields) {
    if (!field.name) continue;

    // Tabs container
    if (field.type === "tabs" && "tabs" in field) {
      const containerData = formData[field.name as string];
      if (containerData && typeof containerData === "object") {
        // Check if the field is directly inside the tab data
        if (fieldName in (containerData as Record<string, unknown>)) {
          return (containerData as Record<string, unknown>)[fieldName];
        }
        // Recursively search nested tabs/groups inside this tab container
        const nested = searchContainers(
          (field as any).tabs?.flatMap((t: any) => t.fields || []) || [],
          containerData as Record<string, unknown>,
          fieldName,
        );
        if (nested !== undefined) return nested;
      }
    }

    // Group or collapsible container
    if ((field.type === "group" || field.type === "collapsible") && "fields" in field) {
      const containerData = formData[field.name as string];
      if (containerData && typeof containerData === "object") {
        // Check if the field is directly inside the group data
        if (fieldName in (containerData as Record<string, unknown>)) {
          return (containerData as Record<string, unknown>)[fieldName];
        }
        // Recursively search nested fields inside this group
        const nested = searchContainers(
          (field as any).fields || [],
          containerData as Record<string, unknown>,
          fieldName,
        );
        if (nested !== undefined) return nested;
      }
    }
  }

  return undefined;
}

/**
 * Finds the container path for a field (useful for debugging).
 * Returns an array of container names leading to the field, or [] if at root.
 */
export function resolveFieldPath(
  fields: Record<string, unknown>[],
  fieldName: string,
  prefix: string = "",
): string[] {
  for (const field of fields) {
    if (!field.name) continue;

    if (field.type === "tabs" && "tabs" in field) {
      const tabs = (field as any).tabs || [];
      for (const tab of tabs) {
        if (tab.fields) {
          const found = tab.fields.find((f: any) => f.name === fieldName);
          if (found) return [field.name as string];
          const nested = resolveFieldPath(tab.fields, fieldName, field.name as string);
          if (nested.length > 0) return [field.name as string, ...nested];
        }
      }
    }

    if ((field.type === "group" || field.type === "collapsible") && "fields" in field) {
      const groupFields = (field as any).fields || [];
      const found = groupFields.find((f: any) => f.name === fieldName);
      if (found) return [field.name as string];
      const nested = resolveFieldPath(groupFields, fieldName, field.name as string);
      if (nested.length > 0) return [field.name as string, ...nested];
    }
  }

  return [];
}
