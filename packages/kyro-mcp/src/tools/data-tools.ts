import { z } from 'zod';
import type { McpToolDefinition, McpToolResult, McpExecutionContext } from '../types.js';

export const queryCollectionTool: McpToolDefinition<{
  collection: string;
  where?: Record<string, any>;
  page?: number;
  limit?: number;
  sort?: string;
  populate?: boolean;
}> = {
  name: 'kyro_query',
  description: 'Queries documents in a Kyro collection with filtering, sorting, pagination, and relation population.',
  inputSchema: {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        description: 'Slug of the collection to query.',
      },
      where: {
        type: 'object',
        description: 'Filter conditions (e.g. {"published": true, "author": "john"}).',
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (1-indexed).',
        default: 1,
      },
      limit: {
        type: 'number',
        description: 'Number of documents per page.',
        default: 10,
      },
      sort: {
        type: 'string',
        description: 'Sort expression (e.g. "-createdAt" for descending or "title" for ascending).',
      },
      populate: {
        type: 'boolean',
        description: 'Whether to populate relational references.',
        default: false,
      },
    },
    required: ['collection'],
  },
  zodSchema: z.object({
    collection: z.string(),
    where: z.record(z.any()).optional().default({}),
    page: z.number().optional().default(1),
    limit: z.number().optional().default(10),
    sort: z.string().optional(),
    populate: z.boolean().optional().default(false),
  }),
  handler: async (args, context: McpExecutionContext): Promise<McpToolResult> => {
    const { config, getKyroInstance } = context;
    const adapter = config.adapter;
    const kyro = getKyroInstance ? getKyroInstance() : null;

    if (!adapter && !kyro) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'No active database adapter or Kyro instance available to execute query.',
          },
        ],
      };
    }

    try {
      let result;
      if (kyro && typeof kyro.find === 'function') {
        result = await kyro.find({
          collection: args.collection,
          where: args.where,
          page: args.page,
          limit: args.limit,
          sort: args.sort,
          populate: args.populate,
        });
      } else if (adapter && typeof adapter.find === 'function') {
        result = await adapter.find({
          collection: args.collection,
          where: args.where,
          page: args.page,
          limit: args.limit,
          sort: args.sort,
        });
      } else {
        throw new Error('Adapter does not support find() query operations.');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Query error on collection '${args.collection}': ${err.message || String(err)}`,
          },
        ],
      };
    }
  },
};

export const mutateDocumentTool: McpToolDefinition<{
  collection: string;
  action: 'create' | 'update' | 'delete';
  id?: string;
  data?: Record<string, any>;
}> = {
  name: 'kyro_mutate',
  description: 'Performs document mutations (create, update, delete) on a Kyro collection.',
  inputSchema: {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        description: 'Slug of the target collection.',
      },
      action: {
        type: 'string',
        enum: ['create', 'update', 'delete'],
        description: 'Mutation operation to execute.',
      },
      id: {
        type: 'string',
        description: 'Document ID (required for update and delete actions).',
      },
      data: {
        type: 'object',
        description: 'Document payload for create or update actions.',
      },
    },
    required: ['collection', 'action'],
  },
  zodSchema: z.object({
    collection: z.string(),
    action: z.enum(['create', 'update', 'delete']),
    id: z.string().optional(),
    data: z.record(z.any()).optional().default({}),
  }),
  handler: async (args, context: McpExecutionContext): Promise<McpToolResult> => {
    const { config, getKyroInstance } = context;
    const adapter = config.adapter;
    const kyro = getKyroInstance ? getKyroInstance() : null;

    if (!adapter && !kyro) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'No active database adapter or Kyro instance available to execute mutation.',
          },
        ],
      };
    }

    try {
      let result;
      if (args.action === 'create') {
        if (kyro && typeof kyro.create === 'function') {
          result = await kyro.create({
            collection: args.collection,
            data: args.data || {},
          });
        } else {
          result = await adapter.create({
            collection: args.collection,
            data: args.data || {},
          });
        }
      } else if (args.action === 'update') {
        if (!args.id) {
          throw new Error("Mutation action 'update' requires a document 'id'.");
        }
        if (kyro && typeof kyro.update === 'function') {
          result = await kyro.update({
            collection: args.collection,
            id: args.id,
            data: args.data || {},
          });
        } else {
          result = await adapter.update({
            collection: args.collection,
            id: args.id,
            data: args.data || {},
          });
        }
      } else if (args.action === 'delete') {
        if (!args.id) {
          throw new Error("Mutation action 'delete' requires a document 'id'.");
        }
        if (kyro && typeof kyro.delete === 'function') {
          result = await kyro.delete({
            collection: args.collection,
            id: args.id,
          });
        } else {
          result = await adapter.delete({
            collection: args.collection,
            id: args.id,
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, action: args.action, result }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Mutation error on collection '${args.collection}' (${args.action}): ${err.message || String(err)}`,
          },
        ],
      };
    }
  },
};
