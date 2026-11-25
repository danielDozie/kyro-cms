import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  StudioPage,
  defaultStudioRegistry,
  getStudioIssues,
  collectStudioReferences,
  resolveStudioReferences,
} from "@kyro-cms/studio";
import { studioPageBlocks } from "../../src/templates/blocks";
import {
  flattenStudioTree,
  getStudioNodeSchema,
  identifyStudioBlocks,
  moveStudioTreeNode,
  omitStudioCompositionFields,
} from "../src/lib/studio";
const render = (blocks: any[], extra: any = {}) =>
  renderToStaticMarkup(React.createElement(StudioPage, { blocks, ...extra }));
describe("Studio library and layout contract", () => {
  it("registers every root block and every nested inline/layout schema", () => {
    const seen = new Set<string>();
    const visit = (schemas: any[]) => {
      for (const schema of schemas) {
        expect(defaultStudioRegistry.has(schema.slug), schema.slug).toBe(true);
        if (seen.has(schema.slug)) continue;
        seen.add(schema.slug);
        const fields = (nodes: any[]) =>
          nodes.forEach((f) => {
            if (f.blocks) visit(f.blocks);
            if (f.fields) fields(f.fields);
            if (f.tabs) f.tabs.forEach((t: any) => fields(t.fields || []));
          });
        fields(schema.fields || []);
      }
    };
    visit(studioPageBlocks);
    expect(seen.size).toBeGreaterThanOrEqual(35);
  });
  it("serializes the finite layout schema without circular references", () => {
    expect(() => JSON.stringify(studioPageBlocks)).not.toThrow();
    expect(JSON.stringify(studioPageBlocks).length).toBeLessThan(2000000);
  });
  it("renders nested layout content with distinct node ownership and relative fields", () => {
    const blocks = [
      {
        id: "s",
        blockType: "section",
        children: [
          {
            id: "r",
            blockType: "row",
            children: [
              {
                id: "c",
                blockType: "column",
                children: [{ id: "h", blockType: "headingElement", content: "Nested headline" }],
              },
            ],
          },
        ],
      },
    ];
    const html = render(blocks, { editing: true });
    expect(html).toContain('data-kyro-node-path="0.children.0.children.0.children.0"');
    expect(html).toContain('data-kyro-field="content"');
    expect(html).toContain("Nested headline");
    expect(getStudioIssues(blocks)).toEqual([]);
  });
  it("supports explicit light/dark themes through the same renderer", () => {
    const blocks = [{ blockType: "hero", singleSlide: { title: "Theme-aware" } }];
    expect(render(blocks, { theme: "light" })).toContain('data-theme="light"');
    const dark = render(blocks, { theme: "dark" });
    expect(dark).toContain('data-theme="dark"');
    expect(dark).toContain("--studio-surface:#151515");
    expect(dark).toContain("Theme-aware");
  });

  it("allows a zero-height spacer", () => {
    expect(render([{ blockType: "spacer", size: 0 }])).toContain("height:0");
  });
  it("refuses unknown components and disallowed layout nesting in public rendering", () => {
    expect(() => render([{ blockType: "removedWidget" }])).toThrow(/no renderer/i);
    expect(() => render([{ blockType: "row", children: [{ blockType: "hero" }] }])).toThrow(/not allowed/i);
    expect(render([{ blockType: "removedWidget" }], { editing: true })).toContain("Missing renderer");
  });
  it("renders inline elements alongside their owning section", () => {
    const html = render([
      {
        blockType: "hero",
        singleSlide: { title: "Hero" },
        elements: [{ blockType: "textElement", content: "Additional details" }],
      },
    ]);
    expect(html).toContain("Hero");
    expect(html).toContain("Additional details");
  });
  it("renders actual content for the existing marketing blocks", () => {
    const samples: any[] = [
      { blockType: "featureGrid", features: [{ title: "Fast", description: "A useful feature" }] },
      { blockType: "faq", items: [{ question: "Why?", answer: "Because it works." }] },
      { blockType: "stats", items: [{ value: "99", suffix: "%", label: "Uptime" }] },
      { blockType: "pricing", plans: [{ name: "Starter", currency: "$", price: "19", features: ["One project"] }] },
      { blockType: "team", members: [{ name: "Ada", role: "Editor" }] },
      { blockType: "processSteps", steps: [{ title: "Start", description: "Choose your page" }] },
    ];
    const html = render(samples);
    for (const content of ["Fast", "Because it works.", "Uptime", "Starter", "One project", "Ada", "Choose your page"])
      expect(html).toContain(content);
  });
  it("renders accessible interactive elements and does not inject raw text HTML", () => {
    const html = render([
      {
        blockType: "tabs",
        items: [
          {
            title: "Overview",
            content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] },
          },
        ],
      },
      { blockType: "quote", quote: "<script>bad()</script>", author: "Author" },
    ]);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain("Hello");
    expect(html).not.toContain("<script>");
  });
  it("requires a real form adapter and resolved form reference", () => {
    const blocks = [{ blockType: "formEmbed", form: "form-1" }];
    expect(getStudioIssues(blocks).map((i) => i.code)).toContain("form-adapter");
    const context = {
      references: new Map([["forms/form-1", { id: "form-1", name: "Contact", fields: [] }]]),
      renderForm: () => React.createElement("form", null, "Connected form"),
    };
    expect(getStudioIssues(blocks, context)).toEqual([]);
    expect(render(blocks, { context })).toContain("Connected form");
  });
  it("resolves nested references once without replacing the canonical IDs", async () => {
    const blocks = [
      {
        blockType: "section",
        children: [
          { blockType: "image", image: "m-1" },
          { blockType: "hero", singleSlide: { backgroundImage: "m-1" } },
          { blockType: "recentFeed", selectedItems: [{ relationTo: "posts", value: "p-1" }] },
        ],
      },
    ];
    const calls: string[] = [];
    const refs = await resolveStudioReferences(blocks, async (c, id) => {
      calls.push(`${c}/${id}`);
      return c === "media" ? { id, url: "/uploads/image.webp" } : { id, title: "Related article" };
    });
    expect(calls.sort()).toEqual(["media/m-1", "posts/p-1"]);
    expect(collectStudioReferences(blocks)).toHaveLength(3);
    expect(blocks[0].children[0].image).toBe("m-1");
    expect(getStudioIssues(blocks, { references: refs })).toEqual([]);
  });
  it("keeps unresolved references visible as blocking preflight issues", () => {
    expect(getStudioIssues([{ blockType: "image", image: "missing" }])[0].code).toBe("unresolved-reference");
    expect(() => render([{ blockType: "image", image: "missing" }])).toThrow(/Resolve media reference/);
  });
  it("preserves nested IDs and supports moving content between containers", () => {
    let n = 0;
    const blocks = identifyStudioBlocks(
      [
        { blockType: "container", id: "a", children: [{ blockType: "textElement", id: "t", content: "Keep me" }] },
        { blockType: "container", id: "b", children: [] },
      ],
      () => `new-${++n}`,
    );
    const moved = moveStudioTreeNode(blocks, "0.children.0", "1.children");
    expect(moved.path).toBe("1.children.0");
    expect(flattenStudioTree(moved.blocks).find((node) => node.block.id === "t")?.path).toBe("1.children.0");
    expect(blocks[0].children).toHaveLength(1);
    expect(moveStudioTreeNode(blocks, "0", "0.children").blocks).toBe(blocks);
    expect(getStudioNodeSchema(studioPageBlocks, moved.blocks, "1.children.0")?.slug).toBe("textElement");
  });
  it("removes only the composition from settings, preserving SEO and title fields", () => {
    const fields = [
      {
        type: "tabs",
        tabs: [
          {
            fields: [
              { name: "title", type: "text" },
              { name: "content", type: "blocks" },
            ],
          },
          { fields: [{ name: "seo", type: "group", fields: [{ name: "description", type: "text" }] }] },
        ],
      },
    ];
    const serialized = JSON.stringify(omitStudioCompositionFields(fields, "content"));
    expect(serialized).not.toContain('"name":"content"');
    expect(serialized).toContain('"name":"title"');
    expect(serialized).toContain('"name":"seo"');
  });
});
