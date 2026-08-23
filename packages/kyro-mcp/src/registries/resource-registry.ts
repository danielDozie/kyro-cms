import type {
  McpResourceDefinition,
  McpResourceReader,
  McpResourceReadResult,
  McpExecutionContext,
} from '../types.js';

export interface RegisteredResource {
  definition: McpResourceDefinition;
  matcher?: RegExp;
  reader: McpResourceReader;
}

export class McpResourceRegistry {
  private resources: RegisteredResource[] = [];

  public register(
    definition: McpResourceDefinition,
    reader: McpResourceReader,
    matcher?: RegExp
  ): this {
    this.resources.push({ definition, reader, matcher });
    return this;
  }

  public list(): McpResourceDefinition[] {
    return this.resources.map((r) => r.definition);
  }

  public async read(
    uri: string,
    context: McpExecutionContext
  ): Promise<McpResourceReadResult> {
    for (const res of this.resources) {
      if (res.definition.uri === uri || (res.matcher && res.matcher.test(uri))) {
        return await res.reader(uri, context);
      }
    }

    throw new Error(`Resource not found for URI: ${uri}`);
  }
}
