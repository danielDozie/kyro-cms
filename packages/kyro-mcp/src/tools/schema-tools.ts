import { z } from 'zod';
import type { McpToolDefinition, McpToolResult, McpExecutionContext } from '../types.js';

export const getSchemaTool: McpToolDefinition<{ collection?: string; global?: string; includeRelations?: boolean }> = {
  name: 'kyro_get_schema',
  description: 'Introspects Kyro CMS collection and global schemas, returning field definitions, validation rules, folder grouping, and relationship graphs.',
  inputSchema: {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        description: 'Optional specific collection slug to introspect.',
      },
      global: {
        type: 'string',
        description: 'Optional specific global singleton slug to introspect.',
      },
      includeRelations: {
        type: 'boolean',
        description: 'Whether to include relationship connection metadata.',
        default: true,
      },
    },
  },
  zodSchema: z.object({
    collection: z.string().optional(),
    global: z.string().optional(),
    includeRelations: z.boolean().optional().default(true),
  }),
  handler: async (args, context: McpExecutionContext): Promise<McpToolResult> => {
    const { config } = context;
    const collections: any[] = Array.isArray(config.collections)
      ? config.collections
      : Object.values(config.collections || {});
    const globals: any[] = Array.isArray(config.globals)
      ? config.globals
      : Object.values(config.globals || {});

    if (args.collection) {
      const target = collections.find((c: any) => c.slug === args.collection);
      if (!target) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Collection '${args.collection}' not found in configuration. Available collections: ${collections.map((c: any) => c.slug).join(', ')}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                slug: target.slug,
                label: target.label || target.slug,
                folder: target.folder || (target.admin as any)?.folder || 'Default',
                fields: target.fields.map((f: any) => ({
                  name: f.name,
                  type: f.type,
                  required: Boolean(f.required),
                  unique: Boolean(f.unique),
                  relationTo: f.relationTo,
                  defaultValue: f.defaultValue,
                  options: f.options,
                })),
                timestamps: target.timestamps !== false,
                versions: target.versions,
                auth: Boolean(target.auth),
                hierarchy: target.hierarchy,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (args.global) {
      const target = globals.find((g: any) => g.slug === args.global);
      if (!target) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Global '${args.global}' not found in configuration. Available globals: ${globals.map((g: any) => g.slug).join(', ')}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(target, null, 2),
          },
        ],
      };
    }

    const schemaOverview = {
      collectionsCount: collections.length,
      globalsCount: globals.length,
      collections: collections.map((c: any) => ({
        slug: c.slug,
        label: c.label || c.slug,
        folder: c.folder || (c.admin as any)?.folder || 'Unfiled',
        fieldsCount: c.fields?.length || 0,
        fields: c.fields?.map((f: any) => ({
          name: f.name,
          type: f.type,
          required: Boolean(f.required),
          relationTo: f.relationTo,
        })),
        versions: Boolean(c.versions?.drafts),
        auth: Boolean(c.auth),
      })),
      globals: globals.map((g: any) => ({
        slug: g.slug,
        label: g.label || g.slug,
        folder: g.folder || (g.admin as any)?.folder || 'Unfiled',
        fieldsCount: g.fields?.length || 0,
      })),
      projects: config.projects || [],
      organizations: config.organizations || [],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(schemaOverview, null, 2),
        },
      ],
    };
  },
};

export const listCollectionsTool: McpToolDefinition<Record<string, never>> = {
  name: 'kyro_list_collections',
  description: 'Lists all available collections and globals configured in Kyro CMS with their folder grouping.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  handler: async (_args, context: McpExecutionContext): Promise<McpToolResult> => {
    const { config } = context;
    const collections: any[] = Array.isArray(config.collections)
      ? config.collections
      : Object.values(config.collections || {});
    const globals: any[] = Array.isArray(config.globals)
      ? config.globals
      : Object.values(config.globals || {});

    const result = {
      collections: collections.map((c: any) => ({
        slug: c.slug,
        label: c.label || c.slug,
        folder: c.folder || (c.admin as any)?.folder || 'Unfiled',
        fieldNames: c.fields?.map((f: any) => f.name) || [],
      })),
      globals: globals.map((g: any) => ({
        slug: g.slug,
        label: g.label || g.slug,
        folder: g.folder || (g.admin as any)?.folder || 'Unfiled',
      })),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
