import * as readline from 'node:readline';
import type {
  KyroMcpServerOptions,
  McpExecutionContext,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  McpInitializeResult,
} from './types.js';
import { McpErrorCode } from './types.js';
import { McpToolRegistry } from './registries/tool-registry.js';
import { McpResourceRegistry } from './registries/resource-registry.js';
import { McpPromptRegistry } from './registries/prompt-registry.js';
import { standardKyroMcpTools } from './tools/index.js';

export class KyroMcpServer {
  public readonly tools: McpToolRegistry;
  public readonly resources: McpResourceRegistry;
  public readonly prompts: McpPromptRegistry;

  private options: KyroMcpServerOptions;
  private isInitialized = false;

  constructor(options: KyroMcpServerOptions) {
    this.options = options;
    this.tools = new McpToolRegistry();
    this.resources = new McpResourceRegistry();
    this.prompts = new McpPromptRegistry();

    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 1. Register default tools
    this.tools.registerMany(standardKyroMcpTools);

    // 2. Register default resources
    this.resources.register(
      {
        uri: 'kyro://collections',
        name: 'Kyro Collections Overview',
        description: 'JSON list of all configured collections, field counts, and folder groups',
        mimeType: 'application/json',
      },
      async (_uri, context) => {
        const collections: any[] = Array.isArray(context.config.collections)
          ? context.config.collections
          : Object.values(context.config.collections || {});
        return {
          contents: [
            {
              uri: 'kyro://collections',
              mimeType: 'application/json',
              text: JSON.stringify(
                collections.map((c: any) => ({
                  slug: c.slug,
                  label: c.label || c.slug,
                  folder: c.folder || (c.admin as any)?.folder || 'Unfiled',
                  fieldsCount: c.fields?.length || 0,
                })),
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Dynamic collection detail resource
    this.resources.register(
      {
        uri: 'kyro://collections/{slug}',
        name: 'Kyro Collection Schema',
        description: 'Complete schema definition for a specific collection',
        mimeType: 'application/json',
      },
      async (uri, context) => {
        const slug = uri.replace('kyro://collections/', '');
        const collections: any[] = Array.isArray(context.config.collections)
          ? context.config.collections
          : Object.values(context.config.collections || {});
        const target = collections.find((c: any) => c.slug === slug);

        if (!target) {
          throw new Error(`Collection '${slug}' not found in configuration.`);
        }

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(target, null, 2),
            },
          ],
        };
      },
      /^kyro:\/\/collections\/[a-zA-Z0-9_-]+$/
    );

    // 3. Register default prompts
    this.prompts.register(
      {
        name: 'scaffold_collection',
        description: 'Guides the AI in generating a clean, performant Kyro collection definition with TypeScript types.',
        arguments: [
          { name: 'topic', description: 'What domain or content type to model (e.g. blog, ecommerce, portfolio)', required: true },
        ],
      },
      (args) => ({
        description: `Collection design template for ${args.topic}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are an expert full-stack engineer designing schemas for Kyro CMS in an Astro project.
Please author a production-ready Kyro collection for "${args.topic}".
Requirements:
- Use 'defineKyroConfig' and typed 'CollectionConfig' from '@kyro-cms/core'
- Include sensible field types ('text', 'richtext', 'select', 'relationship', 'upload')
- Include virtual folder grouping with 'folder'
- Enable draft versioning if editorial content
- Ensure all relationship fields specify valid 'relationTo'`,
            },
          },
        ],
      })
    );
  }

  public getContext(): McpExecutionContext {
    return {
      config: this.options.config,
      getKyroInstance: () => this.options.kyroInstance,
      log: (level, message, meta) => {
        if (process.env.KYRO_LOG_LEVEL === 'debug' || level === 'error') {
          process.stderr.write(`[MCP ${level.toUpperCase()}] ${message} ${meta ? JSON.stringify(meta) : ''}\n`);
        }
      },
    };
  }

  public async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    if (!request || request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: {
          code: McpErrorCode.InvalidRequest,
          message: 'Invalid JSON-RPC 2.0 request payload.',
        },
      };
    }

    const { id, method, params } = request;
    const context = this.getContext();

    try {
      switch (method) {
        case 'initialize': {
          this.isInitialized = true;
          const result: McpInitializeResult = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: this.options.serverInfo?.name || '@kyro-cms/mcp',
              version: this.options.serverInfo?.version || '0.13.0',
            },
          };
          return { jsonrpc: '2.0', id: id ?? null, result };
        }

        case 'notifications/initialized': {
          return null; // Notification, no response needed
        }

        case 'ping': {
          return { jsonrpc: '2.0', id: id ?? null, result: {} };
        }

        case 'tools/list': {
          const tools = this.tools.list();
          return { jsonrpc: '2.0', id: id ?? null, result: { tools } };
        }

        case 'tools/call': {
          const { name, arguments: toolArgs } = params || {};
          if (!name) {
            return {
              jsonrpc: '2.0',
              id: id ?? null,
              error: { code: McpErrorCode.InvalidParams, message: 'Missing tool name parameter.' },
            };
          }
          const result = await this.tools.execute(name, toolArgs || {}, context);
          return { jsonrpc: '2.0', id: id ?? null, result };
        }

        case 'resources/list': {
          const resources = this.resources.list();
          return { jsonrpc: '2.0', id: id ?? null, result: { resources } };
        }

        case 'resources/read': {
          const { uri } = params || {};
          if (!uri) {
            return {
              jsonrpc: '2.0',
              id: id ?? null,
              error: { code: McpErrorCode.InvalidParams, message: 'Missing resource URI parameter.' },
            };
          }
          const result = await this.resources.read(uri, context);
          return { jsonrpc: '2.0', id: id ?? null, result };
        }

        case 'prompts/list': {
          const prompts = this.prompts.list();
          return { jsonrpc: '2.0', id: id ?? null, result: { prompts } };
        }

        case 'prompts/get': {
          const { name, arguments: promptArgs } = params || {};
          if (!name) {
            return {
              jsonrpc: '2.0',
              id: id ?? null,
              error: { code: McpErrorCode.InvalidParams, message: 'Missing prompt name parameter.' },
            };
          }
          const result = await this.prompts.get(name, promptArgs || {}, context);
          return { jsonrpc: '2.0', id: id ?? null, result };
        }

        default:
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
              code: McpErrorCode.MethodNotFound,
              message: `Unknown or unsupported MCP method: ${method}`,
            },
          };
      }
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: McpErrorCode.InternalError,
          message: err.message || 'Internal server error occurred.',
          data: err.stack,
        },
      };
    }
  }

  public startStdio(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const parsed = JSON.parse(trimmed);
        const response = await this.handleRequest(parsed);
        if (response) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (err: any) {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: McpErrorCode.ParseError,
            message: `JSON parse error: ${err.message}`,
          },
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    });

    process.stderr.write(`[@kyro-cms/mcp] Kyro MCP Server listening on stdio...\n`);
  }
}

export function createMcpServer(options: KyroMcpServerOptions): KyroMcpServer {
  return new KyroMcpServer(options);
}
