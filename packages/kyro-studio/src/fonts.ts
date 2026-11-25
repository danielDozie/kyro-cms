import type { StudioBlock } from "./types";

export const studioFonts = [
  { name: "Inter", category: "sans-serif", weights: [300, 400, 500, 600, 700] },
  { name: "Roboto", category: "sans-serif", weights: [300, 400, 500, 600, 700] },
  { name: "DM Sans", category: "sans-serif", weights: [300, 400, 500, 600, 700] },
  { name: "Manrope", category: "sans-serif", weights: [300, 400, 500, 600, 700] },
  { name: "Work Sans", category: "sans-serif", weights: [300, 400, 500, 600, 700] },
  { name: "Source Sans 3", category: "sans-serif", weights: [300, 400, 500, 600, 700] },
  { name: "Nunito", category: "sans-serif", weights: [300, 400, 500, 600, 700] },
  { name: "Bricolage Grotesque", category: "sans-serif", weights: [300, 400, 500, 600, 700] },
  { name: "Lora", category: "serif", weights: [400, 500, 600, 700] },
  { name: "Playfair Display", category: "serif", weights: [400, 500, 600, 700] },
  { name: "Crimson Text", category: "serif", weights: [400, 600, 700] },
  { name: "Instrument Serif", category: "serif", weights: [400] },
  { name: "IBM Plex Mono", category: "monospace", weights: [300, 400, 500, 600, 700] },
  { name: "Space Mono", category: "monospace", weights: [400, 700] },
];
export function fontStack(name: unknown): string | undefined {
  if (name === "system") return "system-ui, sans-serif";
  const font = studioFonts.find((font) => font.name === name);
  return font ? `"${font.name}", ${font.category}` : undefined;
}
export function fontStylesheet(families: string[]): string | undefined {
  const fonts = studioFonts.filter((font) => families.includes(font.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (!fonts.length) return;
  return (
    "https://fonts.googleapis.com/css2?" +
    fonts
      .map((font) => "family=" + encodeURIComponent(font.name).replace(/%20/g, "+") + ":wght@" + font.weights.join(";"))
      .join("&") +
    "&display=swap"
  );
}
export function pageFontStylesheet(blocks: StudioBlock[]): string | undefined {
  const families = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.fontFamily === "string") families.add(record.fontFamily);
    Object.values(record).forEach(visit);
  };
  visit(blocks);
  return fontStylesheet([...families]);
}
