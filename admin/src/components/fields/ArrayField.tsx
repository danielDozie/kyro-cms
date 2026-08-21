import "../../lib/i18n";
import React from "react";
import { Plus, ChevronDown, ChevronUp, X, GripVertical } from "../ui/icons";
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

interface ArrayFieldItem {
  id?: string;
  [key: string]: unknown;
}

interface ArrayFieldProps {
  items?: ArrayFieldItem[];
  labelField?: string;
  onChange: (items: ArrayFieldItem[]) => void;
  compact?: boolean;
}

interface SortableArrayFieldItemProps {
  id: string;
  index: number;
  isOpen: boolean;
  setOpenIndex: (index: number | null) => void;
  item: Record<string, unknown>;
  labelField: string;
  itemKeys: string[];
  inputClass: string;
  handleItemChange: (index: number, field: string, value: string) => void;
  handleRemove: (index: number) => void;
  compact: boolean;
}

function SortableArrayFieldItem({
  id,
  index,
  isOpen,
  setOpenIndex,
  item,
  labelField,
  itemKeys,
  inputClass,
  handleItemChange,
  handleRemove,
  compact,
}: SortableArrayFieldItemProps) {
    const { t } = useTranslation();
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

  const itemLabel =
    String(item[labelField] || item.title || item.name || `Item ${index + 1}`);

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`border border-[var(--kyro-border)] rounded-lg overflow-hidden group bg-[var(--kyro-surface)] ${
          isDragging ? "border-[var(--kyro-primary)] shadow-md" : ""
        }`}
      >
        <div className="w-full flex items-center justify-between p-2.5 bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-sidebar-active)]/10 transition-colors">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              {...attributes}
              {...listeners}
              className="p-0.5 cursor-grab active:cursor-grabbing text-[var(--kyro-text-muted)] hover:bg-[var(--kyro-border)] rounded flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <span
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="text-sm font-medium text-[var(--kyro-text-primary)] truncate cursor-pointer flex-1 py-1 text-left"
            >
              {itemLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(index);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--kyro-danger-bg)] rounded text-[var(--kyro-error)] transition-opacity"
              title={t("tooltips.remove", { defaultValue: "Remove" })}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded"
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
          <div className="p-2.5 bg-[var(--kyro-surface)] space-y-2">
            {itemKeys.length > 0 ? (
              itemKeys.map((key) => (
                <input
                  key={key}
                  type="text"
                  value={String(item[key] || "")}
                  onChange={(e) =>
                    handleItemChange(index, key, e.target.value)
                  }
                  onClick={(e) => e.stopPropagation()}
                  className={inputClass}
                  placeholder={key}
                />
              ))
            ) : (
              <input
                type="text"
                value={String(item.value || "")}
                onChange={(e) =>
                  handleItemChange(index, "value", e.target.value)
                }
                onClick={(e) => e.stopPropagation()}
                className={inputClass}
                placeholder={t("fields.value", { defaultValue: "Value..." })}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-[var(--kyro-border)] rounded-lg overflow-hidden group bg-[var(--kyro-surface)] ${
        isDragging ? "border-[var(--kyro-primary)] shadow-md" : ""
      }`}
    >
      <div className="w-full flex items-center justify-between p-3 bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-sidebar-active)]/10 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing text-[var(--kyro-text-muted)] hover:bg-[var(--kyro-border)] rounded flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span
            onClick={() => setOpenIndex(isOpen ? null : index)}
            className="text-sm font-medium text-[var(--kyro-text-primary)] truncate cursor-pointer flex-1 py-1 text-left"
          >
            {itemLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(index);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[var(--kyro-danger-bg)] rounded text-[var(--kyro-error)] transition-opacity"
            title={t("tooltips.remove", { defaultValue: "Remove" })}
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : index)}
            className="p-1 hover:bg-[var(--kyro-surface-accent)] rounded"
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
        <div className="p-3 bg-[var(--kyro-surface)] space-y-2">
          {itemKeys.length > 0 ? (
            itemKeys.map((key) => (
              <input
                key={key}
                type="text"
                value={String(item[key] || "")}
                onChange={(e) =>
                  handleItemChange(index, key, e.target.value)
                }
                className={inputClass}
                placeholder={key}
              />
            ))
          ) : (
            <input
              type="text"
              value={String(item.value || "")}
              onChange={(e) =>
                handleItemChange(index, "value", e.target.value)
              }
              className={inputClass}
              placeholder={t("fields.value", { defaultValue: "Value..." })}
            />
          )}
        </div>
      )}
    </div>
  );
}

export const ArrayField: React.FC<ArrayFieldProps> = ({
  items = [],
  labelField = "title",
  onChange,
  compact = false,
}) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

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

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
    if (openIndex === index) setOpenIndex(null);
    else if (openIndex !== null && openIndex > index)
      setOpenIndex(openIndex - 1);
  };

  const handleAdd = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newItem: ArrayFieldItem = {
      id: newId,
      [labelField]: `Item ${items.length + 1}`,
    };
    onChange([...items, newItem]);
    setOpenIndex(items.length);
  };

  const inputClass = compact
    ? "w-full px-2.5 py-1.5 border border-[var(--kyro-border)] rounded bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
    : "w-full px-3 py-2.5 border border-[var(--kyro-border)] rounded-lg bg-[var(--kyro-bg-secondary)] text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent";

  const itemKeys =
    items.length > 0
      ? Object.keys(items[0]).filter((k) => k !== "id" && k !== "_key")
      : [];

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
    return items.map((item) => item?.id || item?._key || "");
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        {items.length === 0 ? (
          <div className={compact 
            ? "text-center py-4 text-[var(--kyro-text-muted)] text-sm border border-dashed border-[var(--kyro-border)] rounded-md"
            : "text-center py-4 text-[var(--kyro-text-muted)] text-sm border border-dashed border-[var(--kyro-border)] rounded-lg"
          }>
            No items. Click "Add Item" to create one.
          </div>
        ) : (
          <SortableContext
            items={itemIds as any}
            strategy={verticalListSortingStrategy}
          >
            <div className={compact ? "space-y-1" : "space-y-2"}>
              {items.map((item, index) => (
                <SortableArrayFieldItem
                  key={(item as any).id || (item as any)._key || index}
                  id={(item as any).id || (item as any)._key || `idx-${index}`}
                  index={index}
                  isOpen={openIndex === index}
                  setOpenIndex={setOpenIndex}
                  item={item as Record<string, unknown>}
                  labelField={labelField}
                  itemKeys={itemKeys}
                  inputClass={inputClass}
                  handleItemChange={handleItemChange}
                  handleRemove={handleRemove}
                  compact={compact}
                />
              ))}
            </div>
          </SortableContext>
        )}
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:border-[var(--kyro-sidebar-active)] hover:text-[var(--kyro-text-primary)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>
    </DndContext>
  );
};

export default ArrayField;
