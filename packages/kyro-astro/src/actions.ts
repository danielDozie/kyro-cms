import { z } from 'zod';

export interface KyroActionOptions<TInput extends z.ZodTypeAny> {
  client?: any;
  collection: string;
  action: 'create' | 'update' | 'delete' | 'find' | 'upsert';
  uniqueKey?: string;
  schema?: TInput;
  access?: 'public' | 'authenticated' | 'admin';
}

/**
 * Type-safe Astro Actions handler for Kyro CMS collections.
 * Automatically validates incoming form submissions or RPC inputs against collection schemas.
 */
export function kyroAction<TInput extends z.ZodTypeAny = z.ZodObject<any>>(
  options: KyroActionOptions<TInput>
) {
  const inputSchema = options.schema || z.object({}).passthrough();

  return {
    input: inputSchema,
    handler: async (input: z.infer<TInput>, context: any) => {
      try {
        const client = options.client || (globalThis as any).kyroClient;
        if (!client) throw new Error("A 'client' (e.g. kyroClient) must be provided or attached to globalThis.kyroClient");

        const collection = client[options.collection];
        if (!collection) {
          throw new Error(`Collection ${String(options.collection)} not found on client`);
        }

        let result;
        if (options.action === 'upsert') {
          const key = options.uniqueKey || 'email';
          const keyValue = (input as any)[key];
          
          if (!keyValue) {
            throw new Error(`Upsert requires '${key}' field in the input.`);
          }

          const existing = await collection.find({
            where: { [key]: { equals: keyValue } },
            limit: 1
          });

          if (existing.docs && existing.docs.length > 0) {
            result = await collection.update({
              id: existing.docs[0].id,
              data: input
            });
          } else {
            result = await collection.create({ data: input });
          }
        } else if (options.action === 'create' || options.action === 'update') {
          result = await collection[options.action]({ data: input });
        } else {
          result = await collection[options.action](input);
        }

        return {
          success: true,
          collection: options.collection,
          action: options.action,
          data: result,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'CMS Action Execution Failed',
        };
      }
    },
  };
}
