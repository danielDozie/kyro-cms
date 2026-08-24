import type { CollectionConfig, GlobalConfig } from "../registry/types.js";

export const FIELD_DEFINITION_KEYS = new Set([
  "type",
  "admin",
  "label",
  "singularLabel",
  "labelPlural",
  "relationTo",
  "required",
  "hasMany",
  "defaultValue",
  "validate",
  "options",
  "dynamicOptions",
  "filterOptions",
  "hooks",
  "min",
  "max",
  "minLength",
  "maxLength",
  "minRows",
  "maxRows",
  "minDate",
  "maxDate",
  "step",
  "integer",
  "variant",
  "pattern",
  "format",
  "fields",
  "tabs",
  "blocks",
]);

export function isFieldOverrideDefinition(obj: any): boolean {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return false;
  return Object.keys(obj).some((key) => FIELD_DEFINITION_KEYS.has(key));
}

export function flattenFieldOverrides(
  overrides: Record<string, any>,
  prefix = "",
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(overrides)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value) && !isFieldOverrideDefinition(value)) {
      Object.assign(result, flattenFieldOverrides(value, fullPath));
    } else {
      result[fullPath] = value;
    }
  }
  return result;
}

export function updateFieldByPath(
  fields: any[],
  path: string,
  updates: Record<string, any>,
  allowAppend: boolean = true,
): boolean {
  const parts = path.split(".");
  if (parts.length === 0) return false;

  const currentPart = parts[0];
  const remainingPath = parts.slice(1).join(".");

  // Check for explicit tab selector syntax: e.g. tab[Content] or tabs[Hero]
  const tabSelectorMatch = currentPart.match(/^(?:tab|tabs)\[(.+?)\]$/i);
  if (tabSelectorMatch) {
    const targetTabName = tabSelectorMatch[1].toLowerCase();
    for (const field of fields) {
      if (field.type === "tabs" && field.tabs && Array.isArray(field.tabs)) {
        for (const tab of field.tabs) {
          const tabLabel = (tab.label || tab.name || "").toLowerCase();
          if (tabLabel === targetTabName && tab.fields && Array.isArray(tab.fields)) {
            return updateFieldByPath(tab.fields, remainingPath, updates, allowAppend);
          }
        }
      }
    }
    return false;
  }

  for (const field of fields) {
    if (field.name === currentPart) {
      if (remainingPath) {
        if (field.fields && Array.isArray(field.fields)) {
          return updateFieldByPath(field.fields, remainingPath, updates, true);
        }

        if (field.type === "tabs" && field.tabs && Array.isArray(field.tabs)) {
          for (const tab of field.tabs) {
            if (tab.fields && Array.isArray(tab.fields)) {
              if (updateFieldByPath(tab.fields, remainingPath, updates, true)) {
                return true;
              }
            }
          }
          return false;
        }

        if (field.type === "blocks" && field.blocks && Array.isArray(field.blocks)) {
          const blockSlug = remainingPath.split(".")[0];
          const restOfPath = remainingPath.split(".").slice(1).join(".");
          if (!restOfPath) return false;

          for (const block of field.blocks) {
            if (block.slug === blockSlug && block.fields && Array.isArray(block.fields)) {
              return updateFieldByPath(block.fields, restOfPath, updates, true);
            }
          }
          return false;
        }

        if (field.type === "array" && field.fields && Array.isArray(field.fields)) {
          return updateFieldByPath(field.fields, remainingPath, updates, true);
        }
        return false;
      } else {
        // Target field found! Apply updates in-place.
        Object.assign(field, updates);
        return true;
      }
    }

    // Check blocks fields for matching block slug directly or unwrapping "blocks" prefix
    if (field.type === "blocks" && field.blocks && Array.isArray(field.blocks)) {
      if (currentPart === "blocks" && remainingPath) {
        const blockSlug = remainingPath.split(".")[0];
        const restOfPath = remainingPath.split(".").slice(1).join(".");
        for (const block of field.blocks) {
          if (block.slug === blockSlug && block.fields && Array.isArray(block.fields)) {
            if (updateFieldByPath(block.fields, restOfPath, updates, true)) {
              return true;
            }
          }
        }
      }

      for (const block of field.blocks) {
        if (block.slug === currentPart && block.fields && Array.isArray(block.fields)) {
          if (updateFieldByPath(block.fields, remainingPath, updates, true)) {
            return true;
          }
        }
      }
    }

    // Check flat structural wrappers (unnamed tabs, rows, collapsibles) in the same pass.
    const isFlatStructuralField =
      !field.name ||
      field.type === "tabs" ||
      field.type === "row" ||
      field.type === "collapsible";

    if (isFlatStructuralField) {
      if (field.fields && Array.isArray(field.fields)) {
        if (updateFieldByPath(field.fields, path, updates, false)) return true;
      }
      if (field.type === "tabs" && field.tabs && Array.isArray(field.tabs)) {
        for (const tab of field.tabs) {
          if (tab.fields && Array.isArray(tab.fields)) {
            if (updateFieldByPath(tab.fields, path, updates, false)) return true;
          }
        }
      }
    }
  }

  // Target was not found in existing fields; if terminal, appending is allowed,
  // and updates contain a valid field type, append as a new field.
  if (allowAppend && !remainingPath && updates && updates.type) {
    fields.push({
      name: currentPart,
      ...updates,
    });
    return true;
  }

  return false;
}

