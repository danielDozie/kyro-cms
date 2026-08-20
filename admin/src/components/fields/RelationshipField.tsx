import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Search, X, ChevronDown, Loader2, GripVertical } from "../ui/icons";
import { apiGet, buildSearchQuery } from "../../lib/api";
import { useClickOutside } from "../../hooks/useClickOutside";
import { EmptyState } from "../ui/EmptyState";
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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";

interface RelationshipFieldProps {
  field: {
    name: string;
    label?: string;
    relationTo: string | string[];
    hasMany?: boolean;
    required?: boolean;
    admin?: {
      description?: string;
      readOnly?: boolean;
      placeholder?: string;
    };
  };
  value?: unknown;
  onChange?: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

interface ResolvedDoc {
  id: string;
  relationTo?: string;
  [key: string]: unknown;
}

function getLabel(opt: Record<string, unknown>): string {
  const tabs = opt?.tabs as Record<string, unknown> | undefined;

  return (
    (opt?.title as string) ||
    (tabs?.title as string) ||
    (opt?.name as string) ||
    (opt?.label as string) ||
    (opt?.email as string) ||
    (opt?.filename as string) ||
    (opt?.slug as string) ||
    "Untitled"
  );
}

interface SortableTagProps {
  id: string;
  label: string;
  relation?: string | null;
  onRemove: () => void;
  disabled?: boolean;
}

function SortableTag({ id, label, relation, onRemove, disabled }: SortableTagProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--kyro-sidebar-active)]/10 text-[var(--kyro-sidebar-active)] border border-transparent ${
        isDragging ? "border-[var(--kyro-primary)] shadow-sm bg-[var(--kyro-sidebar-active)]/20" : ""
      }`}
    >
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing hover:bg-[var(--kyro-sidebar-active)]/20 rounded p-0.5 text-[var(--kyro-sidebar-active)] opacity-70 flex items-center justify-center"
        >
          <GripVertical className="w-2.5 h-2.5" />
        </div>
      )}
      {relation && <span className="opacity-60 mr-0.5">{relation}:</span>}
      {label}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-70 p-0.5 ml-0.5 flex items-center justify-center"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export function RelationshipField({
  field,
  value,
  onChange,
  error,
  disabled,
}: RelationshipFieldProps) {
    const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ResolvedDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<ResolvedDoc[]>([]);
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef<(value: unknown) => void>(() => {});
  onChangeRef.current = onChange || (() => {});

  const isMultiple = field.hasMany;
  const relationTo = Array.isArray(field.relationTo)
    ? field.relationTo
    : [field.relationTo];
  const isPolymorphic = relationTo.length > 1;
  const [activeRelation, setActiveRelation] = useState(relationTo[0] || "");

  const extractIds = useCallback((): string[] => {
    if (!value) return [];
    const items = isMultiple
      ? Array.isArray(value) ? value : []
      : value ? [value] : [];
    return items.map((item) => {
      if (typeof item === "object" && item !== null) {
        return (item as { value?: string }).value || (item as { id?: string }).id || "";
      }
      return String(item);
    }).filter(Boolean);
  }, [value, isMultiple]);

  const fetchSelectedDocs = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    ids.forEach((id) => {
      if (fetchedIdsRef.current.has(id)) return;
      fetchedIdsRef.current.add(id);
      const rel = isPolymorphic
        ? (() => {
            if (!value) return activeRelation;
            const items = isMultiple
              ? Array.isArray(value) ? value : []
              : [value];
            const match = items.find((item) => {
              if (typeof item === "object" && item !== null) {
                return (item as { value?: string }).value === id || (item as { id?: string }).id === id;
              }
              return false;
            });
            return match && typeof match === "object" ? (match as { relationTo?: string }).relationTo || activeRelation : activeRelation;
          })()
        : activeRelation;
      apiGet<Record<string, unknown>>(`/api/${rel}/${id}`)
        .then((response) => {
          const doc = (response as any).data || response;
          if (!doc || typeof doc !== "object") return;

          setSelectedDocs((prev) => {
            if (prev.some((d) => d.id === id)) return prev;
            return [...prev, { ...doc, id: String((doc as any).id), relationTo: rel }];
          });
        })
        .catch(() => {});
    });
  }, [isPolymorphic, value, activeRelation, isMultiple]);

  useEffect(() => {
    const ids = extractIds();
    fetchSelectedDocs(ids);
  }, [extractIds, fetchSelectedDocs]);

  const fetchOptions = useCallback(
    (query: string = "") => {
      setLoading(true);
      const searchFields = ["title", "name", "label", "email", "slug", "filename"];
      const url = `/api/${activeRelation}?${buildSearchQuery(query, searchFields)}`;

      apiGet<{ docs?: Record<string, unknown>[]; data?: Record<string, unknown>[] }>(url)
        .then((data) => {
          const rawDocs = data.docs || data.data || [];
          const newDocs: ResolvedDoc[] = rawDocs.map((d) => ({
            ...d,
            id: String(d.id),
          }));
          setOptions(newDocs);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    },
    [activeRelation]
  );

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchOptions(search);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, search, activeRelation, fetchOptions]);

  const filteredOptions = useMemo(() => {
    if (!search || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((opt) => {
      const lbl = getLabel(opt).toLowerCase();
      const id = String(opt.id || "").toLowerCase();
      const slug = String(opt.slug || "").toLowerCase();
      return lbl.includes(q) || id.includes(q) || slug.includes(q);
    });
  }, [options, search]);

  useClickOutside(containerRef, () => {
    if (isOpen) setIsOpen(false);
  });

  const getValueId = (val: unknown): string => {
    if (typeof val === "object" && val !== null) {
      const inner = (val as { value?: unknown }).value ?? (val as { id?: unknown }).id;
      // Recursively unwrap in case of doubly-nested {relationTo, value: {relationTo, value: id}}
      if (inner !== undefined && inner !== null) return getValueId(inner);
      return "";
    }
    return String(val);
  };

  const isSelected = (opt: Record<string, unknown>): boolean => {
    const optId = opt.id;
    if (!value) return false;
    if (isMultiple && Array.isArray(value)) {
      return value.some((v) => getValueId(v) === optId);
    }
    return getValueId(value) === optId;
  };

  const handleSelect = (opt: Record<string, unknown>) => {
    const optId = opt.id;
    if (isMultiple) {
      const current: unknown[] = Array.isArray(value) ? value : [];
      if (isSelected(opt)) {
        onChangeRef.current?.(current.filter((v) => getValueId(v) !== optId));
      } else {
        const newItem = isPolymorphic
          ? { relationTo: activeRelation, value: optId }
          : optId;
        onChangeRef.current?.([...current, newItem]);
      }
    } else {
      if (isSelected(opt)) {
        onChangeRef.current?.(null);
      } else {
        const newItem = isPolymorphic
          ? { relationTo: activeRelation, value: optId }
          : optId;
        onChangeRef.current?.(newItem);
        setIsOpen(false);
        setSearch("");
      }
    }
  };

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

    const items: unknown[] = isMultiple
      ? Array.isArray(value) ? value : []
      : [];

    const oldIndex = items.findIndex((item) => getValueId(item) === active.id);
    const newIndex = items.findIndex((item) => getValueId(item) === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = [...items];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);
      onChangeRef.current?.(newItems);
    }
  };

  const renderSelectedItems = () => {
    if (!value) return null;

    const items: unknown[] = isMultiple
      ? Array.isArray(value) ? value : []
      : value ? [value] : [];

    const tagIds = items.map((item) => getValueId(item));

    if (isMultiple && items.length > 1) {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-wrap gap-1.5 mt-2">
            <SortableContext
              items={tagIds}
              strategy={horizontalListSortingStrategy}
            >
              {items.map((item, idx) => {
                const rawId = getValueId(item);
                const doc = selectedDocs.find((d) => d.id === rawId);
                const label = doc ? getLabel(doc) : (rawId ? rawId.slice(0, 12) : "Item");
                const rel = isPolymorphic && doc ? doc.relationTo : null;
                return (
                  <SortableTag
                    key={`${rawId}-${idx}`}
                    id={rawId}
                    label={label}
                    relation={rel}
                    onRemove={() => {
                      const filtered = items.filter((value) => getValueId(value) !== rawId);
                      onChangeRef.current?.(filtered);
                    }}
                    disabled={disabled}
                  />
                );
              })}
            </SortableContext>
          </div>
        </DndContext>
      );
    }

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {items.map((item, idx) => {
          const rawId = getValueId(item);
          const doc = selectedDocs.find((d) => d.id === rawId);
          const label = doc ? getLabel(doc) : (rawId ? rawId.slice(0, 12) : "Item");
          const rel = isPolymorphic && doc ? doc.relationTo : null;
          return (
            <span
              key={`${rawId}-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--kyro-sidebar-active)]/10 text-[var(--kyro-sidebar-active)]"
            >
              {rel && <span className="opacity-60 mr-0.5">{rel}:</span>}
              {label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => {
                    const filtered = items.filter((value) => getValueId(value) !== rawId);
                    onChangeRef.current?.(isMultiple ? filtered : (filtered[0] ?? null));
                  }}
                  className="hover:opacity-70 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      {field.label && (
        <label className="block text-sm font-medium text-[var(--kyro-text-primary)]">
          {field.label}
          {field.required && (
            <span className="text-[var(--kyro-error)] ml-1">*</span>
          )}
        </label>
      )}
      <div ref={containerRef} className="relative">
        {isPolymorphic && (
          <div className="flex gap-1 mb-1.5">
            {relationTo.map((rel) => (
              <button
                key={rel}
                type="button"
                onClick={() => {
                  setActiveRelation(rel);
                  setOptions([]);
                  setSearch("");
                }}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                  activeRelation === rel
                    ? "kyro-btn-primary"
                    : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-border)]"
                }`}
              >
                {rel}
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
              fetchOptions(e.target.value);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={
              field.admin?.placeholder || `Search ${activeRelation}...`
            }
            disabled={
              disabled ||
              (typeof field.admin?.readOnly === "function"
                ? false
                : Boolean(field.admin?.readOnly))
            }
            className="w-full pl-9 pr-10 py-2 border border-[var(--kyro-border)] rounded-md bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent disabled:opacity-50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 className="w-4 h-4 text-[var(--kyro-text-muted)] animate-spin" />
            ) : (
              <ChevronDown
                className={`w-4 h-4 text-[var(--kyro-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            )}
          </div>
        </div>

        {isOpen && (
          <div className="relative z-20 w-full mt-1 border border-[var(--kyro-border)] rounded-lg shadow-lg bg-[var(--kyro-surface)] max-h-64 overflow-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-[var(--kyro-text-muted)]">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <EmptyState title={t("tooltips.noResultsFound", { defaultValue: "No results found" })} />
            ) : (
              <div className="py-1">
                {filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--kyro-surface-accent)] transition-colors ${
                      isSelected(opt)
                        ? "bg-[var(--kyro-sidebar-active)]/10 text-[var(--kyro-sidebar-active)]"
                        : "text-[var(--kyro-text-primary)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{getLabel(opt)}</span>
                      {isSelected(opt) && (
                        <span className="text-[var(--kyro-sidebar-active)]">
                          ✓
                        </span>
                      )}
                    </div>
                    {"slug" in opt && typeof opt.slug === "string" && (
                      <div className="text-xs text-[var(--kyro-text-muted)]">
                        {opt.slug}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {renderSelectedItems()}
      </div>
      {field.admin?.description && !error && (
        <p className="text-xs text-[var(--kyro-text-muted)]">
          {field.admin.description}
        </p>
      )}
      {error && <p className="text-xs text-[var(--kyro-error)]">{error}</p>}
    </div>
  );
}

export default RelationshipField;
