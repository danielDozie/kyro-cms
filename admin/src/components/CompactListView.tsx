import "../lib/i18n";
import { Search, Plus, Archive, ChevronRight, FileText } from "./ui/icons";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Shimmer } from "./ui/Shimmer";
import { navigate } from "../lib/navigate";
import { apiGet, withCacheBust } from "../lib/api";
import { useAuthStore } from "../lib/stores";
import { adminPath as ADMIN_BASE } from "../lib/paths";
import { useTranslation } from "react-i18next";
import type { CollectionConfig, Field } from "@kyro-cms/core";
import { resolveFieldValue } from "../lib/resolve-field-value";
import { useAutoFormStore } from "../lib/autoform-store";
import { flattenAdminFields, type FieldConfig } from "../lib/field-utils";

interface CompactListViewProps {
  collection: CollectionConfig;
  collectionSlug?: string;
  initialDocs?: any[];
  initialTotal?: number;
  activeId?: string;
  initialSearch?: string;
  studio?: boolean;
}

export function CompactListView({
  collection,
  studio = false,
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

  const allFields = useMemo(() => flattenAdminFields(collection.fields), [collection.fields]);
  const titleField: string | undefined = typeof collection.admin?.useAsTitle === "string"
    ? collection.admin.useAsTitle
    : allFields.find((f) => f.type !== "group" && typeof f.name === "string")?.name;

  const storeFormData = useAutoFormStore((s) => s.formData);
  const hasUnsavedChanges = useAutoFormStore((s) => s.hasUnsavedChanges);

  function extractFieldValue(doc: any, fieldName?: string): any {
    if (!fieldName) return null;
    return resolveFieldValue(collection.fields as any, doc, fieldName) ?? null;
  }

  function getDocumentImage(doc: any): string | null {
    const docIdStr = String(doc.id || doc._id || "");
    const activeIdStr = String(activeId || "");
    const storeIdStr = String(storeFormData?.id || storeFormData?._id || "");

    const source =
      storeFormData &&
      ((activeIdStr && docIdStr === activeIdStr) || (storeIdStr && docIdStr === storeIdStr))
        ? { ...doc, ...storeFormData }
        : doc;

    const candidates = [
      "featuredImage",
      "image",
      "thumbnail",
      "cover",
      "avatar",
      "heroImage",
      "photo",
      "picture",
      "file",
    ];

    for (const key of candidates) {
      const val = source[key];
      if (!val) continue;
      if (typeof val === "string") {
        if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/") || val.startsWith("data:")) return val;
        return `/uploads/${val}`;
      }
      if (typeof val === "object" && val !== null) {
        if (typeof val.url === "string") return val.url;
        if (typeof val.thumbnailURL === "string") return val.thumbnailURL;
        if (typeof val.filename === "string") return `/uploads/${val.filename}`;
      }
    }

    for (const f of allFields) {
      if (f.type === "upload" && f.name && source[f.name]) {
        const val = source[f.name];
        if (typeof val === "string") {
          if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/") || val.startsWith("data:")) return val;
          return `/uploads/${val}`;
        }
        if (typeof val === "object" && val !== null) {
          if (typeof val.url === "string") return val.url;
          if (typeof val.thumbnailURL === "string") return val.thumbnailURL;
          if (typeof val.filename === "string") return `/uploads/${val.filename}`;
        }
      }
    }

    if (collection.upload) {
      if (typeof source.url === "string") return source.url;
      if (typeof source.thumbnailURL === "string") return source.thumbnailURL;
      if (typeof source.filename === "string") return `/uploads/${source.filename}`;
    }

    return null;
  }

  function getDocumentTitle(doc: any) {
    const docIdStr = String(doc.id || doc._id || "");
    const activeIdStr = String(activeId || "");
    const storeIdStr = String(storeFormData?.id || storeFormData?._id || "");

    const source =
      storeFormData &&
      ((activeIdStr && docIdStr === activeIdStr) || (storeIdStr && docIdStr === storeIdStr))
        ? storeFormData
        : doc;

    const useTitle = collection.admin?.useAsTitle;
    let val: any = null;

    if (useTitle) {
      val = extractFieldValue(source, useTitle) ?? source[useTitle];
    }
    if (!val && titleField) {
      val = extractFieldValue(source, titleField) ?? source[titleField];
    }
    if (!val) {
      val =
        source.orderNumber ||
        source.title ||
        source.name ||
        source.fullName ||
        source.label ||
        source.heading ||
        source.email ||
        source.slug ||
        (source.id ? `#${String(source.id).slice(-6)}` : null) ||
        (source._id ? `#${String(source._id).slice(-6)}` : null);
    }

    if (!val) return "Untitled";
    if (typeof val === "object" && val !== null) {
      return val.title || val.name || val.orderNumber || val.fullName || val.label || "Untitled";
    }
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
        draft: "true",
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
    if (canCreate) navigate(`${ADMIN_BASE}${studio ? "/studio" : ""}/${collectionSlug}/new`);
  };

  const handleEdit = (id: string | any) => {
    const cleanId = typeof id === "object" && id !== null ? String(id.id || id._id || id.value || id) : String(id || "");
    if (!cleanId || cleanId === "[object Object]") return;
    let url = `${ADMIN_BASE}${studio ? "/studio" : ""}/${collectionSlug}/${encodeURIComponent(cleanId)}`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    navigate(url);
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--kyro-border)] shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="font-semibold text-[var(--kyro-text-primary)] text-xs truncate">
            {collection.label || collectionSlug}
          </h2>
          <span className="text-[11px] text-[var(--kyro-text-muted)] font-normal shrink-0">
            ({totalDocs})
          </span>
        </div>
        {canCreate && (
          <button
            onClick={handleCreate}
            className="p-1 rounded hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
            title="Create New"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[var(--kyro-border)] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--kyro-text-muted)]" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded text-xs font-normal text-[var(--kyro-text-primary)] placeholder:text-[var(--kyro-text-muted)] focus:outline-none focus:border-[var(--kyro-primary)]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {docs.length === 0 && !loading ? (
          <div className="py-6 flex flex-col items-center justify-center text-center opacity-70">
            <Archive className="w-5 h-5 mb-1.5 text-[var(--kyro-text-muted)]" />
            <p className="text-xs font-medium text-[var(--kyro-text-secondary)]">No items found</p>
          </div>
        ) : (
          docs.map((doc) => {
            const isActive = doc.id === activeId;
            const rawStatus = getDocumentStatus(doc);
            const image = getDocumentImage(doc);

            // Detect modified / unsaved state and version baseline
            const hasUnsavedEdits =
              (isActive && hasUnsavedChanges) ||
              doc._hasUnpublishedChanges === true ||
              rawStatus === "modified" ||
              rawStatus === "edited";
            const persistedStatus = doc.status || doc._status || (rawStatus !== "modified" && rawStatus !== "edited" ? rawStatus : null);
            const isPublished = persistedStatus === "published" || (!persistedStatus && !!doc.publishedAt);
            const isArchived = persistedStatus === "archived";

            // Only a published baseline can be modified; unpublished documents remain drafts.
            const isPublishedModified = isPublished && hasUnsavedEdits;

            return (
              <button
                key={doc.id}
                onClick={() => handleEdit(doc.id)}
                className={`relative w-full text-left px-2.5 py-1.5 rounded-md flex items-center gap-2.5 transition-colors group overflow-hidden ${isActive
                  ? "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)]"
                  : "bg-transparent hover:bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)]"
                  }`}
              >
                {isActive && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--kyro-primary)] rounded-full" />}

                {/* Featured image thumbnail */}
                <div className="relative shrink-0 w-7 h-7 rounded-md overflow-hidden bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] flex items-center justify-center">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[var(--kyro-text-muted)] opacity-60" />
                  )}
                </div>

                <div className="overflow-hidden min-w-0 flex-1">
                  <p className={`text-xs truncate leading-snug ${isActive ? "font-medium text-[var(--kyro-text-primary)]" : "font-medium text-[var(--kyro-text-primary)]"}`}>
                    {getDocumentTitle(doc)}
                  </p>
                  <div className="compact-document-status flex items-center gap-1.5 mt-0.5">
                    {isPublishedModified ? (
                      <>
                        <div className="flex items-center -space-x-0.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 ring-1 ring-[var(--kyro-surface)]" title="Published" />
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-400 ring-1 ring-[var(--kyro-surface)]" title="Unpublished edits" />
                        </div>
                        <span className="text-[9px] leading-tight font-medium text-emerald-500 dark:text-emerald-400">
                          Published
                        </span>
                        <span className="text-[9px] leading-tight text-[var(--kyro-text-muted)] opacity-40">·</span>
                        <span className="text-[9px] leading-tight font-medium text-amber-500 dark:text-amber-400">
                          Modified
                        </span>
                      </>
                    ) : isPublished ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 dark:bg-emerald-400" />
                        <span className="text-[9px] leading-tight font-medium text-emerald-500 dark:text-emerald-400 capitalize">
                          Published
                        </span>
                      </>
                    ) : isArchived ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-zinc-400 dark:bg-zinc-500" />
                        <span className="text-[9px] leading-tight font-medium text-zinc-500 dark:text-zinc-400 capitalize">
                          Archived
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-zinc-400 dark:bg-zinc-500" />
                        <span className="text-[9px] leading-tight font-medium text-[var(--kyro-text-muted)] capitalize">
                          Draft
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isActive ? "opacity-100 text-[var(--kyro-text-primary)]" : "opacity-0 group-hover:opacity-40 text-[var(--kyro-text-muted)]"}`} />
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