export function applyBlocksOverrides(fields: any[], rawBlocks: any): void {
  if (!rawBlocks) return;
  const blocksToAdd = Array.isArray(rawBlocks)
    ? rawBlocks
    : Object.entries(rawBlocks).map(([slug, block]: [string, any]) => ({
        slug: block?.slug || slug,
        ...block,
      }));

  function findAndInjectBlocks(fieldList: any[]): boolean {
    for (const field of fieldList) {
      if (field.type === "blocks") {
        if (!Array.isArray(field.blocks)) field.blocks = [];
        for (const newBlock of blocksToAdd) {
          const existingIdx = field.blocks.findIndex((b: any) => b.slug === newBlock.slug);
          if (existingIdx >= 0) {
            field.blocks[existingIdx] = { ...field.blocks[existingIdx], ...newBlock };
          } else {
            field.blocks.push(newBlock);
          }
        }
        return true;
      }
      if (field.fields && Array.isArray(field.fields)) {
        if (findAndInjectBlocks(field.fields)) return true;
      }
      if (field.type === "tabs" && field.tabs && Array.isArray(field.tabs)) {
        for (const tab of field.tabs) {
          if (tab.fields && Array.isArray(tab.fields)) {
            if (findAndInjectBlocks(tab.fields)) return true;
          }
        }
      }
    }
    return false;
  }

  findAndInjectBlocks(fields);
}

export function applyTabsOverrides(fields: any[], rawTabs: any): void {
  if (!rawTabs) return;
  const tabsToAdd = Array.isArray(rawTabs)
    ? rawTabs
    : Object.entries(rawTabs).map(([tabKey, tabConfig]: [string, any]) => ({
        label: tabConfig?.label || tabKey,
        ...(Array.isArray(tabConfig) ? { fields: tabConfig } : tabConfig),
      }));

  const tabsField = fields.find((f: any) => f.type === "tabs");
  if (tabsField && Array.isArray(tabsField.tabs)) {
    for (const newTab of tabsToAdd) {
      const existingTab = tabsField.tabs.find(
        (t: any) => (t.label || t.name || "").toLowerCase() === (newTab.label || newTab.name || "").toLowerCase(),
      );
      if (existingTab) {
        if (newTab.fields && Array.isArray(newTab.fields)) {
          if (!Array.isArray(existingTab.fields)) existingTab.fields = [];
          existingTab.fields.push(...newTab.fields);
        }
        Object.assign(existingTab, newTab);
      } else {
        tabsField.tabs.push(newTab);
      }
    }
  } else {
    const generalFields = [...fields];
    fields.length = 0;
    fields.push({
      type: "tabs",
      tabs: [
        { label: "General", fields: generalFields },
        ...tabsToAdd,
      ],
    });
  }
}

export function applyCollectionOverrides(
  collections: CollectionConfig[],
  overrides?: Record<string, any>,
): void {
  if (!overrides) return;
  for (const col of collections) {
    const override = overrides[col.slug];
    if (override) {
      const {
        fields: rawFieldOverrides,
        blocks: rawBlockOverrides,
        tabs: rawTabOverrides,
        labels,
        label,
        singularLabel,
        labelPlural,
        hidden,
        timestamps,
        versions,
        seo,
        access,
        hooks,
        admin,
        ...restOverrides
      } = override;

      if (label) col.label = label;
      if (singularLabel) col.singularLabel = singularLabel;
      if (labelPlural) col.labelPlural = labelPlural;
      if (labels) {
        if (labels.singular) col.singularLabel = labels.singular;
        if (labels.plural) col.labelPlural = labels.plural;
      }
      if (timestamps !== undefined) col.timestamps = timestamps;
      if (versions !== undefined) col.versions = { ...col.versions, ...versions };
      if (seo !== undefined) col.seo = seo;
      if (access) col.access = { ...col.access, ...access };
      if (hooks) col.hooks = { ...col.hooks, ...hooks };
      if (admin || restOverrides) {
        col.admin = { ...col.admin, ...admin, ...restOverrides };
      }

      if (rawBlockOverrides) {
        applyBlocksOverrides(col.fields, rawBlockOverrides);
      }

      if (rawTabOverrides) {
        applyTabsOverrides(col.fields, rawTabOverrides);
      }

      if (rawFieldOverrides) {
        const flattened = flattenFieldOverrides(rawFieldOverrides);
        for (const [path, updates] of Object.entries(flattened)) {
          updateFieldByPath(col.fields, path, updates as Record<string, any>);
        }
      }
    }
  }
}

export function applyGlobalOverrides(
  globals: GlobalConfig[],
  overrides?: Record<string, any>,
): void {
  if (!overrides) return;
  for (const glob of globals) {
    const override = overrides[glob.slug];
    if (override) {
      const {
        fields: rawFieldOverrides,
        blocks: rawBlockOverrides,
        tabs: rawTabOverrides,
        label,
        hidden,
        versions,
        access,
        hooks,
        admin,
        ...restOverrides
      } = override;

      if (label) glob.label = label;
      if (versions !== undefined) glob.versions = { ...glob.versions, ...versions };
      if (access) glob.access = { ...glob.access, ...access };
      if (hooks) glob.hooks = { ...glob.hooks, ...hooks };
      if (admin || restOverrides) {
        glob.admin = { ...glob.admin, ...admin, ...restOverrides };
      }

      if (rawBlockOverrides) {
        applyBlocksOverrides(glob.fields, rawBlockOverrides);
      }

      if (rawTabOverrides) {
        applyTabsOverrides(glob.fields, rawTabOverrides);
      }

      if (rawFieldOverrides) {
        const flattened = flattenFieldOverrides(rawFieldOverrides);
        for (const [path, updates] of Object.entries(flattened)) {
          updateFieldByPath(glob.fields, path, updates as Record<string, any>);
        }
      }
    }
  }
}
