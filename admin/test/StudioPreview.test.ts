import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioContentPreview } from "../src/components/autoform/StudioContentPreview";

describe("Studio content preview", () => {
  it("renders current nested blocks, escapes text, and omits hidden and inactive fields", () => {
    const config = {
      fields: [
        {
          type: "tabs",
          tabs: [
            {
              fields: [
                { name: "title", type: "text" },
                { name: "secret", type: "text", admin: { hidden: true } },
                {
                  name: "content",
                  type: "blocks",
                  blocks: [
                    {
                      slug: "hero",
                      label: "Hero",
                      fields: [
                        {
                          name: "single",
                          type: "group",
                          admin: { condition: { field: "carousel", equals: false } },
                          fields: [{ name: "title", type: "text" }],
                        },
                        { name: "inactive", type: "text", admin: { condition: { field: "carousel", equals: true } } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const data = {
      title: "<script>bad()</script>",
      secret: "DO_NOT_RENDER",
      content: [{ blockType: "hero", carousel: false, single: { title: "Current heading" }, inactive: "INACTIVE" }],
    };
    const html = renderToStaticMarkup(createElement(StudioContentPreview, { config, data }));
    expect(html).toContain("Current heading");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("DO_NOT_RENDER");
    expect(html).not.toContain("INACTIVE");
  });
});
