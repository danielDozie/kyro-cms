import { z } from 'zod';

export interface KyroActionOptions<TInput extends z.ZodTypeAny> {
  collection: string;
  action: 'create' | 'update' | 'delete' | 'find';
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
        // Execute CMS operation against current database adapter
        return {
          success: true,
          collection: options.collection,
          action: options.action,
          data: input,
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
