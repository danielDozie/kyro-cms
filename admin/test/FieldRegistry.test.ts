import { describe, it, expect, beforeEach } from "vitest";
import {
  registerField,
  unregisterField,
  getField,
  getFields,
  getFieldByType,
} from "../src/fields/registry.tsx";
import type { KyroField } from "../src/fields/types.ts";

describe("Admin Field Registry", () => {
  beforeEach(() => {
    getFields().forEach((f) => unregisterField(f.id));
  });

  it("registers and retrieves custom fields", () => {
    const customField: KyroField = {
      id: "color-picker",
      name: "Color Picker",
      type: "text",
      editor: () => null,
    };

    registerField(customField);
    expect(getField("color-picker")).toBe(customField);
    expect(getFieldByType("text")).toBe(customField);
  });

  it("throws error for missing id or type", () => {
    expect(() => registerField({ type: "text" } as any)).toThrow("Field must have a valid id");
    expect(() => registerField({ id: "field-1" } as any)).toThrow("Field must have a valid type");
  });

  it("unregisters custom fields", () => {
    const customField: KyroField = {
      id: "code-editor",
      name: "Code Editor",
      type: "json",
      editor: () => null,
    };

    registerField(customField);
    expect(getField("code-editor")).toBeDefined();

    unregisterField("code-editor");
    expect(getField("code-editor")).toBeUndefined();
  });
});
