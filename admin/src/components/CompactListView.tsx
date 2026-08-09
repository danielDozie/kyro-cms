import { Search, Plus, Archive, ChevronRight } from "./ui/icons";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Shimmer } from "./ui/Shimmer";
import { navigate } from "../lib/navigate";
import { apiGet, withCacheBust } from "../lib/api";
import { useAuthStore } from "../lib/stores";
import { adminPath as ADMIN_BASE } from "../lib/paths";
import { useTranslation } from "react-i18next";
import "../lib/i18n";
import type { CollectionConfig, Field } from "@kyro-cms/core";
import { resolveFieldValue } from "../lib/resolve-field-value";
import { useAutoFormStore } from "../lib/autoform-store";

type FieldConfig = Field;

interface CompactListViewProps {
  collection: CollectionConfig;
  collectionSlug?: string;
  initialDocs?: any[];
  initialTotal?: number;
  activeId?: string;
  initialSearch?: string;
}

export function CompactListView({
  collection,
  collectionSlug: providedSlug,
  initialDocs = [],
  initialTotal = 0,
  activeId,
  initialSearch = "",
}: CompactListViewProps) {
  const collectionSlug = providedSlug || collection?.slug || "";
  let t = (key: string) => key;
  try {
    const i18n = useTranslation();
    if (i18n?.t) t = i18n.t;
  } catch {}
  const { permissions } = useAuthStore();
  const canCreate = permissions?.collections?.[collectionSlug]?.create !== false;

  const [docs, setDocs] = useState<any[]>(initialDocs);
  const [totalDocs, setTotalDocs] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20; // Load more at once for the sidebar
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [hasMore, setHasMore] = useState(initialTotal > initialDocs.length);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Extract title field
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
      } else if ((field.type === "row" || field.type === "collapsible") && field.fields) {
        result.push(...flattenFields(field.fields));
      } else {
        if (!field.name) continue;
        result.push(field);
      }
    }
    return result;
  }

  const allFields = useMemo(() => flattenFields(collection.fields), [collection.fields]);
  const titleField: string | undefined = typeof collection.admin?.useAsTitle === "string"
    ? collection.admin.useAsTitle
    : allFields.find((f) => f.type !== "group" && typeof f.name === "string")?.name;

  const storeFormData = useAutoFormStore((s) => s.formData);

  function extractFieldValue(doc: any, fieldName?: string): any {
    if (!fieldName) return null;
    return resolveFieldValue(collection.fields as any, doc, fieldName) ?? null;
  }

  function getDocumentTitle(doc: any) {
    const docIdStr = String(doc.id || doc._id || "");
    const activeIdStr = String(activeId || "");
    const storeIdStr = String(storeFormData?.id || storeFormData?._id || "");

    if (
      storeFormData &&
      ((activeIdStr && docIdStr === activeIdStr) || (storeIdStr && docIdStr === storeIdStr)) &&
      titleField &&
      storeFormData[titleField] !== undefined &&
      storeFormData[titleField] !== null &&
      storeFormData[titleField] !== ""
    ) {
      const val = storeFormData[titleField];
      if (typeof val === "object") return (val as any).title || (val as any).name || "Untitled";
      return String(val);
    }
    if (!titleField) return doc.id;
    const val = extractFieldValue(doc, titleField);
    if (!val) return "Untitled";
    if (typeof val === "object") return val.title || val.name || "Untitled";
    return String(val);
  }

  function getDocumentStatus(doc: any) {
    const docIdStr = String(doc.id || doc._id || "");
    const activeIdStr = String(activeId || "");
    const storeIdStr = String(storeFormData?.id || storeFormData?._id || "");

    if (
      storeFormData &&
      ((activeIdStr && docIdStr === activeIdStr) || (storeIdStr && docIdStr === storeIdStr)) &&
      storeFormData.status !== undefined
    ) {
      return storeFormData.status;
    }
    const val = extractFieldValue(doc, "status");
    return val;
  }

  const fetchDocs = useCallback(async (isLoadMore = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        depth: "1",
      });

      const where: Record<string, any> = {};
      if (debouncedSearch && titleField) {
        where[titleField] = { contains: debouncedSearch };
      }

      if (Object.keys(where).length > 0) {
        params.append("where", JSON.stringify(where));
      }

      const result = (await apiGet(
        withCacheBust(`/api/${collectionSlug}?${params}`),
        { autoToast: false },
      )) as { docs?: Record<string, unknown>[]; totalDocs?: number };

      if (isLoadMore) {
        setDocs((prev) => {
          const newDocs = result.docs || [];
          // Deduplicate
          const existingIds = new Set(prev.map(d => d.id));
          return [...prev, ...newDocs.filter(d => !existingIds.has(String(d.id)))];
        });
      } else {
        setDocs(result.docs || []);
      }

      const newTotal = result.totalDocs || 0;
      setTotalDocs(newTotal);
      setHasMore(isLoadMore ? (docs.length + (result.docs?.length || 0)) < newTotal : (result.docs?.length || 0) < newTotal);

    } catch (error) {
      console.error("Failed to load docs:", error);
    } finally {
      setLoading(false);
    }
  }, [collectionSlug, page, limit, debouncedSearch]);

  useEffect(() => {
    fetchDocs(page > 1);
  }, [page, debouncedSearch, activeId]);

  useEffect(() => {
    if (!storeFormData?.id) return;
    const targetIdStr = String(storeFormData.id);
    setDocs((prevDocs) => {
      let changed = false;
      const updated = prevDocs.map((d) => {
        if (String(d.id) === targetIdStr) {
          let hasDiff = false;
          const newDoc = { ...d };
          if (storeFormData.status !== undefined && storeFormData.status !== d.status) {
            newDoc.status = storeFormData.status;
            hasDiff = true;
          }
          if (titleField && storeFormData[titleField] !== undefined && storeFormData[titleField] !== d[titleField]) {
            newDoc[titleField] = storeFormData[titleField];
            hasDiff = true;
          }
          if (hasDiff) {
            changed = true;
            return newDoc;
          }
        }
        return d;
      });
      return changed ? updated : prevDocs;
    });
  }, [storeFormData, titleField]);

  useEffect(() => {
    const handleReload = () => {
      fetchDocs();
    };
    window.addEventListener("kyro:soft-reload", handleReload);
    window.addEventListener("kyro:global-save-end", handleReload);
    return () => {
      window.removeEventListener("kyro:soft-reload", handleReload);
      window.removeEventListener("kyro:global-save-end", handleReload);
    };
  }, [fetchDocs]);

  const handleLoadMore = () => {
    if (!loading && hasMore) setPage(p => p + 1);
  };

  const handleCreate = () => {
    if (canCreate) navigate(`${ADMIN_BASE}/${collectionSlug}/new`);
  };

  const handleEdit = (id: string) => {
    let url = `${ADMIN_BASE}/${collectionSlug}/${id}`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    navigate(url);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="p-4 border-b border-[var(--kyro-border)] shrink-0 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[var(--kyro-text-primary)] text-sm">
            {collection.label || collectionSlug}
          </h2>
          <span className="text-xs text-[var(--kyro-text-secondary)]">
            {totalDocs} items
          </span>
        </div>
        {canCreate && (
          <button
            onClick={handleCreate}
            className="p-1.5 rounded-md hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
            title="Create New"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[var(--kyro-border)] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--kyro-text-muted)]" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-md text-sm font-medium text-[var(--kyro-text-primary)] placeholder:text-[var(--kyro-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--kyro-sidebar-active)]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {docs.length === 0 && !loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-center opacity-70">
            <Archive className="w-6 h-6 mb-2 text-[var(--kyro-text-muted)]" />
            <p className="text-xs font-medium text-[var(--kyro-text-secondary)]">No items found</p>
          </div>
        ) : (
          docs.map((doc) => {
            const isActive = doc.id === activeId;
            const status = getDocumentStatus(doc);
            return (
              <button
                key={doc.id}
                onClick={() => handleEdit(doc.id)}
                className={`relative w-full text-left px-3 py-2.5 rounded-md flex items-center justify-between transition-colors group overflow-hidden ${isActive
                  ? "bg-[var(--kyro-surface-accent)] border-[var(--kyro-border-strong)] text-[var(--kyro-text-primary)]"
                  : "bg-transparent border-transparent hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)]"
                  }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--kyro-primary)] rounded-l-md" />}
                <div className="overflow-hidden min-w-0 pr-2">
                  <p className={`text-sm truncate ${isActive ? "font-bold text-[var(--kyro-text-primary)]" : "font-medium text-[var(--kyro-text-primary)]"}`}>
                    {getDocumentTitle(doc)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* {collection.timestamps && doc.updatedAt && (
                      <span className="text-[11px] truncate text-[var(--kyro-text-muted)]">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    )} */}
                    {status && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-regular capitalize ${status === "published"
                        ? "text-green-500 dark:text-green-400"
                        : "text-orange-500 dark:text-orange-400"
                        }`}>
                        {status}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-opacity ${isActive ? "opacity-100 text-[var(--kyro-text-primary)]" : "opacity-0 group-hover:opacity-50 text-[var(--kyro-text-muted)]"}`} />
              </button>
            );
          })
        )}

        {loading && (
          <div className="p-3 space-y-3">
            <Shimmer variant="table-row" count={3} />
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={handleLoadMore}
            className="w-full py-2 text-xs font-medium text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
