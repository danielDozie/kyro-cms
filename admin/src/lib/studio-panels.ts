export interface StudioPanelPreferences {
  libraryOpen: boolean;
  inspectorOpen: boolean;
  libraryWidth: number;
  inspectorWidth: number;
}
export const defaultStudioPanels: StudioPanelPreferences = {
  libraryOpen: true,
  inspectorOpen: true,
  libraryWidth: 208,
  inspectorWidth: 296,
};
export function clampStudioPanelWidth(side: "library" | "inspector", width: number) {
  const [min, max] = side === "library" ? [168, 420] : [240, 520];
  return Math.round(Math.min(max, Math.max(min, Number.isFinite(width) ? width : defaultStudioPanels[`${side}Width`])));
}
export function parseStudioPanelPreferences(value: string | null): StudioPanelPreferences {
  try {
    const parsed = JSON.parse(value || "null");
    if (!parsed || typeof parsed !== "object") return { ...defaultStudioPanels };
    return {
      libraryOpen: typeof parsed.libraryOpen === "boolean" ? parsed.libraryOpen : true,
      inspectorOpen: typeof parsed.inspectorOpen === "boolean" ? parsed.inspectorOpen : true,
      libraryWidth: clampStudioPanelWidth("library", Number(parsed.libraryWidth ?? 208)),
      inspectorWidth: clampStudioPanelWidth("inspector", Number(parsed.inspectorWidth ?? 296)),
    };
  } catch {
    return { ...defaultStudioPanels };
  }
}
