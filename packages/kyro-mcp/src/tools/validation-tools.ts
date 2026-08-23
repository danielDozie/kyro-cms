import { z } from 'zod';
import type { McpToolDefinition, McpToolResult, McpExecutionContext } from '../types.js';

export const validateConfigTool: McpToolDefinition<{ deep?: boolean }> = {
  name: 'kyro_validate_config',
  description: 'Performs static verification and linting on the Kyro configuration, detecting broken relationship targets, duplicate slugs, and missing required attributes.',
  inputSchema: {
    type: 'object',
    properties: {
      deep: {
        type: 'boolean',
        description: 'Whether to perform deep relationship and schema graph analysis.',
        default: true,
      },
    },
  },
  zodSchema: z.object({
    deep: z.boolean().optional().default(true),
  }),
  handler: async (args, context: McpExecutionContext): Promise<McpToolResult> => {
    const { config } = context;
    const collections: any[] = Array.isArray(config.collections)
      ? config.collections
      : Object.values(config.collections || {});
    const globals: any[] = Array.isArray(config.globals)
      ? config.globals
      : Object.values(config.globals || {});

    const issues: Array<{ severity: 'error' | 'warning' | 'info'; path: string; message: string }> = [];

    // 1. Check adapter
    if (!config.adapter) {
      issues.push({
        severity: 'error',
        path: 'adapter',
        message: 'No database adapter is defined in kyro.config.ts (e.g. createLocalAdapter({ path: "./data/kyro.db" })).',
      });
    }

    // 2. Check collection slug uniqueness
    const seenSlugs = new Set<string>();
    for (const col of collections) {
      if (!col.slug) {
        issues.push({
          severity: 'error',
          path: 'collections',
          message: 'Collection is missing a required "slug" property.',
        });
        continue;
      }

      if (seenSlugs.has(col.slug)) {
        issues.push({
          severity: 'error',
          path: `collections.${col.slug}`,
          message: `Duplicate collection slug "${col.slug}" detected.`,
        });
      }
      seenSlugs.add(col.slug);

      // Check fields
      if (!Array.isArray(col.fields) || col.fields.length === 0) {
        issues.push({
          severity: 'warning',
          path: `collections.${col.slug}.fields`,
          message: `Collection "${col.slug}" has no fields defined.`,
        });
      } else {
        const fieldNames = new Set<string>();
        for (const field of col.fields as any[]) {
          if (!field.name) {
            issues.push({
              severity: 'error',
              path: `collections.${col.slug}.fields`,
              message: `Field in collection "${col.slug}" is missing a "name" property.`,
            });
            continue;
          }

          if (fieldNames.has(field.name)) {
            issues.push({
              severity: 'error',
              path: `collections.${col.slug}.fields.${field.name}`,
              message: `Duplicate field name "${field.name}" in collection "${col.slug}".`,
            });
          }
          fieldNames.add(field.name);

          // Check relationship targets if deep validation enabled
          if (args.deep && (field.type === 'relationship' || field.relationTo)) {
            const targetSlug = field.relationTo;
            if (!targetSlug) {
              issues.push({
                severity: 'error',
                path: `collections.${col.slug}.fields.${field.name}`,
                message: `Relationship field "${field.name}" is missing "relationTo" collection target.`,
              });
            } else if (!collections.some((c: any) => c.slug === targetSlug)) {
              issues.push({
                severity: 'error',
                path: `collections.${col.slug}.fields.${field.name}`,
                message: `Relationship field "${field.name}" points to non-existent collection "${targetSlug}".`,
              });
            }
          }
        }
      }
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    const result = {
      valid: !hasErrors,
      totalCollections: collections.length,
      totalGlobals: globals.length,
      issueCount: issues.length,
      issues,
    };

    return {
      isError: hasErrors,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
