import "../lib/i18n";
import { Search, Filter, Columns3, X, Trash2, Archive, ChevronUp, ChevronDown, ChevronRight, Edit2, List, FolderTree, Folder, FileText, CornerDownRight } from "./ui/icons";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Spinner } from "./ui/Spinner";
import { navigate } from "../lib/navigate";
import { Shimmer } from "./ui/Shimmer";
import { Plus } from "./ui/icons";
import { apiGet, apiDelete, withCacheBust } from "../lib/api";
import { buildDocumentTree, type HierarchyNode } from "@kyro-cms/core/client";

import { useAuthStore, toast } from "../lib/stores";
import { useUIStore } from "../lib/stores";
import { adminPath as ADMIN_BASE } from "../lib/paths";
import { PageHeader } from "./ui/PageHeader";
import { Badge } from "./ui/Badge";
import { Pagination } from "./ui/Pagination";
import { useTranslation } from "react-i18next";
import { useIsMounted } from "../hooks/useIsMounted";

import type { CollectionConfig, Field } from "@kyro-cms/core";
import { resolveFieldValue } from "../lib/resolve-field-value";

type FieldConfig = Field;

interface FilterConfig {
  field: string;
  operator:
  | "equals"
  | "contains"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "between"
  | "in";
  value: string;
}

interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

interface ListViewProps {
  collection: CollectionConfig;
  collectionSlug?: string;
  initialDocs?: any[];
  initialTotal?: number;
  onCreate?: () => void;
  onEdit?: (id: string) => void;
  // For legacy Admin.tsx compatibility
  config?: any;
}

import { ClientOnly } from "./ui/ClientOnly";

function ListViewSkeleton() {
  return (
    <div className="surface-tile p-8 space-y-6 rounded-lg animate-pulse">
      <div className="h-10 bg-[var(--kyro-border)] rounded-xl w-1/4 opacity-50" />
      <div className="h-64 bg-[var(--kyro-surface-accent)] rounded-lg opacity-50" />
    </div>
  );
}

