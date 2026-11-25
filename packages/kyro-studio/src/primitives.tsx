import React from "react";
import { imageFrame } from "./image-framing";
import type { StudioRenderProps } from "./types";
export const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");
export const list = (value: unknown): any[] => (Array.isArray(value) ? value : []);
export function safeStudioUrl(input: unknown): string | undefined {
  const url = text(input).trim();
  if (!url || /[\u0000-\u001f\u007f\\]/.test(url)) return;
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url) && !url.startsWith("//")) return url;
}
export const attr = (props: StudioRenderProps, path: string) =>
  props.editing ? { "data-kyro-field": props.pathPrefix ? `${props.pathPrefix}.${path}` : path } : {};
export function reference(value: any, collection: string, props: StudioRenderProps): any {
  if (!value) return;
  if (typeof value === "object" && value.value) return reference(value.value, value.relationTo || collection, props);
  if (typeof value === "object" && (value.url || value.title || value.name || value.fields || value.content))
    return value;
  if (collection === "media" && typeof value === "string" && safeStudioUrl(value)) return { url: value };
  const id = typeof value === "object" ? value.id : value;
  return props.context?.references?.get(`${collection}/${id}`);
}
export function Media({
  value,
  path,
  props,
  alt,
  className,
}: {
  value: any;
  path: string;
  props: StudioRenderProps;
  alt?: string;
  className?: string;
}) {
  const asset = reference(value, "media", props);
  const settings = value?.metadata || asset?.metadata;
  const hotspot = settings?.hotspot;
  const crop = settings?.crop;
  const url = safeStudioUrl(asset?.url);
  const frame = imageFrame(1, 1, crop);
  const resizeParams = new URLSearchParams(url ? { url } : {});
  if (crop) {
    resizeParams.set("cx", String(frame.x));
    resizeParams.set("cy", String(frame.y));
    resizeParams.set("cw", String(frame.width));
    resizeParams.set("ch", String(frame.height));
  }
  if (hotspot) {
    resizeParams.set("hx", String(hotspot.x));
    resizeParams.set("hy", String(hotspot.y));
    resizeParams.set("hw", String(hotspot.width));
    resizeParams.set("hh", String(hotspot.height));
  }
  const transformedUrl = url && (crop || hotspot) ? `/api/media/resize?${resizeParams.toString()}` : url;
  return url ? (
    <img
      {...attr(props, path)}
      className={className}
      src={transformedUrl}
      style={hotspot ? { objectPosition: `${Math.max(0, Math.min(100, (hotspot.x + hotspot.width / 2 - frame.x) / frame.width * 100))}% ${Math.max(0, Math.min(100, (hotspot.y + hotspot.height / 2 - frame.y) / frame.height * 100))}%` } : undefined}
      alt={alt || asset?.altText || asset?.alt || ""}
      loading="lazy"
    />
  ) : props.editing ? (
    <div {...attr(props, path)} className="kyro-media-placeholder">
      {value ? "Resolving image…" : "Choose an image"}
    </div>
  ) : null;
}
export function Heading({
  props,
  path = "title",
  level = 2,
}: {
  props: StudioRenderProps;
  path?: string;
  level?: number;
}) {
  const Tag = `h${Math.min(6, Math.max(1, level))}` as "h2";
  return <Tag {...attr(props, path)}>{text(props.block[path])}</Tag>;
}
export function Intro({ props }: { props: StudioRenderProps }) {
  return (
    <header className="kyro-section-intro">
      <Heading props={props} />
      {props.block.subtitle && <p {...attr(props, "subtitle")}>{text(props.block.subtitle)}</p>}
      {props.block.description && <p {...attr(props, "description")}>{text(props.block.description)}</p>}
    </header>
  );
}
export function Buttons({
  items,
  path = "buttons",
  props,
}: {
  items: unknown;
  path?: string;
  props: StudioRenderProps;
}) {
  return (
    <div className="kyro-actions">
      {list(items).map((item, index) => (
        <a
          key={item.id || index}
          {...attr(props, `${path}.${index}.text`)}
          href={safeStudioUrl(item.url)}
          className="kyro-action"
        >
          {text(item.text)}
        </a>
      ))}
    </div>
  );
}

export function IconGlyph({ name }: { name: unknown }) {
  const key = text(name)
    .replace(/^.*:/, "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();
  const paths: Record<string, string> = {
    check: "m5 12 4 4L19 6",
    checkcircle: "m7 12 3 3 7-7M21 12a9 9 0 1 1-9-9",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
    heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 2 10 8 14 6-4 12-10 8-14",
    arrowright: "M4 12h16m-6-6 6 6-6 6",
    zap: "m13 2-9 12h7l-1 8 10-12h-7Z",
    shield: "m12 3 8 3v6c0 4-8 9-8 9s-8-5-8-9V6Z",
    clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d={paths[key] || "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 9v6m-3-3h6"} />
    </svg>
  );
}
