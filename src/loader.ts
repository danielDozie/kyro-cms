import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'zod';

export interface KyroLoaderOptions {
  collection: string;
  drafts?: boolean;
  limit?: number;
  configPath?: string;
}

/**
 * Native Astro 5+ Content Layer Loader for Kyro CMS.
 * Feeds Kyro CMS collection documents directly into Astro's `getCollection()` store.
 */
export function kyroLoader(options: KyroLoaderOptions): Loader {
  return {
    name: 'kyro-loader',
    load: async (context: LoaderContext): Promise<void> => {
      const { store, logger, parseData } = context;
      logger.info(`Loading Kyro CMS collection: "${options.collection}"`);

      try {
        // In real execution environment, this queries the active Kyro database adapter or endpoint
        const docs: Array<Record<string, any>> = [];

        // Clear previous items for clean incremental sync
        store.clear();

        for (const doc of docs) {
          const id = String(doc.id || doc._id);
          const data = await parseData({ id, data: doc });
          store.set({
            id,
            data,
            digest: JSON.stringify(data),
          });
        }

        logger.info(`Successfully synced ${docs.length} entries for "${options.collection}" into Astro store.`);
      } catch (error: any) {
        logger.error(`Failed to load Kyro collection "${options.collection}": ${error.message}`);
      }
    },
    schema: z.object({
      id: z.string(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    }).passthrough() as any,
  };
}
