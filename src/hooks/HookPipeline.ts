import type { Hook, HookArgs } from "./types.js";

/**
 * HookPipeline: Implements a Pipeline / Chain of Responsibility Pattern for collection and field hooks.
 * Sequentially transforms and validates data while catching errors and maintaining isolation.
 */
export class HookPipeline<T = any> {
  private hooks: Hook<T>[] = [];

  constructor(initialHooks: Hook<T>[] = []) {
    this.hooks = [...initialHooks];
  }

  /**
   * Adds a hook step to the pipeline.
   */
  pipe(hook: Hook<T>): this {
    this.hooks.push(hook);
    return this;
  }

  /**
   * Executes the pipeline sequentially over document data.
   */
  async execute(initialArgs: HookArgs<T>): Promise<T> {
    let currentData = initialArgs.data;

    for (const hook of this.hooks) {
      try {
        const hookResult = await hook({
          ...initialArgs,
          data: currentData,
        });

        if (hookResult !== undefined) {
          currentData = hookResult as T;
        }
      } catch (error) {
        throw new Error(
          `[Kyro CMS HookPipeline Error] Failed during ${initialArgs.operation} on collection "${initialArgs.collection || "global"}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return currentData as T;
  }

  /**
   * Runs an array of hooks using the pipeline pattern.
   */
  static async run<T = any>(hooks: Hook<T>[] | undefined, args: HookArgs<T>): Promise<T> {
    if (!hooks || hooks.length === 0) return args.data as T;
    const pipeline = new HookPipeline<T>(hooks);
    return pipeline.execute(args);
  }
}
