import React from "react";
import type { Field } from "@kyro-cms/core/client";
import RelationshipField from "./RelationshipField";
import { ChevronDown, ChevronUp, GripVertical } from "../ui/icons";
import { apiGet } from "../../lib/api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";

const SIMPLE_TYPES = new Set(["text", "number", "checkbox", "select", "radio", "color", "email", "password", "url", "id"]);

function extractLabelFromObj(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const tabs = o.tabs as Record<string, unknown> | undefined;
  const label =
    (o.title as string) ||
    (tabs?.title as string) ||
    (o.name as string) ||
    (o.label as string) ||
    (o.email as string) ||
    (o.filename as string) ||
    (o.slug as string);
  if (label && typeof label === "string") return label;
  if (o.value && typeof o.value === "object") return extractLabelFromObj(o.value);
  if (o.doc && typeof o.doc === "object") return extractLabelFromObj(o.doc);
  return null;
}

function getFallbackLabel(field: Field, index: number): string {
  const rawLabel = field.label || field.name || "Item";
  if (/item$/i.test(rawLabel.trim())) {
    return `${rawLabel} ${index + 1}`;
  }
  return `${rawLabel} Item ${index + 1}`;
}

interface ArrayLayoutProps {
  field: Field;
  value: unknown[];
  onChange: (value: unknown[]) => void;
  renderField: (
    field: Field,
    parentData: Record<string, unknown>,
    onChange: (value: Record<string, unknown>) => void,
  ) => React.ReactNode;
  disabled?: boolean;
}

function isCompactArray(field: Field): boolean {
  const subFields = (field as Field & { fields?: Field[] }).fields || [];
  if (subFields.length === 0 || subFields.length > 4) return false;
  return subFields.every((f: Field) => SIMPLE_TYPES.has(f.type));
}

// Sortable item wrapper
interface SortableArrayItemProps {
  id: string;
  index: number;
  isOpen: boolean;
  setOpenIndex: (index: number | null) => void;
  item: Record<string, unknown>;
  field: Field;
  renderField: (
    field: Field,
    parentData: Record<string, unknown>,
    onChange: (value: Record<string, unknown>) => void,
  ) => React.ReactNode;
  onChangeItem: (newItem: Record<string, unknown>) => void;
  onRemove: () => void;
  disabled?: boolean;
  compact: boolean;
  getItemLabel: (item: Record<string, unknown>) => string;
}

