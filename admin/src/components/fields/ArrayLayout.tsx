import "../../lib/i18n";
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

function extractLabelFromObj(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const tabs = o.tabs as Record<string, unknown> | undefined;
  const label =
    (o.title as string) ||
    (tabs?.title as string) ||
    (o.name as string) ||
    (o.label as string) ||
    (o.fieldName as string) ||
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
  // Collapsible accordion is the standard default behavior.
  // Compact inline rendering is only used if explicitly opted-in via admin: { compact: true }.
  const admin = (field as any).admin;
  return admin?.compact === true;
}

// Sortable item wrapper
interface SortableArrayItemProps {
  id: string;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
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
  onToggle,
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

  const label = getItemLabel(item) || getFallbackLabel(field, index);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-surface)] overflow-hidden shadow-xs transition-all ${isOpen ? " " : "hover:border-[var(--kyro-border-accent)]"
        }`}
    >
      <div
        onClick={onToggle}
        className={`flex items-center gap-2 px-3.5 py-2.5 bg-[var(--kyro-bg-secondary)]/50 cursor-pointer select-none transition-colors hover:bg-[var(--kyro-surface-accent)]/30 ${isOpen ? "border-b border-[var(--kyro-border)]" : ""
          }`}
      >
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="p-1 cursor-grab active:cursor-grabbing text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] rounded flex-shrink-0"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <span className="text-[11px] font-bold text-[var(--kyro-text-muted)] min-w-[18px]">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0 pr-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--kyro-text-primary)] truncate">
            {label}
          </span>
          {item.quantity !== undefined && item.quantity !== null && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] border border-[var(--kyro-border)] shrink-0">
              × {String(item.quantity)}
            </span>
          )}
          {(item.total !== undefined || item.price !== undefined || item.unitPrice !== undefined) && (
            <span className="text-[11px] font-medium text-[var(--kyro-text-muted)] shrink-0">
              ${Number(item.total ?? item.price ?? item.unitPrice).toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-[var(--kyro-text-muted)] hover:text-[var(--kyro-error)] transition-colors disabled:opacity-30 p-1 rounded hover:bg-[var(--kyro-surface-accent)]"
            title={t("tooltips.remove", { defaultValue: "Remove" })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] rounded hover:bg-[var(--kyro-surface-accent)] transition-colors"
            title={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
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
  const isRelationship = firstField?.type === "relationship" && fields.length === 1;

  // By default, all items start collapsed unless initCollapsed: false
  const [openIndices, setOpenIndices] = React.useState<Set<number>>(() => {
    if ((field as any).admin?.initCollapsed === false) {
      return new Set([0]);
    }
    return new Set();
  });

  const [relLabels, setRelLabels] = React.useState<Record<string, string>>({});
  const fetchedRelIds = React.useRef<Set<string>>(new Set());

  const toggleItemOpen = React.useCallback((index: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const expandAll = React.useCallback(() => {
    setOpenIndices(new Set(items.map((_, idx) => idx)));
  }, [items]);

  const collapseAll = React.useCallback(() => {
    setOpenIndices(new Set());
  }, []);

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
  }, [items, onChange]);

  // Fetch relationship labels
  React.useEffect(() => {
    const fieldsTyped = (field as Field & { fields?: Field[] }).fields || [];
    const relFields = fieldsTyped.filter((f) => f.type === "relationship");

    items.forEach((item) => {
      relFields.forEach((f) => {
        if (!f.name || !f.relationTo) return;
        const val = item[f.name];
        if (val) {
          let id = "";
          let rel = Array.isArray(f.relationTo) ? f.relationTo[0] : f.relationTo;

          if (typeof val === "string") {
            id = val;
          } else if (typeof val === "object" && val !== null) {
            const vObj = val as Record<string, unknown>;
            if (vObj.relationTo && typeof vObj.relationTo === "string") {
              rel = vObj.relationTo;
            }
            const rawId = vObj.id ?? vObj.value ?? vObj._id;
            if (typeof rawId === "object" && rawId !== null) {
              id = (rawId as any)._id ? String((rawId as any)._id) : (rawId as any).id ? String((rawId as any).id) : "";
            } else if (rawId) {
              id = String(rawId);
            }
          }

          if (id && id !== "[object Object]" && rel && !fetchedRelIds.current.has(id)) {
            fetchedRelIds.current.add(id);
            apiGet<Record<string, unknown>>(`/api/${rel}/${encodeURIComponent(id)}`)
              .then((res) => {
                const doc = (res as any)?.data || res;
                const label = extractLabelFromObj(doc);
                if (label) {
                  setRelLabels((prev) => ({ ...prev, [id!]: label }));
                }
              })
              .catch(() => { });
          }
        }
      });
    });
  }, [items, field]);

  function getItemLabel(item: Record<string, unknown>): string {
    const rawLabel =
      (item.fieldName as string) ||
      (item.label as string) ||
      (item.title as string) ||
      (item.name as string) ||
      (item.externalUrl as string) ||
      (item.url as string);

    if (rawLabel && typeof rawLabel === "string" && rawLabel.trim() !== "") {
      const typeBadge = item.inputType || item.type;
      return typeBadge && typeof typeBadge === "string"
        ? `${rawLabel} (${typeBadge})`
        : rawLabel;
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

  const isPillsDisplay = (field as any).admin?.display === "pills";
  const allExpanded = items.length > 0 && openIndices.size === items.length;

  return (
    <div className="kyro-form-field">
      {/* Header with Title, Count Badge, and Expand/Collapse All */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <label className="kyro-form-label !mb-0">{field.label || field.name}</label>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] border border-[var(--kyro-border)]">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {!isPillsDisplay && !compact && items.length > 1 && (
          <button
            type="button"
            onClick={allExpanded ? collapseAll : expandAll}
            className="text-[11px] font-medium text-[var(--kyro-text-muted)] hover:text-[var(--kyro-primary)] transition-colors px-2 py-0.5 rounded hover:bg-[var(--kyro-surface-accent)]"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {isPillsDisplay ? (
        <div className="flex flex-wrap gap-2 p-3 bg-[var(--kyro-surface-accent)]/15 border border-[var(--kyro-border)] rounded-lg">
          {items.map((rawItem, idx) => {
            const item = rawItem as Record<string, any>;
            const itemName = String(item.name || item.title || `Item ${idx + 1}`);
            const itemQty = Number(item.quantity ?? 1);
            const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
            const lineTotal = Number(item.total ?? (unitPrice * itemQty));
            return (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--kyro-surface)] border border-[var(--kyro-border)] shadow-xs hover:border-[var(--kyro-border-accent)] transition-colors"
              >
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] text-xs font-bold text-[var(--kyro-text-primary)]">
                  {itemQty}×
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[var(--kyro-text-primary)]">
                    {itemName}
                  </span>
                  {item.options && (
                    <span className="text-[10px] text-[var(--kyro-text-muted)] leading-tight">
                      {String(item.options)}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-[var(--kyro-text-secondary)] ml-1">
                  ${lineTotal.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {compact ? (
            <div className="kyro-form-array kyro-form-array--compact border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/10 rounded-xl p-3">
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
                    onToggle={() => { }}
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
                className="w-full py-2.5 border border-dashed border-[var(--kyro-border)] rounded-lg text-xs font-semibold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)] hover:border-[var(--kyro-primary)] bg-[var(--kyro-surface)]/50 transition-all disabled:opacity-50 mt-1"
                disabled={disabled}
                onClick={() => onChange([...items, { id: Math.random().toString(36).substr(2, 9) }])}
              >
                + Add Item
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <SortableContext
                items={itemIds}
                strategy={verticalListSortingStrategy}
              >
                {(items as Record<string, unknown>[]).map((item, index) => (
                  <SortableArrayItem
                    key={item.id as string || item._key as string || index}
                    id={item.id as string || item._key as string || `idx-${index}`}
                    index={index}
                    isOpen={openIndices.has(index)}
                    onToggle={() => toggleItemOpen(index)}
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
                ))}
              </SortableContext>
              <button
                type="button"
                className="w-full py-2.5 border border-dashed border-[var(--kyro-border)] rounded-lg text-xs font-semibold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-primary)] hover:border-[var(--kyro-primary)] bg-[var(--kyro-surface)]/50 transition-all disabled:opacity-50 mt-1"
                disabled={disabled}
                onClick={() => onChange([...items, { id: Math.random().toString(36).substr(2, 9) }])}
              >
                + Add Item
              </button>
            </div>
          )}
        </DndContext>
      )}
    </div>
  );
}
