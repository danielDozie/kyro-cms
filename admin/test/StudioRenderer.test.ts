import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createStudioRegistry, defaultStudioRegistry, safeStudioUrl, StudioPage } from "@kyro-cms/studio";
const blocks = [
  {
    id: "hero-1",
    blockType: "hero",
    isMultiScreen: false,
    singleSlide: {
      title: "A real page",
      subtitle: "Shared renderer",
      buttons: [{ text: "Unsafe", url: "javascript:alert(1)" }],
    },
  },
];
describe("Shared Studio renderer", () => {
  it("renders the same content on the website and canvas, with editing annotations only in Studio", () => {
    const published = renderToStaticMarkup(React.createElement(StudioPage, { blocks }));
    const canvas = renderToStaticMarkup(React.createElement(StudioPage, { blocks, editing: true, startIndex: 3 }));
    expect(published).toContain("A real page");
    expect(canvas).toContain("A real page");
    expect(published).not.toContain("data-kyro-field");
    expect(canvas).toContain('data-kyro-field="singleSlide.title"');
    expect(canvas).toContain('data-kyro-block-index="3"');
    expect(published).not.toContain("javascript:");
  });
  it("does not render editor placeholders on published pages", () => {
    const empty = [{ blockType: "hero" }];
    expect(renderToStaticMarkup(React.createElement(StudioPage, { blocks: empty }))).not.toContain(
      "Your next great story",
    );
    expect(renderToStaticMarkup(React.createElement(StudioPage, { blocks: empty, editing: true }))).toContain(
      "Your next great story",
    );
  });
  it("supports frontend-specific components without changing stored block types", () => {
    const Component = () => React.createElement("section", null, "Custom frontend hero");
    const registry = createStudioRegistry([{ type: "hero", label: "Hero", Component }]);
    expect(renderToStaticMarkup(React.createElement(StudioPage, { blocks, registry }))).toContain(
      "Custom frontend hero",
    );
    expect(defaultStudioRegistry.has("hero")).toBe(true);
    expect(() =>
      createStudioRegistry([
        { type: "hero", label: "Hero", Component },
        { type: "hero", label: "Hero", Component },
      ]),
    ).toThrow();
  });
  it("rejects executable and protocol-relative URLs", () => {
    expect(safeStudioUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeStudioUrl("//unexpected.example")).toBeUndefined();
    expect(safeStudioUrl("java\nscript:alert(1)")).toBeUndefined();
    expect(safeStudioUrl("/about")).toBe("/about");
  });
});
