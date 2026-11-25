import React, { type ReactNode } from "react";
import { renderRichText } from "@kyro-cms/core/client";
import { evaluateDeclarativeCondition } from "../../lib/condition-evaluator";

// Read-only preview renderers; editing continues through FieldStrategyRegistry.
const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "";
const renderers: Record<string, (value: any, field: any) => ReactNode> = {
  text: value => <p>{text(value)}</p>,
  textarea: value => <p className="whitespace-pre-wrap">{text(value)}</p>,
  markdown: value => <pre className="whitespace-pre-wrap">{text(value)}</pre>,
  richtext: value => <div dangerouslySetInnerHTML={{ __html: renderRichText(value) }} />,
  upload: value => value?.url && /\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i.test(value.url) ? <img src={value.url} alt={value.alt || value.altText || ""} /> : null,
  group: (value, field) => <PreviewFields fields={field.fields || []} data={value || {}} />,
  array: (value, field) => Array.isArray(value) ? value.map((item, index) => <section key={item.id || index}><PreviewFields fields={field.fields || []} data={item} /></section>) : null,
  blocks: (value, field) => Array.isArray(value) ? value.map((block, index) => {
    const schema = field.blocks?.find((candidate: any) => candidate.slug === block.blockType || candidate.slug === block.type);
    return <section className="studio-preview-block" key={block.id || index}><small>{schema?.label || schema?.slug || "Content block"}</small>{schema ? <PreviewFields fields={schema.fields || []} data={block} /> : <p>Preview unavailable for this block.</p>}</section>;
  }) : null,
};
function PreviewFields({ fields, data, skipTitle = false }: { fields: any[]; data: Record<string, any>; skipTitle?: boolean }) {
  return <>{fields.map((field, index) => {
    if (field.admin?.hidden || field.hidden || field.admin?.position === "sidebar" || ["slug", "status"].includes(field.name)) return null;
    const condition = field.admin?.condition;
    if (condition && typeof condition === "object" && !evaluateDeclarativeCondition(condition, data, data)) return null;
    if (field.type === "tabs") return <PreviewFields key={index} fields={field.tabs?.[0]?.fields || []} data={field.tabs?.[0]?.name ? data[field.tabs[0].name] || {} : data} skipTitle={skipTitle} />;
    if (["row", "collapsible"].includes(field.type)) return <PreviewFields key={index} fields={field.fields || []} data={data} skipTitle={skipTitle} />;
    const value = data[field.name];
    if (value == null || value === "" || (skipTitle && field.name === "title")) return null;
    if (field.name === "title" && text(value)) return <h2 key={field.name}>{text(value)}</h2>;
    const renderer = renderers[field.type];
    return renderer ? <div key={field.name || index}>{renderer(value, field)}</div> : null;
  })}</>;
}
export function StudioContentPreview({ config, data }: { config: any; data: Record<string, any> }) {
  const title = text(data[config.admin?.useAsTitle || "title"] || data.title || data.name) || "Untitled";
  return <article className="studio-content-preview"><p className="studio-preview-caption">Content preview · includes unsaved changes</p><h1>{title}</h1><PreviewFields fields={config.fields || []} data={data} skipTitle /></article>;
}
