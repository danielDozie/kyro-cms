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

      // Ensure we have some content to work with (check content, body, description, text, or title)
      const content = targetData.content || targetData.body || targetData.description || targetData.text || targetData.title;
      if (!content && !targetData.title) return data;

      const extractText = (node: any): string => {
        if (!node) return '';
        if (typeof node === 'string') return node;
        if (typeof node === 'number') return String(node);
        if (node.type === 'text') return node.text || '';
        let text = '';
        if (Array.isArray(node.content)) {
          text += node.content.map(extractText).join(' ');
        } else if (Array.isArray(node)) {
          text += node.map(extractText).join(' ');
        } else if (typeof node === 'object') {
          for (const key of Object.keys(node)) {
            if (['heading', 'title', 'subtitle', 'body', 'description', 'text', 'content'].includes(key)) {
              text += ' ' + extractText(node[key]);
            }
          }
        }
        if (['paragraph', 'heading'].includes(node?.type)) {
          text += '\n';
        }
        return text;
      };

      // Extract raw text if it's tiptap json, blocks array, or object
      let rawText = (targetData.title || '') + ' ';
      if (typeof content === 'string') {
        rawText += content;
      } else if (content) {
        rawText += extractText(content);
      }

      if (!rawText.trim()) return data;

      // If we ALREADY have both non-empty metaTitle and non-empty metaDescription, skip
      if (targetData.metaTitle && targetData.metaDescription && targetData.metaTitle.trim() && targetData.metaDescription.trim()) {
        return data;
      }

      const activeModelName = this.options.modelName || 'gpt-4o-mini';

      // Query CMS Globals (site-settings & brand-settings) for Schema.org context
      let siteName = "";
      let siteUrl = "";
      let companyName = "";
      let logoUrl = "";

      try {
        const db = kyro?.db || kyro?.registry?.db;
        if (db && typeof db.findGlobal === 'function') {
          const siteDoc = await db.findGlobal({ slug: "site-settings" }).catch(() => null);
          const brandDoc = await db.findGlobal({ slug: "brand-settings" }).catch(() => null);
          if (siteDoc) {
            siteName = siteDoc.siteName || "";
            siteUrl = siteDoc.siteUrl || "";
          }
          if (brandDoc) {
            if (brandDoc.companyInfo?.companyName) {
              companyName = brandDoc.companyInfo.companyName;
            }
            if (brandDoc.identity?.primaryLogo) {
              const logo = brandDoc.identity.primaryLogo;
              logoUrl = typeof logo === 'string' ? logo : (logo.url || logo.filename || "");
            }
          }
        }
      } catch (e) {}

      let object: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string;
        twitterTitle?: string;
        twitterDescription?: string;
        structuredData?: any;
      } | null = null;

      try {
        const { generateText } = await import('ai');
        const publisherName = companyName || siteName || 'Organization';
        const logoClause = logoUrl ? `, "logo": { "@type": "ImageObject", "url": "${logoUrl}" }` : '';
        const urlClause = siteUrl ? `, "url": "${siteUrl}"` : '';

        const textRes = await generateText({
          model: provider(activeModelName),
          prompt: `Analyze the content below and generate complete, production-ready SEO metadata for a "${collectionSlug}" titled "${targetData.title || ''}".

CMS Global Context (MUST use these exact values for JSON-LD publisher/organization & logos):
- Site Name: "${siteName}"
- Company/Publisher Name: "${publisherName}"
- Site Base URL: "${siteUrl}"
- Brand Logo Image URL: "${logoUrl}"

Return ONLY a valid JSON object with the following exact keys:
1. "metaTitle": SEO title under 60 characters.
2. "metaDescription": SEO description under 160 characters.
3. "keywords": Comma-separated string of 5 to 8 relevant search keywords.
4. "twitterTitle": Punchy Twitter/X card title under 70 characters.
5. "twitterDescription": Engaging Twitter/X card description under 200 characters.
6. "structuredData": A valid JSON-LD Schema.org object (with "@context": "https://schema.org", "@type": "Article" or "BlogPosting" or "WebPage", "headline", "description", "publisher": { "@type": "Organization", "name": "${publisherName}"${logoClause}${urlClause} }, etc.).

Do not wrap in markdown code blocks or add any commentary.

Content:
${rawText.slice(0, 3000)}`,
        });
        const cleanText = textRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
        object = JSON.parse(cleanText);
      } catch (error) {
        console.error("[AiAutoSeoPlugin] Failed to generate SEO metadata", error);
        return data; // Fail gracefully
      }

      if (!object || (!object.metaTitle && !object.metaDescription && !object.keywords)) {
        return data;
      }

      console.log("[AiAutoSeoPlugin] Generated SEO metadata:", object);

      const existingSeo = targetData.seo || data.seo || {};
      const existingTwitter = existingSeo.twitter || targetData.twitter || data.twitter || {};
      const existingAdvanced = existingSeo.advanced || targetData.advanced || data.advanced || {};

      const metaTitle = (existingSeo.metaTitle && String(existingSeo.metaTitle).trim()) || (targetData.metaTitle && String(targetData.metaTitle).trim()) || object.metaTitle || "";
      const metaDescription = (existingSeo.metaDescription && String(existingSeo.metaDescription).trim()) || (targetData.metaDescription && String(targetData.metaDescription).trim()) || object.metaDescription || "";
      const keywords = (existingSeo.keywords && String(existingSeo.keywords).trim()) || (targetData.keywords && String(targetData.keywords).trim()) || object.keywords || "";
      const twitterTitle = existingTwitter.title || object.twitterTitle || metaTitle;
      const twitterDescription = existingTwitter.description || object.twitterDescription || metaDescription;
      
      const structuredDataStr = existingAdvanced.structuredData || (typeof object.structuredData === 'object' 
        ? JSON.stringify(object.structuredData, null, 2) 
        : (object.structuredData || ""));

      const twitterObj = {
        ...existingTwitter,
        title: existingTwitter.title || twitterTitle,
        description: existingTwitter.description || twitterDescription,
      };

      const advancedObj = {
        ...existingAdvanced,
        structuredData: existingAdvanced.structuredData || structuredDataStr,
      };

      const seoObj = {
        ...existingSeo,
        metaTitle: existingSeo.metaTitle || metaTitle,
        metaDescription: existingSeo.metaDescription || metaDescription,
        keywords: existingSeo.keywords || keywords,
        twitter: twitterObj,
        advanced: advancedObj,
      };

      const finalData: any = {
        ...data,
        seo: seoObj,
        metaTitle: data.metaTitle || metaTitle,
        metaDescription: data.metaDescription || metaDescription,
        keywords: data.keywords || keywords,
        twitter: twitterObj,
        advanced: advancedObj,
        structuredData: data.structuredData || structuredDataStr,
      };

      if (hasTabs) {
        finalData.tabs = {
          ...data.tabs,
          seo: seoObj,
          metaTitle: targetData.metaTitle || metaTitle,
          metaDescription: targetData.metaDescription || metaDescription,
          keywords: targetData.keywords || keywords,
          twitter: twitterObj,
          advanced: advancedObj,
          structuredData: targetData.structuredData || structuredDataStr,
        };
      }

      console.log(`[AiAutoSeoPlugin] Set full SEO metadata for "${collectionSlug}":`, seoObj);
      return finalData;
    };

    // Register hooks on the collections (handle both Kyro instance and Registry instance)
    const reg = kyro?.registry || (typeof kyro?.getCollection === 'function' ? kyro : null);
    if (reg) {
      for (const slug of collections) {
        const collection = reg.getCollection(slug);
        if (collection) {
          collection.hooks = collection.hooks || {};
          collection.hooks.beforeChange = collection.hooks.beforeChange || [];
          collection.hooks.beforeChange.push(handleSeoGeneration);
          console.log(`[AiAutoSeoPlugin] Registered beforeChange SEO hook on collection "${slug}"`);
        } else {
          console.warn(`[AiAutoSeoPlugin] Collection "${slug}" not found in registry`);
        }
      }
    } else {
      console.warn("[AiAutoSeoPlugin] Could not resolve Registry instance during init");
    }
  }
}

