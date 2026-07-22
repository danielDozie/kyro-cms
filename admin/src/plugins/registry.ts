import type { KyroPlugin } from "./types.ts";

const plugins: Map<string, KyroPlugin> = new Map();

export function registerPlugin(plugin: KyroPlugin): void {
  if (!plugin.name || typeof plugin.name !== "string") {
    throw new Error("Plugin must have a valid name");
  }
  if (plugins.has(plugin.name)) {
    console.warn(`Plugin "${plugin.name}" is already registered. Overwriting.`);
  }
  plugins.set(plugin.name, plugin);
  if (plugin.apply) {
    plugin.apply({});
  }
}

export function unregisterPlugin(name: string): void {
  plugins.delete(name);
}

export function getPlugin(name: string): KyroPlugin | undefined {
  return plugins.get(name);
}

export function getPlugins(): KyroPlugin[] {
  return Array.from(plugins.values());
}

export function getPluginsWithHook<
  K extends keyof NonNullable<KyroPlugin["hooks"]>,
>(hookName: K): KyroPlugin[] {
  return Array.from(plugins.values()).filter(
    (p) => p.hooks && typeof p.hooks[hookName] === "function",
  );
}
