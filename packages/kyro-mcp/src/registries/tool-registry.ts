import type {
  McpToolDefinition,
  McpToolResult,
  McpExecutionContext,
} from '../types.js';
import { McpErrorCode } from '../types.js';

export class McpToolRegistry {
  private tools = new Map<string, McpToolDefinition>();

  public register<T>(tool: McpToolDefinition<T>): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  public registerMany(tools: McpToolDefinition[]): this {
    for (const tool of tools) {
      this.register(tool);
    }
    return this;
  }

  public get(name: string): McpToolDefinition | undefined {
    return this.tools.get(name);
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public list(): Array<{ name: string; description: string; inputSchema: any }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  public async execute(
    name: string,
    rawArgs: Record<string, any> = {},
    context: McpExecutionContext
  ): Promise<McpToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Tool '${name}' not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
          },
        ],
      };
    }

    let parsedArgs = rawArgs;
    if (tool.zodSchema) {
      const parseResult = tool.zodSchema.safeParse(rawArgs);
      if (!parseResult.success) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Invalid parameters for tool '${name}': ${JSON.stringify(parseResult.error.format())}`,
            },
          ],
        };
      }
      parsedArgs = parseResult.data;
    }

    try {
      return await tool.handler(parsedArgs, context);
    } catch (err: any) {
      context.log('error', `Error executing tool '${name}'`, { error: err.message, stack: err.stack });
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Execution failed for tool '${name}': ${err.message || String(err)}`,
          },
        ],
      };
    }
  }
}
