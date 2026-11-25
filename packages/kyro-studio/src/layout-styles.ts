import { fontStack } from "./fonts";
import type { CSSProperties } from "react";

/** A declaration-only editor cannot inject selectors or additional style rules. */
export function parseLayoutCss(source: unknown): CSSProperties {
  if (typeof source !== "string" || /[{}@<>\\]/.test(source)) return {};
  const result: Record<string, string> = {};
  for (const declaration of source.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const property = declaration.slice(0, separator).trim();
    const value = declaration.slice(separator + 1).trim();
    if (
      !/^(--[a-zA-Z0-9-]+|[a-z][a-z-]*)$/.test(property) ||
      !value ||
      /!important|expression\s*\(|javascript:/i.test(value)
    )
      continue;
    const key = property.startsWith("--")
      ? property
      : property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    result[key] = value;
  }
  return result as CSSProperties;
}

export function extendedLayoutStyle(settings: Record<string, any>): CSSProperties {
  const style: Record<string, any> = {};
  const setNumber = (name: string, min = 0, max = 2400, target = name) => {
    if (typeof settings[name] === "number" && Number.isFinite(settings[name]))
      style[target] = Math.max(min, Math.min(max, settings[name]));
  };
  for (const name of ["maxWidth", "height", "maxHeight", "rowGap", "columnGap"]) setNumber(name);
  for (const side of ["Top", "Right", "Bottom", "Left"]) {
    setNumber(`padding${side}`);
    setNumber(`margin${side}`, -1000);
    setNumber(`inset${side}`, -2400, 2400, side.toLowerCase());
  }
  if (fontStack(settings.fontFamily)) style.fontFamily = fontStack(settings.fontFamily);
  setNumber("fontSize", 8, 200);
  setNumber("lineHeight", 0.5, 4);
  setNumber("letterSpacing", -10, 30);
  if (["300", "400", "500", "600", "700"].includes(settings.fontWeight)) style.fontWeight = Number(settings.fontWeight);
  if (["start", "center", "end", "justify"].includes(settings.textAlign)) style.textAlign = settings.textAlign;
  setNumber("borderWidth", 0, 30);
  setNumber("zIndex", -100, 100);
  if (typeof settings.opacity === "number") style.opacity = Math.max(0, Math.min(100, settings.opacity)) / 100;
  if (["static", "relative", "absolute", "sticky", "fixed"].includes(settings.position))
    style.position = settings.position;
  if (["solid", "dashed", "dotted", "double", "none"].includes(settings.borderStyle))
    style.borderStyle = settings.borderStyle;
  else if (settings.borderWidth) style.borderStyle = "solid";
  if (settings.borderColor) style.borderColor = settings.borderColor;
  if (settings.textColor) {
    style.color = settings.textColor;
    style["--studio-ink"] = settings.textColor;
  }
  if (settings.backgroundType === "color") style.background = settings.backgroundColor || "transparent";
  if (settings.backgroundType === "gradient")
    style.background = `linear-gradient(${Number(settings.gradientAngle) || 0}deg, ${settings.backgroundColor || "transparent"}, ${settings.gradientColor || "transparent"})`;
  for (const device of ["tablet", "mobile"]) {
    for (const property of ["Padding", "Gap", "Columns"]) {
      const value = settings[device + property];
      if (typeof value === "number" && Number.isFinite(value))
        style[`--layout-${device}-${property.toLowerCase()}`] =
          property === "Columns"
            ? Math.max(1, Math.min(4, Math.round(value)))
            : `${Math.max(0, Math.min(2400, value))}px`;
    }
    if (["row", "column"].includes(settings[device + "Direction"]))
      style[`--layout-${device}-direction`] = settings[device + "Direction"];
  }
  return { ...style, ...parseLayoutCss(settings.customCss) };
}

export function layoutItemStyle(settings: Record<string, any> = {}): CSSProperties {
  const style: Record<string, any> = {};
  for (const [name, min, max] of [
    ["flexBasis", 0, 2400],
    ["flexGrow", 0, 10],
    ["flexShrink", 0, 10],
    ["order", -100, 100],
  ] as const) {
    if (typeof settings[name] === "number" && Number.isFinite(settings[name]))
      style[name] = Math.max(min, Math.min(max, settings[name]));
  }
  if (["auto", "start", "center", "end", "stretch"].includes(settings.alignSelf)) style.alignSelf = settings.alignSelf;
  if (Number.isFinite(settings.columnSpan))
    style.gridColumn = `span ${Math.max(1, Math.min(4, Math.round(settings.columnSpan)))}`;
  if (Number.isFinite(settings.rowSpan))
    style.gridRow = `span ${Math.max(1, Math.min(24, Math.round(settings.rowSpan)))}`;
  return style;
}