function SortableArrayItem({
  id,
  index,
  isOpen,
  setOpenIndex,
  item,
  field,
  renderField,
  onChangeItem,
  onRemove,
  disabled,
  compact,
  getItemLabel,
}: SortableArrayItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fields = (field as Field & { fields?: Field[] }).fields || [];

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-start gap-3 p-3.5 mb-2 border border-[var(--kyro-border)] rounded-[var(--kyro-radius-md)] bg-[var(--kyro-surface-accent)]/15 hover:border-[var(--kyro-border-accent)] transition-all group/item shadow-xs"
      >
        <div
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-[var(--kyro-text-muted)] hover:bg-[var(--kyro-surface-accent)] rounded flex-shrink-0 mt-1"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-bold text-[var(--kyro-text-muted)] pt-2.5 min-w-[18px] text-center">
          {index + 1}
        </span>
        <div className={`flex-1 min-w-0 ${fields.length >= 3 ? "flex flex-col gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}`}>
          {fields.map((f: Field) => (
            <div key={f.name} className="min-w-0">
              {renderField(f, item, onChangeItem)}
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="text-[var(--kyro-text-muted)] hover:text-[var(--kyro-error)] transition-colors disabled:opacity-30 p-1 mt-1.5 flex-shrink-0 rounded hover:bg-[var(--kyro-surface-accent)]"
          title={t("tooltips.remove", { defaultValue: "Remove" })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-[var(--kyro-border)] rounded-[var(--kyro-radius-md)] bg-[var(--kyro-surface-accent)]/10 overflow-hidden`}
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--kyro-surface-accent)]/20 border-b border-[var(--kyro-border)]">
        <div
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-[var(--kyro-text-muted)] hover:bg-[var(--kyro-surface-accent)] rounded flex-shrink-0"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        
        <span className="text-xs font-bold text-[var(--kyro-text-muted)] min-w-[18px]">
          {index + 1}
        </span>
        
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-[var(--kyro-text-primary)] truncate block">
            {getItemLabel(item) || getFallbackLabel(field, index)}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="text-[var(--kyro-text-muted)] hover:text-[var(--kyro-error)] transition-colors disabled:opacity-30 p-1 rounded hover:bg-[var(--kyro-surface-accent)]"
            title={t("tooltips.remove", { defaultValue: "Remove" })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : index)}
            className="p-1 rounded hover:bg-[var(--kyro-surface-accent)] transition-colors"
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-[var(--kyro-text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--kyro-text-muted)]" />
            )}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="p-4 bg-[var(--kyro-surface)] space-y-4">
          {fields.map((f: Field) =>
            renderField(f, item, onChangeItem),
          )}
        </div>
      )}
    </div>
  );
}

export function ArrayLayout({
  field,
  value,
  onChange,
  renderField,
  disabled,
}: ArrayLayoutProps) {
  const items = (Array.isArray(value) ? value : []) as Record<string, unknown>[];
  const fields = (field as Field & { fields?: { name?: string; type?: string; relationTo?: string | string[]; label?: string }[] }).fields || [];
  const firstField = fields[0];
  const labelField = firstField?.name || "user";
  const isRelationship = firstField?.type === "relationship";
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  const [relLabels, setRelLabels] = React.useState<Record<string, string>>({});
  const fetchedRelIds = React.useRef<Set<string>>(new Set());

  // Sync stable IDs and heal bad data
  React.useEffect(() => {
    let needsUpdate = false;
    const updated = items
      .filter((item) => {
        if (typeof item !== "object" || item === null) {
          needsUpdate = true;
          return false;
        }
        return true;
      })
      .map((item) => {
        if (!item.id && !item._key) {
          needsUpdate = true;
          return {
            ...item,
            id: Math.random().toString(36).substr(2, 9),
          };
        }
        return item;
      });
    if (needsUpdate) {
      onChange(updated);
    }
  }, [value, onChange]);

  React.useEffect(() => {
    const fieldsTyped = (field as Field & { fields?: Field[] }).fields || [];
    items.forEach((item) => {
      if (!item || typeof item !== "object") return;
      fieldsTyped.forEach((f) => {
        if (f.type === "relationship" && f.name) {
          const val = item[f.name];
          if (!val) return;

          let id = "";
          let rel = Array.isArray(f.relationTo) ? f.relationTo[0] : f.relationTo;

          if (typeof val === "string") {
            id = val;
          } else if (typeof val === "object" && val !== null) {
            const vObj = val as Record<string, unknown>;
            if (vObj.relationTo && typeof vObj.relationTo === "string") {
              rel = vObj.relationTo;
            }
            if (vObj.id && typeof vObj.id === "string") {
              id = vObj.id;
            } else if (vObj.value && typeof vObj.value === "string") {
              id = vObj.value;
            }
          }

          if (id && rel && !fetchedRelIds.current.has(id)) {
            fetchedRelIds.current.add(id);
            apiGet<Record<string, unknown>>(`/api/${rel}/${id}`)
              .then((res) => {
                const doc = (res as any)?.data || res;
                const label = extractLabelFromObj(doc);
                if (label) {
                  setRelLabels((prev) => ({ ...prev, [id]: label }));
                }
              })
              .catch(() => {});
          }
        }
      });
    });
  }, [items, field]);

  function getItemLabel(item: Record<string, unknown>): string {
    for (const key of ["label", "title", "name", "externalUrl", "url"]) {
      const val = item[key];
      if (val && typeof val === "string" && val.trim() !== "") return val;
    }

    const fieldsTyped = (field as Field & { fields?: Field[] }).fields || [];
    const DISCRIMINATOR_NAMES = new Set(["linkType", "type", "blockType", "kind", "mode"]);

    for (const f of fieldsTyped) {
      if (!f.name) continue;
      const val = item[f.name];
      if (!val) continue;

      if (f.type === "text" || f.type === "textarea") {
        if (typeof val === "string" && val.trim() !== "") return val;
      }

      if (f.type === "select" && !DISCRIMINATOR_NAMES.has(f.name)) {
        if (typeof val === "string" && val.trim() !== "") return val;
      }

      if (f.type === "relationship") {
        const directLabel = extractLabelFromObj(val);
        if (directLabel) return directLabel;

        let id = "";
        if (typeof val === "string") {
          id = val;
        } else if (typeof val === "object" && val !== null) {
          const vObj = val as Record<string, unknown>;
          if (vObj.id && typeof vObj.id === "string") id = vObj.id;
          else if (vObj.value && typeof vObj.value === "string") id = vObj.value;
        }
        if (id && relLabels[id]) {
          return relLabels[id];
        }
      }

      if (f.type === "group" && (f as Field & { fields?: Field[] }).fields) {
        const groupObj = val as Record<string, unknown> | undefined;
        if (groupObj && typeof groupObj === "object") {
          for (const inner of (f as Field & { fields?: Field[] }).fields || []) {
            if (!inner.name) continue;
            const innerVal = groupObj[inner.name];
            if (inner.type === "text" || inner.type === "textarea") {
              if (typeof innerVal === "string" && innerVal.trim() !== "") return innerVal;
            }
            if (inner.type === "select" && !DISCRIMINATOR_NAMES.has(inner.name)) {
              if (typeof innerVal === "string" && innerVal.trim() !== "") return innerVal;
            }
            if (inner.type === "relationship") {
              const directLabel = extractLabelFromObj(innerVal);
              if (directLabel) return directLabel;
              let id = "";
              if (typeof innerVal === "string") id = innerVal;
              else if (typeof innerVal === "object" && innerVal !== null) {
                const vObj = innerVal as Record<string, unknown>;
                if (vObj.id && typeof vObj.id === "string") id = vObj.id;
                else if (vObj.value && typeof vObj.value === "string") id = vObj.value;
              }
              if (id && relLabels[id]) return relLabels[id];
            }
          }
        }
      }
    }

    return "";
  }

  const compact = isCompactArray(field);

  // dnd-kit sensors setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => (item.id || item._key) === active.id);
    const newIndex = items.findIndex((item) => (item.id || item._key) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = [...items];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);
      onChange(newItems);
    }
  };

  const itemIds = React.useMemo(() => {
    return items.map((item) => (item?.id || item?._key || "") as string);
  }, [items]);

  if (isRelationship) {
    return (
      <div className="kyro-form-field">
        <label className="kyro-form-label">{field.label || field.name}</label>
        <RelationshipField
          field={{
            name: labelField,
            relationTo: (field as Field & { fields?: { relationTo?: string }[] }).fields?.[0]?.relationTo || "",
            hasMany: true,
            // Omit the inner field's label to avoid duplicate labels in the UI
            label: undefined,
          }}
          value={(items as Record<string, unknown>[]).map((i) => i[labelField]).filter(Boolean)}
          onChange={(newValue) => {
            const newItems = ((newValue as string[]) || []).map((id: string) => ({
              [labelField]: id,
              id: Math.random().toString(36).substr(2, 9),
            }));
            onChange(newItems);
          }}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="kyro-form-field">
      <label className="kyro-form-label">{field.label || field.name}</label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {compact ? (
          <div className="kyro-form-array kyro-form-array--compact border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/10 rounded-lg p-3">
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              {(items as Record<string, unknown>[]).map((item, index) => (
                <SortableArrayItem
                  key={item.id as string || item._key as string || index}
                  id={item.id as string || item._key as string || `idx-${index}`}
                  index={index}
                  isOpen={false}
                  setOpenIndex={() => {}}
                  item={item}
                  field={field}
                  renderField={renderField}
                  onChangeItem={(newItem) => {
                    const newItems = [...items];
                    newItems[index] = newItem;
                    onChange(newItems);
                  }}
                  onRemove={() => onChange(items.filter((_: unknown, i: number) => i !== index))}
                  disabled={disabled}
                  compact={true}
                  getItemLabel={getItemLabel}
                />
              ))}
            </SortableContext>
            <button
              type="button"
              className="w-full py-2.5 border border-dashed border-[var(--kyro-border)] rounded-md text-xs font-bold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)] hover:border-[var(--kyro-primary)] bg-[var(--kyro-surface)]/50 transition-all disabled:opacity-50 mt-1"
              disabled={disabled}
              onClick={() => onChange([...items, { id: Math.random().toString(36).substr(2, 9) }])}
            >
              + Add Item
            </button>
          </div>
        ) : (
          <div className="kyro-form-array border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/30 rounded-md p-3 space-y-4">
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {(items as Record<string, unknown>[]).map((item, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <SortableArrayItem
                      key={item.id as string || item._key as string || index}
                      id={item.id as string || item._key as string || `idx-${index}`}
                      index={index}
                      isOpen={isOpen}
                      setOpenIndex={setOpenIndex}
                      item={item}
                      field={field}
                      renderField={renderField}
                      onChangeItem={(newItem) => {
                        const newItems = [...items];
                        newItems[index] = newItem;
                        onChange(newItems);
                      }}
                      onRemove={() => onChange(items.filter((_: unknown, i: number) => i !== index))}
                      disabled={disabled}
                      compact={false}
                      getItemLabel={getItemLabel}
                    />
                  );
                })}
              </div>
            </SortableContext>
            <button
              type="button"
              className="w-full py-3 border-2 border-dashed border-[var(--kyro-border)] rounded-lg text-xs font-bold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)] hover:border-[var(--kyro-primary)] transition-all disabled:opacity-50"
              disabled={disabled}
              onClick={() => {
                const newId = Math.random().toString(36).substr(2, 9);
                onChange([...items, { id: newId }]);
                setOpenIndex(items.length);
              }}
            >
              + Add Item
            </button>
          </div>
        )}
      </DndContext>
    </div>
  );
}
