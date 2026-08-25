import { KyroPlugin, type PluginAPI } from '@kyro-cms/core';

export interface AiVectorPluginOptions {
  collections: string[];
  embedFields: string[];
  targetField?: string;
  embedFunction?: (text: string) => Promise<number[]>;
  provider?: any;
}

/**
 * Calculates cosine similarity between two numeric vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

export class AiVectorPlugin extends KyroPlugin {
  private options: AiVectorPluginOptions;

  constructor(options: AiVectorPluginOptions) {
    super('ai-vector-embeddings');
    this.displayName = 'AI Vector Embeddings & Semantic Search';
    this.description = 'Generates semantic vector embeddings on document changes for vector similarity and RAG search in Astro.';
    this.options = {
      targetField: '_embedding',
      ...options,
    };
  }

  async init(kyro: any): Promise<void> {
    const { collections, embedFields, targetField, embedFunction } = this.options;
    if (!kyro || typeof kyro.on !== 'function') return;

    kyro.on('beforeChange', async ({ data, collection }: any) => {
      const colSlug = typeof collection === 'string' ? collection : collection?.slug;
      if (!collections.includes(colSlug) || !data) return data;

      // Extract text from specified embedFields
      const textPieces: string[] = [];
      for (const field of embedFields) {
        if (data[field] && typeof data[field] === 'string') {
          textPieces.push(data[field]);
        } else if (data[field] && typeof data[field] === 'object') {
          textPieces.push(JSON.stringify(data[field]));
        }
      }

      const combinedText = textPieces.join('\n\n').trim();
      if (!combinedText) return data;

      if (embedFunction) {
        try {
          const vector = await embedFunction(combinedText);
          data[targetField || '_embedding'] = vector;
        } catch (err: any) {
          kyro.log?.('error', `Failed to generate vector embedding for ${colSlug}:`, err);
        }
      }

      return data;
    });
  }

  /**
   * Helper to perform in-memory semantic similarity search over an array of documents
   */
  public searchSimilar(
    queryVector: number[],
    documents: Array<{ [key: string]: any }>,
    topK = 5
  ): Array<{ doc: any; similarity: number }> {
    const target = this.options.targetField || '_embedding';
    const scored = documents
      .filter((doc) => Array.isArray(doc[target]))
      .map((doc) => ({
        doc,
        similarity: cosineSimilarity(queryVector, doc[target]),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topK);
  }
}
