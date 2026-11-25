import { studioFonts, fontStack, fontStylesheet } from "@kyro-cms/studio";
import React, { useState } from "react";
import { FieldRenderer } from "../FieldRenderer";
import { CustomSelect } from "../ui/CustomSelect";
import "./LayoutControls.css";

export function supportsLayoutControls(fields: any[] = []) {
  const names = new Set([
    "width",
    "direction",
    "columns",
    "wrap",
    "align",
    "justify",
    "padding",
    "gap",
    "background",
    "radius",
    "minHeight",
    "overflow",
    "maxWidth",
    "height",
    "maxHeight",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "rowGap",
    "columnGap",
    "backgroundType",
    "backgroundColor",
    "gradientColor",
    "gradientAngle",
    "backgroundImage",
    "backgroundVideo",
    "backgroundSize",
    "backgroundPosition",
    "overlayColor",
    "overlayOpacity",
    "textColor",
    "borderColor",
    "borderWidth",
    "borderStyle",
    "opacity",
    "position",
    "insetTop",
    "insetRight",
    "insetBottom",
    "insetLeft",
    "zIndex",
    "htmlId",
    "cssClasses",
    "customCss",
    "tabletPadding",
    "tabletGap",
    "tabletColumns",
    "tabletDirection",
    "mobilePadding",
    "mobileGap",
    "mobileColumns",
    "mobileDirection",
    "flexBasis",
    "flexGrow",
    "flexShrink",
    "order",
    "columnSpan",
    "rowSpan",
    "alignSelf",
    "fontFamily",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "fontWeight",
    "textAlign",
  ]);
  return fields.length > 0 && fields.every((field) => names.has(field.name));
}

