import { describe, it, expect } from 'vitest';
import {
  AiVectorPlugin,
  cosineSimilarity,
  KyroCollectionSchema,
  KyroSchemaSynthesisResult,
} from '../packages/kyro-ai/src/index.js';

describe('AI Vector Plugin & Prompt-to-Schema Validation', () => {
  it('should accurately compute cosine similarity between embedding vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];
    const vecD = [0.7071, 0.7071, 0];

    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 4);
    expect(cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0, 4);
    expect(cosineSimilarity(vecA, vecD)).toBeCloseTo(0.7071, 3);
  });

  it('should rank similar documents in AiVectorPlugin.searchSimilar', () => {
    const plugin = new AiVectorPlugin({
      collections: ['articles'],
      embedFields: ['title', 'content'],
      targetField: '_embedding',
    });

    const docs = [
      { id: '1', title: 'Astro web dev', _embedding: [0.9, 0.1, 0.0] },
      { id: '2', title: 'Cooking recipes', _embedding: [0.0, 0.9, 0.1] },
      { id: '3', title: 'Astro SSR and static site', _embedding: [0.85, 0.15, 0.0] },
    ];

    const queryVector = [1.0, 0.0, 0.0];
    const results = plugin.searchSimilar(queryVector, docs, 2);

    expect(results).toHaveLength(2);
    expect(results[0].doc.id).toBe('1');
    expect(results[1].doc.id).toBe('3');
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
  });

  it('should validate synthesized Kyro collections with Zod schema', () => {
    const validCollection = {
      slug: 'products',
      label: 'Products',
      folder: 'E-Commerce',
      timestamps: true,
      drafts: true,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'category', type: 'relationship', relationTo: 'categories' },
        { name: 'description', type: 'richtext' },
      ],
    };

    const parseResult = KyroCollectionSchema.safeParse(validCollection);
    expect(parseResult.success).toBe(true);
  });

  it('should validate full KyroSchemaSynthesisResult structure', () => {
    const fullResult = {
      explanation: 'Two-tier e-commerce schema with products linked to categories',
      collections: [
        {
          slug: 'categories',
          label: 'Categories',
          folder: 'E-Commerce',
          fields: [{ name: 'name', type: 'text', required: true }],
        },
        {
          slug: 'products',
          label: 'Products',
          folder: 'E-Commerce',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'category', type: 'relationship', relationTo: 'categories' },
          ],
        },
      ],
    };

    const parseResult = KyroSchemaSynthesisResult.safeParse(fullResult);
    expect(parseResult.success).toBe(true);
  });
});
