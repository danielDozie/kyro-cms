import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fontStack, fontStylesheet, pageFontStylesheet, StudioPage } from "@kyro-cms/studio";

describe("Studio fonts", () => {
  it("keeps inherited, system, and unknown families off Google requests", () => {
    expect(fontStylesheet(["system", "", "Unknown Font"])).toBeUndefined();
    expect(fontStack("system")).toBe("system-ui, sans-serif");
    expect(fontStack("Unknown Font")).toBeUndefined();
  });
  it("deduplicates nested families and includes supported weights with swap loading", () => {
    const url = pageFontStylesheet([
      {
        blockType: "section",
        layout: { fontFamily: "DM Sans" },
        children: [{ blockType: "container", layout: { fontFamily: "DM Sans" } }],
      },
    ]);
    expect(url).toContain("DM+Sans:wght@300;400;500;600;700");
    expect(url?.match(/family=/g)).toHaveLength(1);
    expect(url).toContain("display=swap");
    expect(fontStylesheet(["Instrument Serif"])).toContain("Instrument+Serif:wght@400&");
  });
  it("renders loading and the selected family through the public page entry point", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudioPage, {
        blocks: [{ blockType: "section", id: "font-test", layout: { fontFamily: "Inter" }, children: [] }],
      }),
    );
    expect(html).toContain("fonts.googleapis.com/css2?");
    expect(html).toContain("font-family:&quot;Inter&quot;, sans-serif");
  });
});
