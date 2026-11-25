import type { Field } from "../fields/types.js";

const options = (values: string[]) =>
  values.map((value) => ({ label: value.charAt(0).toUpperCase() + value.slice(1), value }));
const number = (name: string, label: string, min = 0, max = 2400): Field => ({ name, label, type: "number", min, max });
const select = (name: string, label: string, values: string[]): Field => ({
  name,
  label,
  type: "select",
  options: options(values),
});
const color = (name: string, label: string): Field => ({ name, label, type: "color" });

export const extendedLayoutFields: Field[] = [
  { name: 'fontFamily', label: 'Font family', type: 'text' },
  number("flexBasis", "Item basis (px)"),
  number("flexGrow", "Grow", 0, 10),
  number("flexShrink", "Shrink", 0, 10),
  number("order", "Item order", -100, 100),
  number("columnSpan", "Grid column span", 1, 4),
  number("rowSpan", "Grid row span", 1, 24),
  select("alignSelf", "Item alignment", ["auto", "start", "center", "end", "stretch"]),
  number("fontSize", "Font size (px)", 8, 200),
  number("lineHeight", "Line height", 0.5, 4),
  number("letterSpacing", "Letter spacing (px)", -10, 30),
  select("fontWeight", "Font weight", ["300", "400", "500", "600", "700"]),
  select("textAlign", "Text alignment", ["start", "center", "end", "justify"]),
  number("maxWidth", "Custom max width (px)"),
  number("height", "Height (px)"),
  number("maxHeight", "Maximum height (px)"),
  ...["Top", "Right", "Bottom", "Left"].map((side) => number(`padding${side}`, `Padding ${side.toLowerCase()} (px)`)),
  ...["Top", "Right", "Bottom", "Left"].map((side) =>
    number(`margin${side}`, `Margin ${side.toLowerCase()} (px)`, -1000),
  ),
  number("rowGap", "Row gap (px)"),
  number("columnGap", "Column gap (px)"),
  select("backgroundType", "Background type", ["preset", "color", "gradient", "image", "video"]),
  color("backgroundColor", "Background color"),
  color("gradientColor", "Gradient end color"),
  number("gradientAngle", "Gradient angle", 0, 360),
  {
    name: "backgroundImage",
    label: "Background image",
    type: "upload",
    relationTo: "media",
    allowedTypes: ["image/*"],
  },
  {
    name: "backgroundVideo",
    label: "Background video",
    type: "upload",
    relationTo: "media",
    allowedTypes: ["video/*"],
  },
  select("backgroundSize", "Image fit", ["cover", "contain", "auto"]),
  select("backgroundPosition", "Media position", ["center", "top", "bottom", "left", "right"]),
  color("overlayColor", "Overlay color"),
  number("overlayOpacity", "Overlay opacity (%)", 0, 100),
  color("textColor", "Text color"),
  color("borderColor", "Border color"),
  number("borderWidth", "Border width (px)", 0, 30),
  select("borderStyle", "Border style", ["solid", "dashed", "dotted", "double", "none"]),
  number("opacity", "Opacity (%)", 0, 100),
  select("position", "Position", ["relative", "static", "absolute", "sticky", "fixed"]),
  ...["Top", "Right", "Bottom", "Left"].map((side) => number(`inset${side}`, `${side} offset (px)`, -2400)),
  number("zIndex", "Stacking order", -100, 100),
  ...["tablet", "mobile"].flatMap((device) => [
    number(`${device}Padding`, `${device} padding (px)`),
    number(`${device}Gap`, `${device} gap (px)`),
    number(`${device}Columns`, `${device} grid columns`, 1, 4),
    select(`${device}Direction`, `${device} direction`, ["row", "column"]),
  ]),
  { name: "htmlId", label: "HTML ID", type: "text" },
  { name: "cssClasses", label: "CSS classes", type: "text" },
  {
    name: "customCss",
    label: "CSS declarations",
    type: "code",
    language: "css",
    admin: { description: "Declarations for this layout, for example: border-radius: 16px; No selectors or braces." },
  },
];