function ListViewInner({
  collection,
  collectionSlug: providedSlug,
  initialDocs = [],
  initialTotal = 0,
  onCreate: providedOnCreate,
  onEdit: providedOnEdit,
  config,
}: ListViewProps) {
  const collectionSlug = providedSlug || collection?.slug || "";

  const { t } = useTranslation();
  const { permissions } = useAuthStore();
  const canCreate = permissions?.collections?.[collectionSlug]?.create !== false;
  const canDelete = permissions?.collections?.[collectionSlug]?.delete !== false;
  const canUpdate = permissions?.collections?.[collectionSlug]?.update !== false;

  const handleCreate = () => {
    if (!canCreate) return;
    if (providedOnCreate) {
      providedOnCreate();
    } else {
      const href = `${ADMIN_BASE}/${collectionSlug}/new`;
      navigate(href);
    }
  };

  const handleEdit = (id: string | any) => {
    const cleanId = typeof id === "object" && id !== null ? String(id.id || id._id || id.value || id) : String(id || "");
    if (!cleanId || cleanId === "[object Object]") return;
    if (providedOnEdit) {
      providedOnEdit(cleanId);
    } else {
      const href = `${ADMIN_BASE}/${collectionSlug}/${encodeURIComponent(cleanId)}`;
      navigate(href);
    }
  };

  const [docs, setDocs] = useState<any[]>(initialDocs);
  const [totalDocs, setTotalDocs] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<FilterConfig[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);
  const { confirm, alert } = useUIStore();

  const addFilter = () => {
    setFilters([...filters, { field: "", operator: "equals", value: "" }]);
  };

  const clearAll = () => {
    setSearch("");
    setFilters([]);
    setSort(null);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterConfig>) => {
    setFilters(filters.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };
  const [sort, setSort] = useState<SortConfig | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  function flattenFields(fields: FieldConfig[]): FieldConfig[] {
    const result: FieldConfig[] = [];
    for (const field of fields || []) {
      if (field.hidden === true || field.admin?.hidden || field.name === "id") continue;

      if (field.type === "tabs" && field.tabs) {
        for (const tab of field.tabs) {
          if (tab.fields) {
            result.push(...flattenFields(tab.fields));
          }
        }
      } else if (
        (field.type === "row" || field.type === "collapsible") &&
        field.fields
      ) {
        result.push(...flattenFields(field.fields));
      } else {
        if (!field.name) continue;
        result.push(field);
      }
    }
    return result;
  }

  const allFields = useMemo(
    () => flattenFields(collection.fields),
    [collection.fields],
  );

  const titleField: string | undefined =
    typeof collection.admin?.useAsTitle === "string"
      ? collection.admin.useAsTitle
      : allFields.find((f) => f.type !== "group" && typeof f.name === "string")?.name;

  const isHierarchical = Boolean(
    (collection as any).hierarchy ||
    collection.fields?.some((f: any) => f.name === "parent" || f.hierarchy)
  );

  const [viewMode, setViewMode] = useState<"table" | "tree">(() => {
    return isHierarchical && (collection as any).hierarchy?.defaultView === "tree" ? "tree" : "table";
  });

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleNodeCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const treeData = useMemo(() => {
    if (!isHierarchical) return [];
    return buildDocumentTree(docs, {
      idField: "id",
      parentField: (collection as any).hierarchy?.parentField || "parent",
      labelField: (typeof collection.admin?.useAsTitle === "string" ? collection.admin.useAsTitle : titleField) || "title",
      slugField: "slug",
    });
  }, [docs, isHierarchical, collection, titleField]);

  // Flatten nodes while respecting collapsed state
  const visibleTreeNodes = useMemo(() => {
    if (viewMode !== "tree" || treeData.length === 0) return [];
    
    const result: (HierarchyNode & { isCollapsed?: boolean; hasChildren?: boolean })[] = [];
    function traverse(nodes: HierarchyNode[]) {
      for (const node of nodes) {
        const isCollapsed = collapsedNodes.has(node.id);
        const hasChildren = Boolean(node.children && node.children.length > 0);
        result.push({
          ...node,
          isCollapsed,
          hasChildren,
        });
        if (hasChildren && !isCollapsed) {
          traverse(node.children);
        }
      }
    }
    traverse(treeData);
    return result;
  }, [treeData, viewMode, collapsedNodes]);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    let cols: string[];
    if (collection.admin?.defaultColumns) {
      cols = [...(collection.admin?.defaultColumns as string[] || [])];
    } else {
      cols = allFields.slice(0, 4).map((f) => f.name).filter((n): n is string => !!n);
    }

    if (titleField && cols.includes(titleField)) {
      cols = [titleField, ...cols.filter((c) => c !== titleField)];
    }

    if (!cols.includes("updatedAt")) {
      cols.push("updatedAt");
    }

    return new Set(cols);
  });

  const toggleColumn = useCallback((fieldName: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  }, []);

  function resolveSortField(fieldName: string): string {
    const field = allFields.find((f) => f.name === fieldName);
    if (!field) return fieldName;
    if (field.type === "group" && field.fields?.[0]?.name) {
      return `${fieldName}.${field.fields[0].name}`;
    }
    return fieldName;
  }

  const handleSort = useCallback((fieldName: string) => {
    const resolvedField = resolveSortField(fieldName);
    setSort((prev) => {
      if (prev && prev.field === resolvedField) {
        return {
          field: resolvedField,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { field: resolvedField, direction: "asc" };
    });
  }, []);

  const displayFields = useMemo(
    () => {
      const fields: (FieldConfig & { name: string })[] = [];
      for (const colName of Array.from(visibleColumns)) {
        if (colName === "status") {
          fields.push({
            name: "status",
            type: "select",
            label: "Status",
            options: [
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
            ],
          } as any);
        } else {
          const field = allFields.find((f) => f.name === colName);
          if (field && field.name) {
            fields.push(field as typeof field & { name: string });
          }
        }
      }
      return fields;
    },
    [allFields, visibleColumns],
  );

  function fieldContainsTitle(field: FieldConfig): boolean {
    if (!field.name || !titleField) return false;
    if (field.name === titleField) return true;
    if (field.type === "group" && field.fields?.[0]?.name === titleField)
      return true;
    return false;
  }

  function extractFieldValue(doc: any, field: FieldConfig): any {
    if (!field.name) return null;
    const val = resolveFieldValue(collection.fields as any, doc, field.name);
    return val ?? null;
  }

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        depth: "1",
      });

      const where: Record<string, any> = {};
      if (debouncedSearch && debouncedSearch.trim()) {
        const cleanTerm = debouncedSearch.trim();
        params.append("search", cleanTerm);
        params.append("q", cleanTerm);

        const searchableCols = allFields
          .filter(
            (f) =>
              f.name &&
              (f.type === "text" ||
                f.type === "email" ||
                f.type === "textarea" ||
                f.type === "select" ||
                f.name === titleField)
          )
          .map((f) => f.name)
          .slice(0, 8);

        if (searchableCols.length > 0) {
          where.OR = searchableCols.map((col) => ({ [col]: { contains: cleanTerm } }));
        } else if (titleField) {
          where[titleField] = { contains: cleanTerm };
        }
      }
      if (Object.keys(where).length > 0) {
        params.append("where", JSON.stringify(where));
      }

      if (sort) params.append("sort", sort.field);
      if (sort) params.append("order", sort.direction);
      if (filters.length > 0) {
        params.append("filters", JSON.stringify(filters));
      }

      const result = (await apiGet(
        withCacheBust(`/api/${collectionSlug}?${params}`),
        { autoToast: false },
      ) as { docs?: Record<string, unknown>[]; totalDocs?: number; data?: Record<string, unknown>[]; meta?: { total?: number } });
      setDocs(result.docs || result.data || []);
      setTotalDocs(result.totalDocs ?? result.meta?.total ?? 0);
    } catch (error) {
      console.error("Failed to load docs:", error);
    } finally {
      setLoading(false);
    }
  }, [collectionSlug, page, limit, debouncedSearch, sort, filters]);

  // Sync initialDocs when props change or fetch if empty
  useEffect(() => {
    setDocs(initialDocs);
    setTotalDocs(initialTotal);
    if (initialDocs.length === 0 && initialTotal === 0) {
      fetchDocs();
    }
  }, [collectionSlug, initialDocs, initialTotal]);

  // Subsequent fetches on filter/pagination changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchDocs();
  }, [page, limit, debouncedSearch, sort, filters]);

  const handleSelectAll = () => {
    if (selectedIds.size === docs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(docs.map((d) => d.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = () => {
    confirm({
      title: t("listView.deleteBulkTitle", { defaultValue: "Delete Documents" }),
      message: t("listView.deleteBulkMessage", { defaultValue: "Are you sure you want to delete {{count}} document(s)? This cannot be undone.", count: selectedIds.size }),
      variant: "danger",
      onConfirm: async () => {
        try {
          for (const id of Array.from(selectedIds)) {
            await apiDelete(`/api/${collectionSlug}/${id}`);
          }
          setSelectedIds(new Set());
          fetchDocs();
          toast.success("Documents deleted");
        } catch (error) {
          console.error("Bulk delete failed:", error);
          toast.error("Failed to delete some documents");
        }
      }
    });
  };

  const handleDeleteSingle = (id: string) => {
    confirm({
      title: t("listView.deleteTitle", { defaultValue: "Delete Document" }),
      message: t("listView.deleteMessage", { defaultValue: "Are you sure you want to delete this document? This cannot be undone." }),
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiDelete(`/api/${collectionSlug}/${id}`);
          fetchDocs();
          toast.success("Document deleted");
        } catch (error) {
          console.error("Delete failed:", error);
          toast.error("Failed to delete document");
        }
      }
    });
  };

  const totalPages = Math.ceil(totalDocs / limit);
  const hasActiveFilters = search || filters.length > 0 || sort;

  return (
    <div className="space-y-6">
      <PageHeader
        title={collection.label || collectionSlug}
        description={collection.admin?.description || `Manage your ${collection.label || collectionSlug}`}
        metadata={totalDocs > 0 ? [
          <span key="count" className="text-xs font-bold opacity-60">
            {totalDocs} documents
          </span>
        ] : undefined}
        action={canCreate ? {
          label: t("actions.create", { defaultValue: "Create {{item}}", item: collection.singularLabel || collection.label || collectionSlug }),
          href: providedOnCreate ? undefined : `${ADMIN_BASE}/${collectionSlug}/new`,
          onClick: providedOnCreate ? handleCreate : undefined,
          icon: Plus,
        } : undefined}

      />


      {/* Toolbar */}
      <div className="surface-tile p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center rounded-lg">
        {/* Search */}
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-muted)]" />
          <input
            type="text"
            placeholder={t("listView.searchPlaceholder", { defaultValue: "Search..." })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl text-sm font-medium text-[var(--kyro-text-primary)] placeholder:text-[var(--kyro-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${showFilters || filters.length > 0
              ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]"
              : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
              }`}
          >
            <Filter className="w-4 h-4" />
            {t("listView.filters", { defaultValue: "Filters" })}
            {filters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[var(--kyro-sidebar-text-active)] text-[var(--kyro-sidebar-active)] rounded-full text-xs">
                {filters.length}
              </span>
            )}
          </button>

          {/* Column Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumns(!showColumns)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-all"
            >
              <Columns3 className="w-4 h-4" />
              {t("listView.columns", { defaultValue: "Columns" })}
            </button>
            {showColumns && (
              <div className="absolute right-0 top-full mt-2 w-56 surface-tile border border-[var(--kyro-border)] rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-[var(--kyro-border)]">
                  <span className="text-xs font-bold  tracking-wider text-[var(--kyro-text-secondary)]">
                    {t("listView.toggleColumns", { defaultValue: "Toggle Columns" })}
                  </span>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {allFields.map((field) => {
                    if (!field.name) return null;
                    return (
                      <label
                        key={field.name}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--kyro-surface-accent)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(field.name)}
                          onChange={() => toggleColumn(field.name!)}
                          className="w-4 h-4 rounded border-[var(--kyro-border)] text-[var(--kyro-sidebar-active)] focus:ring-[var(--kyro-sidebar-active)]"
                        />
                        <span className="text-sm font-medium text-[var(--kyro-text-primary)]">
                          {field.label || field.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle for Hierarchical Collections */}
          {isHierarchical && (
            <div className="flex items-center bg-[var(--kyro-bg)] p-0.5 rounded-xl border border-[var(--kyro-border)]">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] shadow-sm"
                    : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "tree"
                    ? "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] shadow-sm"
                    : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                }`}
                title="Hierarchy Tree View"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Tree</span>
              </button>
            </div>
          )}

          {/* Clear All */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 rounded-xl font-bold text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
            >
              {t("listView.clearAll", { defaultValue: "Clear All" })}
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="surface-tile p-4 border-l-4 border-[var(--kyro-sidebar-active)] rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[var(--kyro-text-primary)]">
              {t("listView.advancedFilters", { defaultValue: "Advanced Filters" })}
            </h3>
            <button
              type="button"
              onClick={addFilter}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-[var(--kyro-sidebar-active)] hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              {t("listView.addFilter", { defaultValue: "Add Filter" })}
            </button>
          </div>
          <div className="space-y-3">
            {filters.map((filter, index) => (
              <div key={index} className="flex flex-wrap gap-2 items-center">
                <select
                  value={filter.field}
                  onChange={(e) =>
                    updateFilter(index, { field: e.target.value })
                  }
                  className="px-3 py-2 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg text-sm font-medium text-[var(--kyro-text-primary)]"
                >
                  {allFields.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label || field.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) =>
                    updateFilter(index, {
                      operator: e.target.value as FilterConfig["operator"],
                    })
                  }
                  className="px-3 py-2 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg text-sm font-medium text-[var(--kyro-text-primary)]"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="gt">Greater Than</option>
                  <option value="lt">Less Than</option>
                  <option value="gte">Greater Than or Equal</option>
                  <option value="lte">Less Than or Equal</option>
                  <option value="in">In</option>
                </select>
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) =>
                    updateFilter(index, { value: e.target.value })
                  }
                  placeholder="Value..."
                  className="px-3 py-2 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg text-sm font-medium text-[var(--kyro-text-primary)]"
                />
                <button
                  type="button"
                  onClick={() => removeFilter(index)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filters.length === 0 && (
              <p className="text-sm text-[var(--kyro-text-secondary)] italic">
                {t("listView.noFilters", { defaultValue: 'No filters applied. Click "Add Filter" to create one.' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="surface-tile p-4 flex items-center justify-between border-l-4 border-[var(--kyro-sidebar-active)]">
          <span className="text-sm font-medium text-[var(--kyro-text-primary)]">
            {t("listView.selectedCount", { defaultValue: "{{count}} selected", count: selectedIds.size })}
          </span>
          <div className="flex gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {t("listView.deleteSelected", { defaultValue: "Delete Selected" })}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] font-bold text-sm transition-all"
            >
              {t("actions.cancel", { defaultValue: "Cancel" })}
            </button>
          </div>
        </div>
      )}

      {/* Data Table / Tree Hierarchy */}
      <div className="surface-tile overflow-hidden rounded-lg">
        {loading ? (
          <div className="space-y-2 p-4">
            <Shimmer variant="table-row" count={8} />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--kyro-surface-accent)] flex items-center justify-center mb-4">
              <Archive className="w-4 h-4" />
            </div>
            <p className="font-medium text-[var(--kyro-text-primary)] text-base">
              {t("listView.noDocuments", { defaultValue: "No documents found" })}
            </p>
            <p className="text-sm text-[var(--kyro-text-secondary)] mt-1">
              {hasActiveFilters
                ? t("listView.tryAdjustingFilters", { defaultValue: "Try adjusting your filters or search query." })
                : t("listView.getStartedCreate", { defaultValue: "Get started by creating your first {{item}}.", item: ((collection.singularLabel || collection.label || collectionSlug) as string).toLowerCase() })}
            </p>
            {!hasActiveFilters && canCreate && (
              <button
                type="button"
                onClick={handleCreate}
                className="mt-4 kyro-btn kyro-btn-md kyro-btn-primary shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("actions.create", { defaultValue: "Create {{item}}", item: String(collection.singularLabel || collection.label || collectionSlug) })}
              </button>
            )}
          </div>
        ) : viewMode === "tree" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[var(--kyro-text-secondary)] font-bold text-[10px] tracking-[0.3em] border-b border-[var(--kyro-border)] whitespace-nowrap">
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === docs.length && docs.length > 0
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-[var(--kyro-border-strong)] text-[var(--kyro-sidebar-active)] focus:ring-[var(--kyro-sidebar-active)]"
                    />
                  </th>
                  <th className="px-4 py-4 min-w-[280px]">Document / Hierarchy</th>
                  <th className="px-4 py-4">Path / Slug</th>
                  {collection.timestamps ? (
                    <th className="px-4 py-4">{t("listView.lastModifiedCol", { defaultValue: "Last Modified" })}</th>
                  ) : null}
                  <th className="px-4 py-4 text-right">{t("listView.actionsCol", { defaultValue: "Actions" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--kyro-border)]">
                {visibleTreeNodes.map((node) => {
                  const doc = node.data;
                  return (
                    <tr
                      key={node.id}
                      className="hover:bg-[var(--kyro-surface-accent)] transition-colors cursor-pointer group"
                      onClick={() => handleEdit(node.id)}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(node.id)}
                          onChange={() => handleSelectOne(node.id)}
                          className="w-4 h-4 rounded border-[var(--kyro-border-strong)] text-[var(--kyro-sidebar-active)] focus:ring-[var(--kyro-sidebar-active)]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${node.depth * 24}px` }}
                        >
                          {node.hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => toggleNodeCollapse(node.id, e)}
                              className="p-1 rounded hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
                              title={node.isCollapsed ? "Expand Sub-items" : "Collapse Sub-items"}
                            >
                              {node.isCollapsed ? (
                                <ChevronRight className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span className="w-6 flex items-center justify-center text-[var(--kyro-text-muted)] opacity-50">
                              {node.depth > 0 ? (
                                <CornerDownRight className="w-3.5 h-3.5" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--kyro-border-strong)]" />
                              )}
                            </span>
                          )}

                          <div className="flex items-center gap-2 min-w-0">
                            {node.hasChildren ? (
                              <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-[var(--kyro-text-muted)] shrink-0" />
                            )}
                            <span className="font-semibold text-sm text-[var(--kyro-text-primary)] truncate">
                              {node.label || "Untitled"}
                            </span>
                            {node.hasChildren && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                                {node.children.length} {node.children.length === 1 ? "sub-item" : "sub-items"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[var(--kyro-text-secondary)]">
                        {node.nestedPath || `/${node.slug || node.id}`}
                      </td>
                      {collection.timestamps ? (
                        <td className="px-4 py-3 text-sm text-[var(--kyro-text-secondary)]">
                          {doc?.updatedAt
                            ? new Date(doc.updatedAt as string).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                            : "—"}
                        </td>
                      ) : null}
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canCreate && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`${ADMIN_BASE}/${collectionSlug}/new?parent=${node.id}`);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--kyro-surface-accent)] text-xs font-medium text-[var(--kyro-text-primary)] hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                              title="Add sub-item"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Add Sub-item</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEdit(node.id)}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--kyro-surface-accent)] rounded-lg text-sm font-bold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-all"
                            title={canUpdate ? t("actions.edit", { defaultValue: "Edit" }) : t("actions.view", { defaultValue: "View" })}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingle(node.id);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--kyro-text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                              title={t("actions.delete", { defaultValue: "Delete" })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[var(--kyro-text-secondary)] font-bold text-[10px]  tracking-[0.3em] border-b border-[var(--kyro-border)] whitespace-nowrap">
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === docs.length && docs.length > 0
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-[var(--kyro-border-strong)] text-[var(--kyro-sidebar-active)] focus:ring-[var(--kyro-sidebar-active)]"
                    />
                  </th>
                  {displayFields.map((field) => (
                    <th
                      key={field.name}
                      className="px-4 py-4 cursor-pointer hover:text-[var(--kyro-text-primary)] transition-colors"
                      onClick={() => handleSort(field.name)}
                    >
                      <div className="flex items-center gap-2">
                        {checkTabbedValue(displayFields, field.type) ??
                          (field.label || field.name)}
                        {sort && sort.field === field.name && (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                  ))}
                  {collection.timestamps ? (
                    <th className="px-4 py-4">{t("listView.createdCol", { defaultValue: "Created" })}</th>
                  ) : null}
                  {collection.timestamps ? (
                    <th className="px-4 py-4">{t("listView.lastModifiedCol", { defaultValue: "Last Modified" })}</th>
                  ) : null}
                  <th className="px-4 py-4 text-right">{t("listView.actionsCol", { defaultValue: "Actions" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--kyro-border)]">
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-[var(--kyro-surface-accent)] transition-colors cursor-pointer group"
                    onClick={() => handleEdit(doc.id)}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(doc.id)}
                        onChange={() => handleSelectOne(doc.id)}
                        className="w-4 h-4 rounded border-[var(--kyro-border-strong)] text-[var(--kyro-sidebar-active)] focus:ring-[var(--kyro-sidebar-active)]"
                      />
                    </td>
                    {displayFields.map((field) => {
                      const rawValue = extractFieldValue(doc, field);
                      const cellValue =
                        field.type === "select" && rawValue && Array.isArray(field.options)
                          ? field.options.find((o: any) => o.value === rawValue)
                            ?.label || rawValue
                          : formatCellValue(rawValue, field.type, t);
                      return (
                        <td
                          key={field.name}
                          className={`px-4 py-3 ${fieldContainsTitle(field) ? "font-medium text-[var(--kyro-text-primary)]" : "text-[var(--kyro-text-secondary)]"}`}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                    {collection.timestamps ? (
                      <td className="px-4 py-3 text-sm text-[var(--kyro-text-secondary)]">
                        {doc.createdAt
                          ? new Date(doc.createdAt as string).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                          : "—"}
                      </td>
                    ) : null}
                    {collection.timestamps ? (
                      <td className="px-4 py-3 text-sm text-[var(--kyro-text-secondary)]">
                        {doc.updatedAt
                          ? new Date(doc.updatedAt as string).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                          : "—"}
                      </td>
                    ) : null}
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleEdit(doc.id)}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg text-sm font-bold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-all"
                          title={canUpdate ? t("actions.edit", { defaultValue: "Edit" }) : t("actions.view", { defaultValue: "View" })}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(doc.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--kyro-text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                            title={t("actions.delete", { defaultValue: "Delete" })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalDocs={totalDocs}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />
    </div>
  );
}

function formatCellValue(value: any, type?: string, t?: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? (t ? t("common.yes", { defaultValue: "Yes" }) : "Yes") : (t ? t("common.no", { defaultValue: "No" }) : "No");
  if (type === "number" || type === "price") return String(value);
  if (type === "date" || type === "datetime") {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === "object") {
        const target = ('value' in item && typeof item.value === 'object' && item.value !== null) ? item.value : item;
        const fallbackName = (target.firstName || target.lastName) ? `${target.firstName || ''} ${target.lastName || ''}`.trim() : undefined;
        return target.fullName || fallbackName || target.title || target.name || target.label || target.email || target.filename || target.slug || target.id || JSON.stringify(target).slice(0, 30);
      }
      return String(item ?? "").slice(0, 30);
    }).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const target = ('value' in value && typeof value.value === 'object' && value.value !== null) ? value.value : value;
    const fallbackName = (target.firstName || target.lastName) ? `${target.firstName || ''} ${target.lastName || ''}`.trim() : undefined;
    const label = target.fullName || fallbackName || target.title || target.name || target.label || target.email || target.filename || target.slug;
    if (label) return String(label);
    if (target.id) return String(target.id);
    return JSON.stringify(target).slice(0, 50);
  }
  return String(value).slice(0, 60);
}

function checkTabbedValue(data: any[], type: string): string | undefined {
  if (type !== "tabs") return;
  const label = data[0]?.tabs?.[0]?.fields?.[0]?.label;
  return label;
}

export function ListView(props: ListViewProps) {
  return (
    <ClientOnly fallback={<ListViewSkeleton />}>
      <ListViewInner {...props} />
    </ClientOnly>
  );
}
