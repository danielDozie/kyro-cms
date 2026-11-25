import { LayoutControls, supportsLayoutControls } from "../fields/LayoutControls";
import React from "react";
import { FieldStrategyRegistry } from "../../services/FieldStrategyRegistry";
import { FieldRenderer } from "../FieldRenderer";
import { evaluateDeclarativeCondition } from "../../lib/condition-evaluator";

export default function StudioProperties({
  fields,
  data,
  root,
  prefix = "",
  selectedPath,
  disabled,
  onChange,
}: {
  fields: any[];
  data: Record<string, any>;
  root: Record<string, any>;
  prefix?: string;
  selectedPath?: string;
  disabled?: boolean;
  onChange: (path: string, value: unknown) => void;
}) {
  return (
    <>
      {fields.map((field, index) => {
        if (field.hidden || field.admin?.hidden) return null;
        const condition = field.admin?.condition;
        if (condition && typeof condition === "object" && !evaluateDeclarativeCondition(condition, data, root))
          return null;
        const path = prefix ? `${prefix}.${field.name}` : field.name;
        const readOnly = disabled || field.readOnly === true || field.admin?.readOnly === true;
        if (field.type === "group" && field.name === "layout" && supportsLayoutControls(field.fields)) return <LayoutControls key={path} fields={field.fields || []} value={data[field.name] || {}} disabled={readOnly} onChange={value => onChange(path, value)} />;
        if (field.type === "tabs")
          return (field.tabs || []).map((tab: any, n: number) => (
            <details className="visual-studio-property-group" key={`${index}-${n}`} open={n === 0}>
              <summary>{tab.label || "Content"}</summary>
              <StudioProperties
                fields={tab.fields || []}
                data={tab.name ? data[tab.name] || {} : data}
                root={root}
                prefix={tab.name ? (prefix ? `${prefix}.${tab.name}` : tab.name) : prefix}
                selectedPath={selectedPath}
                disabled={readOnly}
                onChange={onChange}
              />
            </details>
          ));
        if (["row", "collapsible", "group"].includes(field.type)) {
          const group = field.type === "group" && field.name;
          const groupPrefix = group ? path : prefix;
          return (
            <details
              className="visual-studio-property-group"
              key={path || index}
              open={
                group ? selectedPath?.startsWith(`${path}.`) || ["singleSlide", "layout"].includes(field.name) : true
              }
            >
              <summary>{field.label || field.name || "Properties"}</summary>
              <StudioProperties
                fields={field.fields || []}
                data={group ? data[field.name] || {} : data}
                root={root}
                prefix={groupPrefix}
                selectedPath={selectedPath}
                disabled={readOnly}
                onChange={onChange}
              />
            </details>
          );
        }
        if (field.type === "array" && field.name) {
          const items = Array.isArray(data[field.name]) ? data[field.name] : [];
          return (
            <div className="visual-studio-array" key={path} data-studio-property={path}>
              <header>
                <span>{field.label || field.name}</span>
                <small>{items.length}</small>
              </header>
              {items.map((item: any, n: number) => (
                <details key={item.id || n} open={selectedPath?.startsWith(`${path}.${n}.`) || items.length === 1}>
                  <summary>
                    {String(item.title || item.name || item.question || item.text || `Item ${n + 1}`).slice(0, 50)}
                  </summary>
                  <div className="visual-studio-array-actions">
                    <button
                      type="button"
                      disabled={readOnly || n === 0}
                      onClick={() => {
                        const next = [...items];
                        [next[n - 1], next[n]] = [next[n], next[n - 1]];
                        onChange(path, next);
                      }}
                      aria-label={`Move item ${n + 1} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={readOnly || n === items.length - 1}
                      onClick={() => {
                        const next = [...items];
                        [next[n + 1], next[n]] = [next[n], next[n + 1]];
                        onChange(path, next);
                      }}
                      aria-label={`Move item ${n + 1} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={readOnly || (!!field.minRows && items.length <= field.minRows)}
                      onClick={() =>
                        onChange(
                          path,
                          items.filter((_: any, i: number) => i !== n),
                        )
                      }
                    >
                      Remove item
                    </button>
                  </div>
                  <StudioProperties
                    fields={field.fields || []}
                    data={item}
                    root={root}
                    prefix={`${path}.${n}`}
                    selectedPath={selectedPath}
                    disabled={readOnly}
                    onChange={onChange}
                  />
                </details>
              ))}
              <button
                type="button"
                className="visual-studio-add"
                disabled={readOnly || (!!field.maxRows && items.length >= field.maxRows)}
                onClick={() =>
                  onChange(path, [...items, { id: crypto.randomUUID(), ...defaultValues(field.fields || []) }])
                }
              >
                + Add {field.label || "item"}
              </button>
            </div>
          );
        }
        if (!field.name) return null;
        const strategy = FieldStrategyRegistry.get(field.type);
        return (
          <div className="visual-studio-property" key={path} data-studio-property={path}>
            {strategy ? (
              strategy({
                field,
                value: data[field.name],
                onChange: (value) => onChange(path, value),
                disabled: readOnly,
                formData: root,
                siblingData: data,
              })
            ) : (
              <FieldRenderer
                field={field}
                value={data[field.name]}
                onChange={(value) => onChange(path, value)}
                disabled={readOnly}
                formData={root}
                siblingData={data}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function defaultValues(fields: any[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of fields) {
    if (!field.name) continue;
    if (field.defaultValue !== undefined) result[field.name] = structuredClone(field.defaultValue);
    else if (field.type === "group") result[field.name] = defaultValues(field.fields || []);
    else if (field.type === "array" || field.type === "blocks") result[field.name] = [];
  }
  return result;
}
