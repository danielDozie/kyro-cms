import { describe, expect, it } from "vitest";
import type { CollectionConfig } from "@kyro-cms/core/client";
import {
  getStudioBlockField,
  getStudioValue,
  identifyStudioBlocks,
  isStudioCollection,
  reorderStudioBlocks,
  setStudioValue,
  studioCollectionUrl,
  studioDocumentTitle,
} from "../src/lib/studio";
const collection = (props: Record<string, any> = {}): CollectionConfig =>
  ({
    slug: "pages",
    versions: { drafts: true },
    admin: { studio: { field: "content" } },
    fields: [{ name: "content", type: "blocks", blocks: [] }],
    ...props,
  }) as CollectionConfig;
describe("Studio composition contract", () => {
  it("requires an explicit opt-in and a real blocks field", () => {
    expect(isStudioCollection(collection())).toBe(true);
    expect(isStudioCollection(collection({ versions: undefined }))).toBe(false);
    expect(isStudioCollection(collection({ admin: {} }))).toBe(false);
    expect(isStudioCollection(collection({ admin: { studio: { enabled: false, field: "content" } } }))).toBe(false);
    expect(isStudioCollection(collection({ fields: [{ name: "content", type: "richtext" }] }))).toBe(false);
    expect(isStudioCollection(collection({ auth: true }))).toBe(false);
    expect(isStudioCollection(collection({ slug: "media" }))).toBe(false);
    expect(isStudioCollection(collection({ admin: { hidden: true, studio: { field: "content" } } }))).toBe(false);
  });
  it("resolves blocks inside named tabs and groups without flattening stored data", () => {
    const config = collection({
      admin: { studio: { field: "layout.main.sections" } },
      fields: [
        {
          type: "tabs",
          tabs: [
            {
              name: "layout",
              fields: [{ name: "main", type: "group", fields: [{ name: "sections", type: "blocks", blocks: [] }] }],
            },
          ],
        },
      ],
    });
    expect(getStudioBlockField(config)?.path).toBe("layout.main.sections");
  });
  it("updates nested array properties immutably and rejects prototype paths", () => {
    const original = {
      content: [{ id: "a", singleSlide: { title: "Before", buttons: [{ text: "Go" }] } }],
      untouched: 1,
    };
    const next = setStudioValue(original, "content.0.singleSlide.buttons.0.text", "Explore");
    expect(getStudioValue(next, "content.0.singleSlide.buttons.0.text")).toBe("Explore");
    expect(original.content[0].singleSlide.buttons[0].text).toBe("Go");
    expect(next.untouched).toBe(1);
    expect(() => setStudioValue({}, "__proto__.polluted", true)).toThrow();
    expect(getStudioValue({}, "constructor.prototype")).toBeUndefined();
  });
  it("preserves stable IDs, assigns missing or duplicate IDs, and keeps unknown block data", () => {
    let id = 0;
    const blocks = identifyStudioBlocks(
      [{ id: "a", blockType: "hero" }, { id: "a", blockType: "custom", props: { keep: 1 } }, { blockType: "hero" }],
      () => `new-${++id}`,
    );
    expect(blocks.map((block) => block.id)).toEqual(["a", "new-1", "new-2"]);
    expect(blocks[1].props).toEqual({ keep: 1 });
    expect(identifyStudioBlocks(blocks, () => "unused")).toEqual(blocks);
    expect(reorderStudioBlocks(blocks, 2, 0).map((block) => block.id)).toEqual(["new-2", "a", "new-1"]);
    expect(reorderStudioBlocks(blocks, 0, -1)).toBe(blocks);
  });
  it("uses configured titles and preserves custom admin paths", () => {
    expect(
      studioDocumentTitle(collection({ admin: { useAsTitle: "meta.heading" } }), { meta: { heading: "About" } }),
    ).toBe("About");
    expect(studioDocumentTitle(collection(), {})).toBe("Untitled");
    expect(studioCollectionUrl("/cms", "press releases")).toBe("/cms/studio?collection=press%20releases");
  });
});
