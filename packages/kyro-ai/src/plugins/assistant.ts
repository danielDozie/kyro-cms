import { KyroPlugin, type PluginAPI } from '@kyro-cms/core';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export interface AiAssistantPluginOptions {
  provider?: any;
  modelName?: string;
  apiRoute?: string;
}

export class AiAssistantPlugin extends KyroPlugin {
  private options: AiAssistantPluginOptions;

  constructor(options: AiAssistantPluginOptions = {}) {
    super('ai-assistant');
    this.displayName = 'AI Assistant';
    this.description = 'AI Writing Assistant for Kyro Richtext Editor and admin UI.';
    this.options = options;

    // Register admin component injection
    this.adminComponents['KyroRichTextToolbarAI'] = {
      type: 'editor-toolbar-button',
      route: this.options.apiRoute || '/api/kyro/ai/completion',
    };
  }

  async init(kyro: any): Promise<void> {
    // Injecting a custom route via serverMiddleware
    this.serverMiddleware = (app: any) => {
      const route = this.options.apiRoute || '/api/kyro/ai/completion';

      const provider = this.options.provider || createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });

      // Support both Hono and Express
      if (typeof app.post === 'function') {
        app.post(route, async (reqOrC: any, resOrNext: any) => {
          try {
            // Detect if we are in Hono (reqOrC is Context) or Express
            const isHono = reqOrC.req && typeof reqOrC.json === 'function';

            let body;
            if (isHono) {
              body = await reqOrC.req.json();
            } else {
              body = reqOrC.body || (await reqOrC.json?.());
            }

            const { prompt, context } = body;

            const activeModelName = this.options.modelName || 'gpt-4o-mini';
            const activePrompt = 'You are an expert writing assistant. Help the user with their task based on the context provided.';

            const response = await generateText({
              model: provider(activeModelName),
              prompt: `System: ${activePrompt}\n\nContext: ${context || ''}\n\nTask: ${prompt}`,
            });

            const text = response.text;

            if (isHono) {
              return reqOrC.json({ text });
            } else {
              if (resOrNext.json) {
                resOrNext.json({ text });
              } else if (resOrNext.send) {
                resOrNext.send(JSON.stringify({ text }));
              }
            }
          } catch (error: any) {
            console.error("[AiAssistantPlugin] Failed", error);

            const isHono = reqOrC.req && typeof reqOrC.json === 'function';
            const errorMessage = error?.message || 'Failed';
            if (isHono) {
              return reqOrC.json({ error: errorMessage }, 500);
            } else if (resOrNext.status) {
              resOrNext.status(500).json({ error: errorMessage });
            }
          }
        });
      }
    };
  }
}
