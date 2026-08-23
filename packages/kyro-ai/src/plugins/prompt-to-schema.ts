import { generateObject } from 'ai';
import { z } from 'zod';
import type { CollectionConfig } from '@kyro-cms/core';

export const KyroFieldSchema = z.object({
  name: z.string().describe('CamelCase or snake_case field identifier (e.g. title, featuredImage, price)'),
  type: z.enum([
    'text',
    'textarea',
    'number',
    'richtext',
    'select',
    'checkbox',
    'date',
    'relationship',
    'upload',
    'json',
  ]).describe('Kyro field type'),
  required: z.boolean().optional().describe('Whether this field is mandatory'),
  unique: z.boolean().optional().describe('Whether field value must be unique across the collection'),
  relationTo: z.string().optional().describe('Target collection slug if type is relationship'),
  defaultValue: z.any().optional().describe('Default value for the field'),
});

export const KyroCollectionSchema = z.object({
  slug: z.string().describe('URL and database friendly collection slug (e.g. products, blog_posts)'),
  label: z.string().describe('Human readable singular or plural display label'),
  folder: z.string().optional().describe('Virtual folder group name for organizing in Admin UI (e.g. Editorial, Commerce, System)'),
  timestamps: z.boolean().optional().default(true).describe('Auto-generate createdAt and updatedAt timestamps'),
  drafts: z.boolean().optional().default(true).describe('Enable draft and publishing lifecycle workflow'),
  fields: z.array(KyroFieldSchema).describe('Array of field definitions'),
});

export const KyroSchemaSynthesisResult = z.object({
  collections: z.array(KyroCollectionSchema).describe('Array of synthesized Kyro collections'),
  explanation: z.string().describe('Brief explanation of the schema design and relational architecture'),
});

export interface GenerateSchemaOptions {
  model: any;
  prompt: string;
  existingCollections?: string[];
}

/**
 * Synthesizes production-ready Kyro collection schemas from a natural language prompt
 */
export async function generateKyroSchemaFromPrompt(
  options: GenerateSchemaOptions
): Promise<{ collections: CollectionConfig[]; explanation: string }> {
  const systemPrompt = `You are a Principal Database & Headless CMS Architect designing schemas for Kyro CMS in Astro.
Given the user's requirements, produce clean, normalized collections with appropriate field types.
Conventions:
- Always choose the most descriptive field type ('richtext' for body/content, 'upload' for images/media, 'relationship' for foreign keys).
- For foreign keys/references, specify 'relationTo' pointing to the related collection slug.
- Group related collections logically using the 'folder' attribute (e.g. 'E-Commerce', 'Blog', 'Directory').
- Enable 'drafts' for editorial or content-heavy models.`;

  const userPrompt = `Requirements:
${options.prompt}

${options.existingCollections?.length ? `Existing collections in the project: ${options.existingCollections.join(', ')}` : ''}`;

  const { object } = await generateObject({
    model: options.model,
    schema: KyroSchemaSynthesisResult,
    system: systemPrompt,
    prompt: userPrompt,
  });

  const formattedCollections: CollectionConfig[] = object.collections.map((c) => ({
    slug: c.slug,
    label: c.label,
    folder: c.folder || 'Content',
    timestamps: c.timestamps !== false,
    versions: {
      drafts: c.drafts !== false,
      maxPerDoc: 10,
    },
    fields: c.fields.map((f) => ({
      name: f.name,
      type: f.type as any,
      required: f.required,
      unique: f.unique,
      relationTo: f.relationTo,
      defaultValue: f.defaultValue,
    })),
  }));

  return {
    collections: formattedCollections,
    explanation: object.explanation,
  };
}
