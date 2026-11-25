import { pageFontStylesheet } from "./fonts";
import { extendedLayoutStyle, layoutItemStyle } from "./layout-styles";
import React from "react";
import type {
  StudioBlock,
  StudioComponent,
  StudioContext,
  StudioIssue,
  StudioRegistry,
  StudioRenderProps,
} from "./types";
import { contentComponents, Hero } from "./blocks";
import { attr, list, text, reference, safeStudioUrl } from "./primitives";
import { getStudioReferenceIssues } from "./references";
import { studioPageStyles } from "./styles";
export { Hero, studioPageStyles };
export { safeStudioUrl } from "./primitives";
export type {
  StudioBlock,
  StudioComponent,
  StudioContext,
  StudioIssue,
  StudioRegistry,
  StudioRenderProps,
} from "./types";
export function createStudioRegistry(components: StudioComponent[]): StudioRegistry {
  const registry = new Map<string, StudioComponent>();
  for (const component of components) {
    if (!component.type || registry.has(component.type))
      throw new Error(`Duplicate or empty Studio component: ${component.type}`);
    registry.set(component.type, component);
  }
  return registry;
}
const contentTypes = contentComponents.map((c) => c.type);
const allowed: Record<string, string[]> = {
  section: ["container", "row", "grid", ...contentTypes, "spacer", "divider"],
  container: ["row", "grid", ...contentTypes, "spacer", "divider"],
  row: ["column"],
  grid: ["column", ...contentTypes, "spacer", "divider"],
  column: [...contentTypes, "spacer", "divider"],
};
const widths: Record<string, string> = { narrow: "720px", content: "1120px", wide: "1440px", full: "100%" };
const space: Record<string, number> = { none: 0, small: 16, medium: 32, large: 64 };
const colors: Record<string, string> = {
  white: "var(--studio-surface)",
  muted: "var(--studio-muted-surface)",
  peach: "var(--studio-soft)",
  dark: "var(--studio-inverse)",
};
function Layout(props: StudioRenderProps) {
  const { block } = props;
  const settings = block.layout || {};
  const background = colors[settings.background] || "transparent";
  const mediaField = settings.backgroundType === "video" ? "backgroundVideo" : "backgroundImage";
  const media = reference(settings[mediaField], "media", props);
  const mediaUrl = safeStudioUrl(media?.url);
  const mediaBackground = ["image", "video"].includes(settings.backgroundType);
  return (
    <div
      {...attr(props, "layout")}
      id={typeof settings.htmlId === "string" ? settings.htmlId.trim().replace(/\s+/g, "-") : undefined}
      className={`kyro-layout kyro-layout-${block.blockType} ${typeof settings.cssClasses === "string" ? settings.cssClasses : ""}`}
      data-empty={!list(block.children).length}
      data-tablet-padding={typeof settings.tabletPadding === "number" || undefined}
      data-tablet-gap={typeof settings.tabletGap === "number" || undefined}
      data-tablet-columns={typeof settings.tabletColumns === "number" || undefined}
      data-tablet-direction={settings.tabletDirection || undefined}
      data-mobile-padding={typeof settings.mobilePadding === "number" || undefined}
      data-mobile-gap={typeof settings.mobileGap === "number" || undefined}
      data-mobile-columns={typeof settings.mobileColumns === "number" || undefined}
      data-mobile-direction={settings.mobileDirection || undefined}
      style={{
        position: "relative",
        isolation: "isolate",
        maxWidth: widths[settings.width] || "100%",
        marginInline: "auto",
        padding: space[settings.padding] ?? 0,
        gap: space[settings.gap] ?? 16,
        background,
        flexDirection: settings.direction === "row" || settings.direction === "column" ? settings.direction : undefined,
        flexWrap: settings.wrap === "wrap" || settings.wrap === "nowrap" ? settings.wrap : undefined,
        minHeight: Number.isFinite(settings.minHeight) ? Math.max(0, Math.min(2400, settings.minHeight)) : undefined,
        borderRadius: Number.isFinite(settings.radius) ? Math.max(0, Math.min(200, settings.radius)) : undefined,
        overflow: ["visible", "hidden", "auto"].includes(settings.overflow) ? settings.overflow : undefined,
        color: settings.background === "dark" ? "var(--studio-inverse-text)" : undefined,
        ...(settings.background === "dark"
          ? { "--studio-ink": "var(--studio-inverse-text)", "--studio-muted": "var(--studio-inverse-text)" }
          : {}),
        alignItems: ({ start: "start", center: "center", end: "end", stretch: "stretch" } as const)[
          settings.align as "start"
        ],
        justifyContent: ({ start: "start", center: "center", end: "end", between: "space-between" } as const)[
          settings.justify as "start"
        ],
        gridTemplateColumns:
          block.blockType === "grid"
            ? `repeat(${Math.max(1, Math.min(4, Number(settings.columns) || 2))},minmax(0,1fr))`
            : undefined,
        ...extendedLayoutStyle(settings),
      }}
    >
      {mediaBackground && mediaUrl && (settings.backgroundType === "video" ?
        <video src={mediaUrl} autoPlay={!props.editing} muted loop playsInline aria-hidden="true" tabIndex={-1}
          className="kyro-layout-background-media" style={{ objectFit: "cover", objectPosition: settings.backgroundPosition || "center" }} /> :
        <div aria-hidden="true" className="kyro-layout-background-media" style={{ backgroundImage: `url(${JSON.stringify(mediaUrl)})`, backgroundSize: settings.backgroundSize || "cover", backgroundPosition: settings.backgroundPosition || "center", backgroundRepeat: "no-repeat" }} />)}
      {mediaBackground && settings.overlayColor && <div aria-hidden="true" className="kyro-layout-background-media" style={{ background: settings.overlayColor, opacity: Math.max(0, Math.min(100, Number(settings.overlayOpacity) || 0)) / 100 }} />}
      {renderNodes(
        list(block.children),
        props.editing || false,
        props.context,
        props.context?.registry || defaultStudioRegistry,
        props.nodePath ? `${props.nodePath}.children` : "children",
        false,
        undefined,
        0,
        block.blockType === "grid" ? Math.max(1, Math.min(4, Number(settings.columns) || 2)) : undefined,
      )}
      {props.editing && !list(block.children).length && (
        <div className="kyro-layout-placeholder">Select this {block.blockType}, then insert content inside.</div>
      )}
    </div>
  );
}
const layouts: StudioComponent[] = [
  ...Object.keys(allowed).map((type) => ({
    type,
    label: type[0].toUpperCase() + type.slice(1),
    category: "Layout",
    Component: Layout,
    allowedChildren: allowed[type],
    defaults: {
      layout: {
        width: type === "container" ? "content" : "full",
        padding: type === "section" ? "large" : "none",
        gap: "medium",
        background: "white",
        columns: 2,
      },
      children: [],
    },
  })),
  {
    type: "spacer",
    label: "Spacer",
    category: "Layout",
    Component: (p: StudioRenderProps) => (
      <div
        {...attr(p, "size")}
        style={{
          height: Math.max(0, Math.min(240, Number.isFinite(Number(p.block.size)) ? Number(p.block.size) : 32)),
        }}
      />
    ),
    defaults: { size: 32 },
  },
  {
    type: "divider",
    label: "Divider",
    category: "Layout",
    Component: (p: StudioRenderProps) => (
      <hr {...attr(p, "label")} style={{ border: 0, borderTop: "1px solid var(--studio-border)", margin: "24px 0" }} />
    ),
  },
];
const registeredComponents = new Map(createStudioRegistry([...contentComponents, ...layouts]));
export const defaultStudioRegistry: StudioRegistry = registeredComponents;
let componentSnapshot = [...registeredComponents.values()];
const listeners = new Set<() => void>();
export function registerStudioComponent(component: StudioComponent) {
  if (!component.type || !component.label || !component.Component)
    throw new Error("A Studio component needs a type, label, and renderer");
  registeredComponents.set(component.type, component);
  componentSnapshot = [...registeredComponents.values()];
  listeners.forEach((f) => f());
}
export function getStudioComponents() {
  return componentSnapshot;
}
export function subscribeStudioComponents(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getStudioIssues(
  blocks: StudioBlock[],
  context?: StudioContext,
  registry: StudioRegistry = defaultStudioRegistry,
): StudioIssue[] {
  const issues: StudioIssue[] = [...getStudioReferenceIssues(blocks, context)];
  const walk = (nodes: StudioBlock[], prefix: string) => {
    if (prefix.split(".").length > 24) {
      issues.push({ code: "nesting-depth", path: prefix, message: "Layout nesting exceeds the supported depth." });
      return;
    }
    nodes.forEach((block, index) => {
      const path = `${prefix}${index}`;
      const def = registry.get(block.blockType);
      if (!def) issues.push({ code: "unknown-block", path, message: `No renderer registered for ${block.blockType}.` });
      if (def?.requiresFormAdapter && !context?.renderForm)
        issues.push({
          code: "form-adapter",
          path,
          message: "Connect a form submission adapter before publishing this form.",
        });
      const children = list(block.children);
      if (children.length && !def?.allowedChildren)
        issues.push({ code: "invalid-nesting", path, message: `${block.blockType} does not accept nested sections.` });
      children.forEach((child, n) => {
        if (def?.allowedChildren && !def.allowedChildren.includes(child.blockType))
          issues.push({
            code: "invalid-nesting",
            path: `${path}.children.${n}`,
            message: `${child.blockType} is not allowed inside ${block.blockType}.`,
          });
      });
      walk(children, `${path}.children.`);
      walk(list(block.elements), `${path}.elements.`);
    });
  };
  walk(blocks, "");
  return issues;
}
function renderNodes(
  blocks: StudioBlock[],
  editing: boolean,
  context: StudioContext | undefined,
  registry: StudioRegistry,
  prefix: string,
  root: boolean,
  renderUnknown?: (block: StudioBlock, index: number) => React.ReactNode,
  startIndex = 0,
  parentColumns?: number,
): React.ReactNode {
  return blocks.map((block, index) => {
    const path = root ? String(index + startIndex) : `${prefix}.${index}`;
    const definition = registry.get(block.blockType);
    if (!definition) {
      if (renderUnknown) return <React.Fragment key={block.id || path}>{renderUnknown(block, index)}</React.Fragment>;
      if (editing)
        return (
          <div key={block.id || path} className="kyro-card" data-kyro-node-path={path}>
            Missing renderer: {block.blockType}
          </div>
        );
      throw new Error(`Kyro Studio: no renderer for ${block.blockType} at ${path}`);
    }
    const props = { block, editing, context, nodePath: path };
    // Fields are relative to the selected block; node paths identify nested owners.
    return (
      <div
        className="kyro-block"
        style={layoutItemStyle(parentColumns && block.layout?.columnSpan ? { ...block.layout, columnSpan: Math.min(parentColumns, block.layout.columnSpan) } : block.layout)}
        key={block.id || path}
        data-kyro-block-id={editing ? block.id : undefined}
        data-kyro-block-index={editing && root ? index + startIndex : undefined}
        data-kyro-node-path={editing ? path : undefined}
        data-kyro-node-type={editing ? block.blockType : undefined}
        tabIndex={editing ? 0 : undefined}
        role={editing ? "button" : undefined}
        aria-label={editing ? `Select ${definition.label}` : undefined}
      >
        <definition.Component {...props} />
        {list(block.elements).length > 0 && (
          <div className="kyro-elements">
            {renderNodes(list(block.elements), editing, context, registry, `${path}.elements`, false, renderUnknown)}
          </div>
        )}
      </div>
    );
  });
}
export function StudioPage({
  blocks,
  registry = defaultStudioRegistry,
  editing = false,
  startIndex = 0,
  renderUnknown,
  context,
  theme = "system",
  includeStyles = true,
}: {
  blocks: StudioBlock[];
  registry?: StudioRegistry;
  editing?: boolean;
  startIndex?: number;
  renderUnknown?: (block: StudioBlock, index: number) => React.ReactNode;
  context?: StudioContext;
  theme?: "system" | "light" | "dark";
  includeStyles?: boolean;
}) {
  if (!editing) {
    const issues = getStudioIssues(blocks, context, registry).filter(
      (issue) => !(renderUnknown && issue.code === "unknown-block"),
    );
    if (issues.length) throw new Error(`Kyro Studio: ${issues.map((i) => i.message).join(" ")}`);
  }
  return (
    <div className="kyro-page" data-theme={theme}>
      {pageFontStylesheet(blocks) && <link rel="stylesheet" href={pageFontStylesheet(blocks)} />}
      {includeStyles && <style>{studioPageStyles}</style>}
      {renderNodes(blocks, editing, { ...context, registry }, registry, "", true, renderUnknown, startIndex)}
    </div>
  );
}
