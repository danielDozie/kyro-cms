import { KyroPlugin, type PluginAPI } from '@kyro-cms/core';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';

export interface AiAutoSeoPluginOptions {
  provider?: any;
  modelName?: string;
  collections: string[];
}

export class AiAutoSeoPlugin extends KyroPlugin {
  private options: AiAutoSeoPluginOptions;
  
  constructor(options: AiAutoSeoPluginOptions) {
    super('ai-auto-seo');
    this.displayName = 'AI Auto SEO';
    this.description = 'Automatically generates SEO metadata for specific collections.';
    this.options = options;
  }

  async init(kyro: any): Promise<void> {
    const { collections } = this.options;

    // Use default OpenAI provider if none specified
    const provider = this.options.provider || createOpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    const handleSeoGeneration = async (args: any) => {
      const { data, collection } = args;
      const collectionSlug = typeof collection === 'string' ? collection : collection?.slug;
      
      // If collection is not in our list, skip
      if (!collections.includes(collectionSlug)) return data;

      // Handle nested tabs structure if present
      const hasTabs = data.tabs && typeof data.tabs === 'object';
      const targetData = hasTabs ? data.tabs : data;

      // Ensure we have some content to work with
      const content = targetData.content || targetData.body;
      if (!content) return data;

      const extractText = (node: any): string => {
        if (!node) return '';
        if (typeof node === 'string') return node;
        if (node.type === 'text') return node.text || '';
        let text = '';
        if (Array.isArray(node.content)) {
          text += node.content.map(extractText).join(' ');
        } else if (Array.isArray(node)) {
          text += node.map(extractText).join(' ');
        }
        if (['paragraph', 'heading'].includes(node.type)) {
          text += '\n';
        }
        return text;
      };

      // Extract raw text if it's tiptap json
      let rawText = '';
      if (typeof content === 'string') {
        rawText = content;
      } else if (typeof content === 'object') {
        rawText = extractText(content);
      }

      // If we already have metaTitle and metaDescription, skip
      if (targetData.metaTitle && targetData.metaDescription) return data;

      const activeModelName = this.options.modelName || 'gpt-4o-mini';
      const activePrompt = 'Generate an SEO title and description based on the following content:';

      try {
        const { object } = await generateObject({
          model: provider(activeModelName),
          schema: z.object({
            metaTitle: z.string().max(60).describe("An SEO optimized title under 60 characters."),
            metaDescription: z.string().max(160).describe("An SEO optimized description under 160 characters."),
          }),
          prompt: `${activePrompt}\n\n${rawText.slice(0, 3000)}`,
        });

        console.log("[AiAutoSeoPlugin] Generated object:", object);

        if (hasTabs) {
          const finalData = {
            ...data,
            tabs: {
              ...data.tabs,
              metaTitle: targetData.metaTitle || object.metaTitle,
              metaDescription: targetData.metaDescription || object.metaDescription,
            }
          };
          console.log("[AiAutoSeoPlugin] Returning data with tabs:", finalData.tabs.metaTitle, finalData.tabs.metaDescription);
          return finalData;
        }

        const finalData = {
          ...data,
          metaTitle: targetData.metaTitle || object.metaTitle,
          metaDescription: targetData.metaDescription || object.metaDescription,
        };
        console.log("[AiAutoSeoPlugin] Returning flat data:", finalData.metaTitle, finalData.metaDescription);
        return finalData;
      } catch (error) {
        console.error("[AiAutoSeoPlugin] Failed to generate SEO metadata", error);
        return data; // Fail gracefully
      }
    };

    // Register hooks on the collections
    if (kyro.registry) {
      for (const slug of collections) {
        const collection = kyro.registry.getCollection(slug);
        if (collection) {
          collection.hooks = collection.hooks || {};
          collection.hooks.beforeChange = collection.hooks.beforeChange || [];
          collection.hooks.beforeChange.push(handleSeoGeneration);
        }
      }
    }
  }
}

