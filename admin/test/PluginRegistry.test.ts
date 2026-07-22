import { describe, it, expect, beforeEach } from "vitest";
import {
  registerPlugin,
  unregisterPlugin,
  getPlugin,
  getPlugins,
  getPluginsWithHook,
} from "../src/plugins/registry.ts";
import type { KyroPlugin } from "../src/plugins/types.ts";

describe("Admin Plugin Registry", () => {
  beforeEach(() => {
    getPlugins().forEach((p) => unregisterPlugin(p.name));
  });

  it("registers a plugin successfully", () => {
    const plugin: KyroPlugin = {
      name: "seo-plugin",
      version: "1.0.0",
      description: "SEO Optimization Plugin",
    };

    registerPlugin(plugin);
    expect(getPlugin("seo-plugin")).toBe(plugin);
    expect(getPlugins()).toHaveLength(1);
  });

  it("throws an error if plugin has no name", () => {
    expect(() => registerPlugin({} as any)).toThrow("Plugin must have a valid name");
  });

  it("unregisters a plugin", () => {
    const plugin: KyroPlugin = { name: "analytics-plugin" };
    registerPlugin(plugin);
    expect(getPlugin("analytics-plugin")).toBeDefined();

    unregisterPlugin("analytics-plugin");
    expect(getPlugin("analytics-plugin")).toBeUndefined();
  });

  it("filters plugins by hook capability", () => {
    const pluginWithHook: KyroPlugin = {
      name: "hooked-plugin",
      hooks: {
        beforeSave: async () => {},
      },
    };

    const pluginWithoutHook: KyroPlugin = {
      name: "basic-plugin",
    };

    registerPlugin(pluginWithHook);
    registerPlugin(pluginWithoutHook);

    const filtered = getPluginsWithHook("beforeSave");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("hooked-plugin");
  });
});
