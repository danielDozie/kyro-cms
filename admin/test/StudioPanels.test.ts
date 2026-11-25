import { describe, expect, it } from "vitest";
import { clampStudioPanelWidth, defaultStudioPanels, parseStudioPanelPreferences } from "../src/lib/studio-panels";
describe("Studio panel preferences", () => {
  it("restores each panel independently", () => {
    const state = parseStudioPanelPreferences(
      JSON.stringify({ libraryOpen: false, inspectorOpen: true, libraryWidth: 310, inspectorWidth: 410 }),
    );
    expect(state).toEqual({ libraryOpen: false, inspectorOpen: true, libraryWidth: 310, inspectorWidth: 410 });
  });
  it("bounds resizing and recovers from invalid preferences", () => {
    expect(clampStudioPanelWidth("library", 12)).toBe(168);
    expect(clampStudioPanelWidth("inspector", 1000)).toBe(520);
    expect(clampStudioPanelWidth("inspector", NaN)).toBe(296);
    expect(parseStudioPanelPreferences("invalid")).toEqual(defaultStudioPanels);
    expect(parseStudioPanelPreferences(null)).toEqual(defaultStudioPanels);
  });
});
