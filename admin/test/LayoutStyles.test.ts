import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioPage } from "@kyro-cms/studio";
import { describe, expect, it } from "vitest";
import { extendedLayoutStyle, parseLayoutCss } from "../../packages/kyro-studio/src/layout-styles";

describe("Layout styles", () => {
  it("renders saved media, custom attributes, and layout styles through the shared page entry point", () => {
    const blocks = [
      {
        id: "layout-1",
        blockType: "section",
        children: [],
        layout: {
          htmlId: "promo",
          cssClasses: "campaign-banner",
          backgroundType: "video",
          backgroundVideo: { url: "/uploads/background.mp4" },
          paddingTop: 12,
          customCss: "letter-spacing: 1px;",
          mobilePadding: 8,
        },
      },
    ];
    const html = renderToStaticMarkup(React.createElement(StudioPage, { blocks }));
    expect(html).toContain('id="promo"');
    expect(html).toContain("campaign-banner");
    expect(html).toContain('src="/uploads/background.mp4"');
    expect(html).toContain("padding-top:12px");
    expect(html).toContain("letter-spacing:1px");
    expect(html).toContain("--layout-mobile-padding:8px");
    const editor = renderToStaticMarkup(React.createElement(StudioPage, { blocks, editing: true }));
    expect(editor).not.toContain("autoPlay=");
  });
  it("preserves explicit zero values and clamps bounded values", () => {
    expect(extendedLayoutStyle({ paddingTop: 0, opacity: 0, borderWidth: 100, marginLeft: -2000 })).toMatchObject({
      paddingTop: 0,
      opacity: 0,
      borderWidth: 30,
      marginLeft: -1000,
    });
  });
  it("only parses declarations and keeps custom properties", () => {
    expect(parseLayoutCss("border-radius: 12px; --brand-color: red;")).toEqual({
      borderRadius: "12px",
      "--brand-color": "red",
    });
    expect(parseLayoutCss("} body { display: none; }")).toEqual({});
    expect(parseLayoutCss('@import "https://example.com/style.css";')).toEqual({});
  });
  it("emits responsive variables only for configured overrides", () => {
    expect(extendedLayoutStyle({ mobilePadding: 0, tabletColumns: 9, mobileDirection: "column" })).toMatchObject({
      "--layout-mobile-padding": "0px",
      "--layout-tablet-columns": 4,
      "--layout-mobile-direction": "column",
    });
    expect(extendedLayoutStyle({})).toEqual({});
  });
});
