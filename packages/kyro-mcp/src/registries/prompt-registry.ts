import type {
  McpPromptDefinition,
  McpPromptGetter,
  McpPromptResult,
  McpExecutionContext,
} from '../types.js';

export interface RegisteredPrompt {
  definition: McpPromptDefinition;
  getter: McpPromptGetter;
}

export class McpPromptRegistry {
  private prompts = new Map<string, RegisteredPrompt>();

  public register(
    definition: McpPromptDefinition,
    getter: McpPromptGetter
  ): this {
    this.prompts.set(definition.name, { definition, getter });
    return this;
  }

  public list(): McpPromptDefinition[] {
    return Array.from(this.prompts.values()).map((p) => p.definition);
  }

  public async get(
    name: string,
    args: Record<string, string>,
    context: McpExecutionContext
  ): Promise<McpPromptResult> {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt '${name}' not found. Available prompts: ${Array.from(this.prompts.keys()).join(', ')}`);
    }

    return await prompt.getter(args, context);
  }
}