export function LayoutControls({
  fields,
  value,
  disabled,
  onChange,
  context,
  hidePreview,
}: {
  context?: "Design" | "Misc";
  hidePreview?: boolean;
  fields: any[];
  value: Record<string, any>;
  disabled?: boolean;
  onChange: (value: Record<string, any>) => void;
}) {
  const [detailedSpacing, setDetailedSpacing] = useState(false);
  const grid = fields.some((field) => field.name === "columns");
  const horizontal = (value.direction || fields.find((field) => field.name === "direction")?.defaultValue) === "row";
  const sections = [
    {
      title: "Structure",
      names: [
        "width",
        "maxWidth",
        "direction",
        "columns",
        "wrap",
        "align",
        "justify",
        "height",
        "minHeight",
        "maxHeight",
      ],
    },
    {
      title: "Spacing",
      names: [
        "padding",
        "gap",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "marginTop",
        "marginRight",
        "marginBottom",
        "marginLeft",
        "rowGap",
        "columnGap",
      ],
    },
    {
      title: "Appearance",
      names: [
        "backgroundType",
        "background",
        "backgroundColor",
        "gradientColor",
        "gradientAngle",
        "backgroundImage",
        "backgroundVideo",
        "backgroundSize",
        "backgroundPosition",
        "overlayColor",
        "overlayOpacity",
        "textColor",
        "radius",
        "borderWidth",
        "borderStyle",
        "borderColor",
        "opacity",
      ],
    },
    {
      title: "Item sizing",
      names: ["flexBasis", "flexGrow", "flexShrink", "order", "columnSpan", "rowSpan", "alignSelf"],
    },
    {
      title: "Typography",
      names: ["fontFamily", "fontSize", "lineHeight", "letterSpacing", "fontWeight", "textAlign"],
    },
    {
      title: "Position",
      names: ["position", "insetTop", "insetRight", "insetBottom", "insetLeft", "zIndex", "overflow"],
    },
    {
      title: "Responsive",
      names: [
        "tabletPadding",
        "tabletGap",
        "tabletColumns",
        "tabletDirection",
        "mobilePadding",
        "mobileGap",
        "mobileColumns",
        "mobileDirection",
      ],
    },
    { title: "Attributes & CSS", names: ["htmlId", "cssClasses", "customCss"] },
  ];
  const backgroundType = value.backgroundType || "preset";
  const showField = (name: string) => {
    if (["tabletColumns", "mobileColumns"].includes(name)) return grid;
    if (["tabletDirection", "mobileDirection"].includes(name)) return !grid;
    if (/^(padding|margin)(Top|Right|Bottom|Left)$/.test(name) || ["rowGap", "columnGap"].includes(name))
      return detailedSpacing;
    if (["borderStyle", "borderColor"].includes(name)) return Number(value.borderWidth) > 0;
    if (name === "wrap") return horizontal;
    if (name === "background") return backgroundType === "preset";
    if (name === "backgroundColor") return ["color", "gradient"].includes(backgroundType);
    if (["gradientColor", "gradientAngle"].includes(name)) return backgroundType === "gradient";
    if (name === "backgroundImage" || name === "backgroundSize") return backgroundType === "image";
    if (name === "backgroundVideo") return backgroundType === "video";
    if (["backgroundPosition", "overlayColor", "overlayOpacity"].includes(name))
      return ["image", "video"].includes(backgroundType);
    if (name.startsWith("inset"))
      return ["absolute", "fixed", "sticky", "relative"].includes(value.position || "relative");
    return true;
  };
  return (
    <div className="layout-controls">
      {!hidePreview && (
        <div className="layout-control-preview">
          <svg
            viewBox="0 0 84 52"
            width="84"
            height="52"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <rect x="2" y="2" width="80" height="48" rx="4" opacity=".4" />
            {grid
              ? [0, 1, 2, 3].map((index) => (
                  <rect
                    key={index}
                    x={9 + (index % 2) * 35}
                    y={8 + Math.floor(index / 2) * 20}
                    width="30"
                    height="15"
                    rx="2"
                  />
                ))
              : [0, 1, 2].map((index) => (
                  <rect
                    key={index}
                    x={horizontal ? 9 + index * 23 : 9}
                    y={horizontal ? 9 : 8 + index * 13}
                    width={horizontal ? 19 : 66}
                    height={horizontal ? 34 : 9}
                    rx="2"
                  />
                ))}
          </svg>
          <p>
            {grid ? "Arrange items in a grid." : horizontal ? "Place items side by side." : "Stack items vertically."}
          </p>
        </div>
      )}
      {sections
        .filter(
          (section) =>
            !context ||
            (context === "Misc"
              ? ["Position", "Responsive", "Attributes & CSS"].includes(section.title)
              : !["Position", "Responsive", "Attributes & CSS"].includes(section.title)),
        )
        .map((section, index) => {
          const visible = fields.filter((field) => section.names.includes(field.name) && showField(field.name));
          if (!visible.length) return null;
          return (
            <details key={section.title} open={index < 2}>
              <summary>{section.title}</summary>
              {section.title === "Typography" && (
                <div className="layout-font-preview">
                  {fontStylesheet([value.fontFamily]) && (
                    <link rel="stylesheet" href={fontStylesheet([value.fontFamily])} />
                  )}
                  <p style={{ fontFamily: fontStack(value.fontFamily), fontWeight: Number(value.fontWeight) || 400 }}>
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              )}
              {section.title === "Spacing" && (
                <button
                  type="button"
                  className="layout-spacing-toggle"
                  aria-expanded={detailedSpacing}
                  disabled={disabled}
                  onClick={() => setDetailedSpacing((open) => !open)}
                >
                  {detailedSpacing ? "Hide side controls" : "Edit individual sides & gaps"}
                </button>
              )}
              {section.title === "Item sizing" && (
                <p className="layout-control-note">
                  These settings control this layout inside its parent. Grid spans use automatic placement on smaller
                  screens.
                </p>
              )}
              <div className="layout-control-grid">
                {visible.map((field) =>
                  ["upload", "code"].includes(field.type) ? (
                    <div key={field.name} className="layout-control-wide">
                      <FieldRenderer
                        field={field}
                        value={value[field.name]}
                        disabled={disabled}
                        onChange={(next) => onChange({ ...value, [field.name]: next })}
                      />
                    </div>
                  ) : (
                    <label key={field.name}>
                      <span>{field.label || field.name}</span>
                      {field.name === "fontFamily" ? (
                        <CustomSelect
                          aria-label="Font family"
                          value={value.fontFamily || ""}
                          disabled={disabled}
                          onChange={(event) => {
                            const font = studioFonts.find((font) => font.name === event.target.value);
                            onChange({
                              ...value,
                              fontFamily: event.target.value || undefined,
                              ...(font && value.fontWeight && !font.weights.includes(Number(value.fontWeight))
                                ? { fontWeight: String(font.weights[0]) }
                                : {}),
                            });
                          }}
                        >
                          <option value="">Inherit site font</option>
                          <option value="system">System font</option>
                          {studioFonts.map((font) => (
                            <option key={font.name} value={font.name}>
                              {font.name}
                            </option>
                          ))}
                        </CustomSelect>
                      ) : field.type === "select" &&
                        ["direction", "align", "justify", "wrap", "backgroundSize", "textAlign"].includes(
                          field.name,
                        ) ? (
                        <div className="layout-visual-choices" role="group" aria-label={field.label}>
                          {(field.options || [])
                            .filter(
                              (option: any) =>
                                field.name !== "fontWeight" ||
                                !studioFonts.some((font) => font.name === value.fontFamily) ||
                                studioFonts
                                  .find((font) => font.name === value.fontFamily)!
                                  .weights.includes(Number(option.value)),
                            )
                            .map((option: any) => (
                              <button
                                key={option.value}
                                type="button"
                                title={option.label}
                                disabled={disabled}
                                aria-pressed={(value[field.name] ?? field.defaultValue) === option.value}
                                onClick={() => onChange({ ...value, [field.name]: option.value })}
                              >
                                <ChoiceDiagram name={field.name} value={option.value} />
                                <span>{option.label}</span>
                              </button>
                            ))}
                        </div>
                      ) : field.type === "select" ? (
                        <CustomSelect
                          aria-label={field.label}
                          value={value[field.name] ?? field.defaultValue ?? ""}
                          disabled={disabled}
                          onChange={(event) => onChange({ ...value, [field.name]: event.target.value })}
                        >
                          {!field.defaultValue && <option value="">Default</option>}
                          {(field.options || [])
                            .filter(
                              (option: any) =>
                                field.name !== "fontWeight" ||
                                !studioFonts.some((font) => font.name === value.fontFamily) ||
                                studioFonts
                                  .find((font) => font.name === value.fontFamily)!
                                  .weights.includes(Number(option.value)),
                            )
                            .map((option: any) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </CustomSelect>
                      ) : field.type === "color" ? (
                        <div className="layout-color-control">
                          <input
                            type="color"
                            aria-label={field.label}
                            disabled={disabled}
                            value={/^#[0-9a-f]{6}$/i.test(value[field.name] || "") ? value[field.name] : "#000000"}
                            onChange={(event) => onChange({ ...value, [field.name]: event.target.value })}
                          />
                          <input
                            type="text"
                            aria-label={field.label + " value"}
                            disabled={disabled}
                            value={value[field.name] || ""}
                            placeholder="Default"
                            onChange={(event) => onChange({ ...value, [field.name]: event.target.value })}
                          />
                        </div>
                      ) : (
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          aria-label={field.label}
                          min={field.min}
                          max={field.max}
                          step="any"
                          disabled={disabled}
                          value={value[field.name] ?? field.defaultValue ?? ""}
                          placeholder={field.type === "number" ? "Auto" : "Optional"}
                          onChange={(event) =>
                            onChange({
                              ...value,
                              [field.name]:
                                event.target.value === ""
                                  ? undefined
                                  : field.type === "number"
                                    ? event.target.valueAsNumber
                                    : event.target.value,
                            })
                          }
                        />
                      )}
                    </label>
                  ),
                )}
              </div>
            </details>
          );
        })}
    </div>
  );
}

function ChoiceDiagram({ name, value }: { name: string; value: string }) {
  const vertical = value === "column";
  const start = value === "end" || value === "right" ? 24 : value === "center" ? 14 : 4;
  return (
    <svg
      width="32"
      height="24"
      viewBox="0 0 40 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="38" height="26" rx="3" opacity=".3" />
      {[0, 1, 2].map((index) => {
        if (name === "direction" || name === "wrap")
          return (
            <rect
              key={index}
              x={vertical ? 5 : 5 + index * 10}
              y={vertical ? 4 + index * 7 : value === "wrap" && index === 2 ? 16 : 6}
              width={vertical ? 30 : 7}
              height={vertical ? 4 : 8}
              rx="1"
            />
          );
        if (name === "backgroundSize")
          return (
            <rect
              key={index}
              x={value === "cover" ? 3 : 10}
              y={5 + index * 6}
              width={value === "cover" ? 34 : 20}
              height="3"
            />
          );
        if (name === "justify")
          return (
            <rect
              key={index}
              x={value === "between" ? 4 + index * 13 : start + index * 4}
              y="7"
              width="3"
              height="14"
              rx="1"
            />
          );
        return (
          <rect
            key={index}
            x={value === "stretch" || value === "justify" ? 4 : start}
            y={5 + index * 7}
            width={value === "stretch" || value === "justify" ? 32 : 12 - index * 2}
            height="3"
            rx="1"
          />
        );
      })}
    </svg>
  );
}
