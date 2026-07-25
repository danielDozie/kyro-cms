import { Check, AlertTriangle } from "./ui/icons";
import { useState, useRef, useEffect } from "react";
import type {
  CollectionConfig,
  GlobalConfig,
  Field,
} from "@kyro-cms/core/client";
import type { DeclarativeCondition } from "../lib/core-types";

type View = "edit" | "version" | "api";
import { globals, collections } from "../lib/config";
import { resolveUrl, apiGet, apiDelete, fetchWithAuth } from "../lib/api";
import { EmptyState } from "./ui/EmptyState";
import { navigate } from "../lib/navigate";
import { Shimmer } from "./ui/Shimmer";
import { normalizeUploadFields } from "../lib/normalize-upload-fields";
import { useAutoFormStore } from "../lib/autoform-store";
import { useAutoFormState } from "../hooks/useAutoFormState";
import { useUIStore, toast } from "../lib/stores";

import { adminPath as ADMIN_BASE } from "../lib/paths";

import { RelationshipBlockField } from "./fields/RelationshipBlockField";
import { FieldRenderer } from "./FieldRenderer";
import { TabsLayout } from "./fields/TabsLayout";
import { GroupLayout } from "./fields/GroupLayout";
import { ArrayLayout } from "./fields/ArrayLayout";
import { AutoFormHeader } from "./autoform/AutoFormHeader";
import { AutoFormEditView } from "./autoform/AutoFormEditView";
import { AutoFormVersionView } from "./autoform/AutoFormVersionView";
import { AutoFormApiView } from "./autoform/AutoFormApiView";
import { ErrorBoundary } from "./autoform/ErrorBoundary";

interface AutoFormProps {
  config: CollectionConfig | GlobalConfig;
  data?: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange?: (data: Record<string, unknown>) => void;
  disabled?: boolean;
  collectionSlug?: string;
  globalSlug?: string;
  documentId?: string;
  documentName?: string;
  layout?: "split" | "single";
  onActionSuccess?: (message: string) => void;
  onActionError?: (message: string) => void;
  justSaved?: boolean;
  documentStatus?: string;
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof path !== "string") return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function evaluateDeclarativeCondition(cond: DeclarativeCondition | undefined, currentData: Record<string, unknown>, formData: Record<string, unknown>): boolean {
  if (!cond) return true;

  if ("and" in cond && Array.isArray(cond.and)) {
    return cond.and.every((c: DeclarativeCondition) => evaluateDeclarativeCondition(c, currentData, formData));
  }
  if ("or" in cond && Array.isArray(cond.or)) {
    return cond.or.some((c: DeclarativeCondition) => evaluateDeclarativeCondition(c, currentData, formData));
  }

  if ("field" in cond && cond.field) {
    const targetField = cond.field;
    let val = getNestedValue(currentData, targetField);
    if (val === undefined) {
      val = getNestedValue(formData, targetField);
    }

    if ("equals" in cond) {
      return val === cond.equals;
    }
    if ("notEquals" in cond) {
      return val !== cond.notEquals;
    }
    if ("in" in cond && Array.isArray(cond.in)) {
      return cond.in.includes(val as string | number | boolean);
    }
    if ("greaterThan" in cond && cond.greaterThan !== undefined) {
      return typeof val === "number" && val > cond.greaterThan;
    }

    // If field exists but no operator is provided, just check truthiness
    return Boolean(val);
  }

  return true;
}

const EMPTY_OBJECT = {};
export function AutoForm({
  config: propConfig,
  data: initialData = EMPTY_OBJECT,
  errors = EMPTY_OBJECT as Record<string, string>,
  onChange,
  disabled: propDisabled,
  collectionSlug,
  globalSlug,
  documentId,
  documentName,
  layout = "split",
  onActionSuccess,
  onActionError,
  justSaved,
}: AutoFormProps) {
  // Use the serialized config from the Astro page prop (SSR + client match).
  // Only fall back to the live client-side config when no prop was passed.
  const activeConfig = propConfig || (globalSlug
    ? globals[globalSlug]
    : collectionSlug
      ? collections[collectionSlug]
      : null);

  const [liveConfig, setLiveConfig] = useState<CollectionConfig | GlobalConfig | null>(activeConfig);

  useEffect(() => {
    if (globalSlug && !activeConfig) {
      apiGet("/api/kyro/schema").then((schema: unknown) => {
        const schemaTyped = schema as { globals?: Record<string, GlobalConfig>; collections?: Record<string, CollectionConfig> };
        if (schemaTyped?.globals?.[globalSlug]) {
          setLiveConfig(schemaTyped.globals[globalSlug]);
        }
      }).catch(err => console.error("[AutoForm] Failed to fetch dynamic schema", err));
    } else {
      setLiveConfig(activeConfig);
    }
  }, [globalSlug, activeConfig]);

  const config = liveConfig || activeConfig;


  const { confirm } = useUIStore();

  const {
    formData,
    lastSavedData,
    hasUnsavedChanges,
    isAutoSaving,
    backgroundProcessing,
    autoSaveStatus,
    lastSavedAt,
    retryCount,
    sidebarCollapsed,
    setSidebarCollapsed,
    activeTab,
    setActiveTab,
    isSlugLocked,
    setIsSlugLocked,
    view,
    setView,
    isDropdownOpen,
    setIsDropdownOpen,
    versions,
    loadingVersions,
    showPreview,
    setShowPreview,
    isMenuOpen,
    setIsMenuOpen,
    loadingFields,
    setLoadingFields,
    compareMode,
    setCompareMode,
    compareSelected,
    setCompareSelected,
    compareDiffs,
    setCompareDiffs,
    loadingDiffs,
    setLoadingDiffs,
    setField,
    setFormData,
    markSaved,
    setLastSavedData,
    setAutoSaveStatus,
    fetchVersions,
    saveDocument,
    forceSave,
    autoSaveSkipRef,
    lastAutoSaveTimeRef,
    documentStatus,
    hasUnpublishedChanges,
    versionsEnabled,
  } = useAutoFormState({
    config,
    initialData,
    collectionSlug,
    globalSlug,
    documentId,
    onChange,
    onActionSuccess,
    onActionError,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [localSaveStatus, setLocalSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const disabled = propDisabled;
  const [clientLoading, setClientLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const docCacheRef = useRef(new Map<string, { data: Record<string, unknown>; ts: number }>());
  const CACHE_TTL = 30_000;

  // Client-side fetch with cache, stale-while-revalidate, and abort
  useEffect(() => {
    const cacheKey = globalSlug ? `global:${globalSlug}` : `${collectionSlug}:${documentId}`;
    const shouldFetch = globalSlug || (collectionSlug && documentId && documentId !== "new");
    if (!shouldFetch) return;
    if (initialData && Object.keys(initialData).length > 0) return;

    const cached = docCacheRef.current.get(cacheKey);
    const isFresh = cached && Date.now() - cached.ts < CACHE_TTL;
    const isStale = cached && !isFresh;

    // Fresh cache — skip fetch, render immediately
    if (isFresh) {
      useAutoFormStore.getState().loadDocument(cached.data, cached.data);
      return;
    }

    // Stale cache — render cached data (no shimmer), re-fetch in background
    if (isStale) {
      useAutoFormStore.getState().loadDocument(cached.data, cached.data);
    }

    const abort = new AbortController();
    setFetchError(false);
    if (!cached) setClientLoading(true);

    const url = globalSlug
      ? `/api/globals/${globalSlug}`
      : `/api/${collectionSlug}/${documentId}`;

    apiGet<{ data?: Record<string, unknown> }>(url, { autoToast: false, signal: abort.signal })
      .then((result) => {
        const docData = result.data || {};
        docCacheRef.current.set(cacheKey, { data: docData, ts: Date.now() });
        useAutoFormStore.getState().loadDocument(docData, docData);
        setClientLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setClientLoading(false);
        if (!cached) setFetchError(true);
      });

    return () => abort.abort();
  }, [collectionSlug, documentId, globalSlug, initialData, retryTick]);

  // Tick every 10s so the "saved X ago" label stays fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const resolveAdminFlag = (
    value: boolean | ((
      data: Record<string, unknown>,
      siblingData: Record<string, unknown>,
    ) => boolean) | undefined,
    currentData: Record<string, unknown>,
  ): boolean => {
    if (typeof value === "function") {
      try {
        return value(formData, currentData);
      } catch (error) {
        console.warn("Error evaluating admin runtime flag:", error);
        return false;
      }
    }
    return Boolean(value);
  };

  const handleRestoreVersion = (versionId: string) => {
    confirm({
      title: "Restore Version",
      message: "Are you sure you want to restore this version? This will overwrite your current changes.",
      onConfirm: async () => {
        try {
          const url = globalSlug
            ? resolveUrl(`/api/globals/${globalSlug}/versions/${versionId}/restore`)
            : resolveUrl(`/api/${collectionSlug}/${formData.id}/versions/${versionId}/restore`);

          // Try RESTful URL first
          let resp = await fetchWithAuth(url, { method: "POST" });

          // Fallback to legacy action-based URL for Collections if needed
          if (!resp.ok && collectionSlug) {
            resp = await fetchWithAuth(
              resolveUrl(`/api/${collectionSlug}/${formData.id}/versions`),
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ versionId, action: "restore" }),
              },
            );
          }

          const result = await resp.json();
          if (result.data) {
            // Omit historical timestamps so OCC doesn't panic on save
            const { updatedAt, createdAt, ...historicalData } = result.data;
            const restoredData = { ...formData, ...historicalData };
            setFormData(restoredData);
            useAutoFormStore.getState().loadDocument(restoredData, restoredData);
            onActionSuccess?.("Version restored successfully");
            fetchVersions();
            setView("edit");
          } else {
            toast.error(result.error || "Failed to restore version");
          }
        } catch (err) {
          console.error("Failed to restore version:", err);
          toast.error("Failed to restore version");
        }
      }
    });
  };

  const handleCompareVersions = async () => {
    if (compareSelected.length !== 2) return;
    setLoadingDiffs(true);
    try {
      const resp = await fetchWithAuth(
        resolveUrl(`/api/${collectionSlug}/${formData.id}/versions?compareA=${compareSelected[0]}&compareB=${compareSelected[1]}`),
      );
      const data = await resp.json();
      setCompareDiffs(data.diffs || []);
    } catch (e) {
      console.error("Compare failed:", e);
      setCompareDiffs([]);
    } finally {
      setLoadingDiffs(false);
    }
  };

  const toggleCompareSelection = (versionId: string) => {
    setCompareSelected((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S = Save Draft
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveDraft();
      }
      // Cmd/Ctrl + Shift + P = Publish Changes
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        (document.getElementById("btn-publish") as HTMLButtonElement | null)?.click();
      }
      // Cmd/Ctrl + P (no shift) = Toggle Preview
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        setShowPreview((prev) => !prev);
      }
      // Keys 1, 2, 3 = Tab Switching
      if (
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        if (e.key === "1") setView("edit");
        if (e.key === "2") setView("version");
        if (e.key === "3") setView("api");
      }
    };
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, []);

  // Listen for external "View History" trigger from ActionBar
  useEffect(() => {
    const handler = () => setView("version");
    window.addEventListener("kyro:show-version-history", handler);
    return () => window.removeEventListener("kyro:show-version-history", handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setShowSchedulePicker(false);
      }
    };
    if (showSchedulePicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSchedulePicker]);

  const handleCreateNew = () => {
    if (hasUnsavedChanges) {
      confirm({
        title: "Unsaved Changes",
        message: "You have unsaved changes. Save before creating new?",
        onConfirm: async () => {
          await handleSaveDraft();
          await new Promise((r) => setTimeout(r, 1000));
          navigate(`${ADMIN_BASE}/${collectionSlug}/new`);
        },
      });
    } else {
      navigate(`${ADMIN_BASE}/${collectionSlug}/new`);
    }
  };

  const handleDuplicate = () => {
    if (!formData.id) {
      toast.error("Please save the document before duplicating.");
      return;
    }

    const performDuplicate = async () => {
      try {
        setIsDuplicating(true);
        const response = await fetchWithAuth(`/api/${collectionSlug}/${formData.id}/duplicate`, {
          method: "POST",
        });

        if (response.ok) {
          const result = await response.json();
          onActionSuccess?.("Document duplicated successfully");
          if (result.data?.id) {
            navigate(`${ADMIN_BASE}/${collectionSlug}/${result.data.id}`);
          } else {
            navigate(`${ADMIN_BASE}/${collectionSlug}`);
          }
        } else {
          const err = await response.json();
          toast.error(err.error || "Failed to duplicate");
        }
      } catch (e) {
        toast.error("Failed to duplicate document");
      } finally {
        setIsDuplicating(false);
      }
    };

    if (hasUnsavedChanges) {
      confirm({
        title: "Unsaved Changes",
        message: "You have unsaved changes. Please save the document before duplicating.",
        onConfirm: async () => {
          await handleSaveDraft();
          await performDuplicate();
        },
      });
      return;
    }

    confirm({
      title: "Duplicate Document",
      message: "Are you sure you want to duplicate this document?",
      onConfirm: async () => {
        await performDuplicate();
      },
    });
  };

  const handleDelete = () => {
    confirm({
      title: "Delete Document",
      message: "Delete this document? This cannot be undone. Are you absolutely sure?",
      variant: "danger",
      onConfirm: async () => {
        autoSaveSkipRef.current = true;
        try {
          await apiDelete(`/api/${collectionSlug}/${formData.id}`);
          navigate(`${ADMIN_BASE}/${collectionSlug}`);
        } catch (err) {
          toast.error((err as Error).message || "Failed to delete document");
        } finally {
          autoSaveSkipRef.current = false;
        }
      },
    });
  };

  const handleUnpublish = () => {
    confirm({
      title: "Unpublish Document",
      message: "Unpublish this document?",
      onConfirm: async () => {
        autoSaveSkipRef.current = true;
        try {
          const response = await saveDocument(
            { ...formData, status: 'draft' } as Record<string, unknown>,
            false,
          );
          if (response?.ok) {
            onActionSuccess?.("Document unpublished successfully");
            const state = useAutoFormStore.getState();
            state.loadDocument(
              { ...formData, status: 'draft' } as Record<string, unknown>,
              { ...formData, status: 'draft' } as Record<string, unknown>,
            );
          } else {
            const error = await response?.json().catch(() => ({}));
            toast.error(error?.error || "Failed to unpublish");
          }
        } catch (err) {
          toast.error("Failed to unpublish");
        } finally {
          autoSaveSkipRef.current = false;
        }
      },
    });
  };

  const handleSaveDraft = async () => {
    const isNewDoc = !formData.id;
    autoSaveSkipRef.current = true;
    setLocalSaveStatus("saving");

    try {
      const data = normalizeUploadFields({ ...formData }, true) as Record<string, unknown>;
      const isPost = isNewDoc && !globalSlug;

      const response = isPost
        ? await fetchWithAuth(`/api/${collectionSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        : await saveDocument(data);

      if (response.ok) {
        const result = await response.json();
        const savedData = result.data || data;
        useAutoFormStore.getState().loadDocument(savedData, savedData);
        lastAutoSaveTimeRef.current = Date.now();
        setAutoSaveStatus("success");
        setLocalSaveStatus("saved");
        if (versionsEnabled) fetchVersions();
        setTimeout(() => {
          setAutoSaveStatus("idle");
          setLocalSaveStatus("idle");
        }, 2000);
        onActionSuccess?.(
          isPost ? "Document created successfully" : "Changes saved",
        );
        if (globalSlug) {
          window.dispatchEvent(new Event("kyro:soft-reload"));
        }
        if (isPost) {
          setTimeout(() => {
            navigate(`${ADMIN_BASE}/${collectionSlug}/${result.data.id}`);
          }, 800);
        }
      } else {
        const error = await response.json();
        if (response.status === 409) {
          setAutoSaveStatus("conflict");
        }
        setLocalSaveStatus("error");
        toast.error(error.error || "Failed to save");
        setTimeout(() => setLocalSaveStatus("idle"), 3000);
      }
    } catch (err) {
      setLocalSaveStatus("error");
      toast.error("Failed to save document");
      setTimeout(() => setLocalSaveStatus("idle"), 3000);
    } finally {
      window.dispatchEvent(new CustomEvent("kyro:global-save-end"));
      autoSaveSkipRef.current = false;
    }
  };

  const handlePublish = async () => {
    const isNewDoc = !formData.id;
    autoSaveSkipRef.current = true;
    setLocalSaveStatus("saving");

    try {
      let dataToPublish = { ...formData };

      if (isNewDoc && !globalSlug) {
        // Create then immediately publish
        const data = normalizeUploadFields({ ...formData }, true) as Record<string, unknown>;
        const response = await fetchWithAuth(`/api/${collectionSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          if (response.status === 409) setAutoSaveStatus("conflict");
          setLocalSaveStatus("error");
          toast.error(error.error || "Failed to create document");
          setTimeout(() => setLocalSaveStatus("idle"), 3000);
          return;
        }
        const result = await response.json();
        const savedData = result.data || data;
        useAutoFormStore.getState().loadDocument(savedData, savedData);
        dataToPublish = savedData;
      }

      // Save and publish (X-Draft: false writes to main doc + versions table)
      const data = normalizeUploadFields(dataToPublish, true) as Record<string, unknown>;
      const response = await saveDocument(data, false);

      if (response?.ok) {
        const result = await response.json().catch(() => ({}));
        const savedData = result.data || data;
        useAutoFormStore.getState().loadDocument(savedData, savedData);
        setLocalSaveStatus("saved");
        onActionSuccess?.("Published successfully");

        setTimeout(() => {
          setLocalSaveStatus("idle");
        }, 2000);

        if (isNewDoc && !globalSlug && dataToPublish.id) {
          setTimeout(() => {
            navigate(`${ADMIN_BASE}/${collectionSlug}/${dataToPublish.id}`);
          }, 800);
        }
      } else {
        // Two-step publish: if POST succeeded but PATCH failed,
        // document exists as draft — navigate and inform user
        if (isNewDoc && !globalSlug && dataToPublish.id) {
          const error = await response?.json().catch(() => ({}));
          toast.warning("Document saved as draft. Publishing failed: " + (error?.error || "Unknown error"));
          setTimeout(() => {
            navigate(`${ADMIN_BASE}/${collectionSlug}/${dataToPublish.id}`);
          }, 1200);
          return;
        }
        const error = await response?.json().catch(() => ({}));
        if (response?.status === 409) setAutoSaveStatus("conflict");
        setLocalSaveStatus("error");
        toast.error(error?.error || "Failed to publish");
        setTimeout(() => setLocalSaveStatus("idle"), 3000);
      }
    } catch (err) {
      setLocalSaveStatus("error");
      toast.error("Failed to publish");
      setTimeout(() => setLocalSaveStatus("idle"), 3000);
    } finally {
      autoSaveSkipRef.current = false;
    }
  };

  const handleSchedulePublish = async (scheduledFor: string) => {
    const isNewDoc = !formData.id;
    // Save the document first with _schedulePublishAt metadata
    autoSaveSkipRef.current = true;

    try {
      const data = {
        ...normalizeUploadFields({ ...formData }, true) as Record<string, unknown>,
        _schedulePublishAt: scheduledFor,
      };

      if (isNewDoc && !globalSlug) {
        const response = await fetchWithAuth(`/api/${collectionSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          toast.error(err.error || "Failed to schedule publish");
          return;
        }
      } else {
        const response = await saveDocument(data);
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          toast.error(err.error || "Failed to schedule publish");
          return;
        }
      }

      onActionSuccess?.(`Scheduled publish for ${new Date(scheduledFor).toLocaleString()}`);
      setShowSchedulePicker(false);
    } catch {
      toast.error("Failed to schedule publish");
    } finally {
      autoSaveSkipRef.current = false;
    }
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setField(fieldName, value);
  };

  const renderField = (
    field: Field,
    parentData?: Record<string, unknown>,
    onParentChange?: (val: Record<string, unknown>) => void,
  ): React.ReactNode => {
    const currentData = parentData !== undefined ? parentData : formData;
    const isHidden = resolveAdminFlag((field.hidden !== undefined ? field.hidden : field.admin?.hidden) as any, currentData);
    if (isHidden) return null;

    const isReadOnly = resolveAdminFlag((field.readOnly !== undefined ? field.readOnly : field.admin?.readOnly) as any, currentData);
    const effectiveDisabled = Boolean(disabled || isReadOnly);

    // Evaluate display condition if present
    // For conditional fields, pass formData as the root context (first arg)
    // and currentData as the sibling context (second arg)
    if (field.admin?.condition) {
      if (typeof field.admin.condition === "function") {
        try {
          // Compatibility wrapper: pass { values: formData, ...formData } to support both old and new signatures
          const evalData = { values: formData || {}, ...(formData || {}) };
          const shouldShow = field.admin.condition(evalData, currentData);
          if (!shouldShow) {
            return null;
          }
        } catch (e) {
          console.warn(`Condition error for field ${field.name}:`, e);
          // Show the field if there's an error evaluating the condition
        }
      } else if (typeof field.admin.condition === "object") {
        try {
          const shouldShow = evaluateDeclarativeCondition(field.admin.condition as DeclarativeCondition, currentData, formData);
          if (!shouldShow) {
            return null;
          }
        } catch (e) {
          console.warn(`Declarative condition error for field ${field.name}:`, e);
        }
      }
    }

    const value = currentData[field.name!];
    const error = errors[field.name!];

    const onFieldChange = (val: unknown) => {
      if (onParentChange) {
        onParentChange({ ...currentData, [field.name!]: val });
      } else {
        handleFieldChange(field.name!, val);
      }
    };

    if (field.type === "row" && "fields" in field) {
      const rowFields = (field as Field & { fields?: Field[] }).fields;
      return (
        <div
          key={field.name || `row-${Math.random()}`}
          className="kyro-form-row flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-end w-full"
        >
          {rowFields?.map((f: Field) => {
            const fAdmin = f.admin || {};
            const actionUrl = fAdmin?.action as string | undefined;

            if ((f.type === "button" || f.type === "action") && actionUrl) {
              const siblingEmailField = rowFields?.find(
                (ff: Field) => ff.type === "email",
              );
              return (
                <div key={f.name} className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const rowName = field.name as string | undefined;
                      const emailFieldName = siblingEmailField?.name as string | undefined;
                      let emailValue = emailFieldName ? formData[emailFieldName] : undefined;
                      if (!emailValue && rowName && typeof rowName === "string" && emailFieldName) {
                        emailValue = (formData[rowName] as Record<string, unknown>)?.[emailFieldName] as string | undefined;
                      }
                      if (!emailValue) return;

                      setLoadingFields((prev) => ({
                        ...prev,
                        [f.name as string]: true,
                      }));
                      try {
                        const response = await fetchWithAuth(resolveUrl(actionUrl), {
                          method: (fAdmin.method as string) || "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: emailValue }),
                        });
                        let result: { success?: boolean; message?: string; error?: string } = {};
                        try {
                          result = await response.json() as typeof result;
                        } catch {
                          result = {};
                        }
                        if (response.ok && result.success) {
                          onActionSuccess?.(
                            result.message || "Action completed successfully",
                          );
                        } else {
                          const errorMsg =
                            result.error ||
                            `Request failed (${response.status})`;
                          onActionError?.(errorMsg);
                        }
                      } catch (err: unknown) {
                        onActionError?.(
                          err instanceof Error ? err.message : "Error connecting to server",
                        );
                      } finally {
                        setLoadingFields((prev) => ({
                          ...prev,
                          [f.name as string]: false,
                        }));
                      }
                    }}
                    //@ts-ignore
                    disabled={loadingFields[f.name as string] || effectiveDisabled}
                    className="kyro-btn kyro-btn-primary px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loadingFields[f.name as string] ? "Sending..." : f.label || "Click"}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={f.name}
                className={f.type === "button" || f.type === "action" ? "flex-shrink-0" : "flex-1"}
                style={
                  fAdmin?.width ? { width: fAdmin.width as string, flex: "none" } : {}
                }
              >
                {renderField(f, parentData, onParentChange)}
              </div>
            );
          })}
        </div>
      );
    }

    switch (field.type) {
      case "tabs":
        return (
          <TabsLayout
            key={field.name || `tabs-layout`}
            field={field}
            formData={formData}
            onTabDataChange={(tabData) => {
              if (field.name) {
                setField(field.name, tabData);
              }
            }}
            renderField={(f, parentData, onChange) => renderField(f, parentData, onChange)}
          />
        );

      case "group":
        return (
          <GroupLayout
            key={field.name}
            field={field}
            value={value as Record<string, unknown> | null}
            onChange={onFieldChange}
            renderField={renderField}
          />
        );

      case "array":
        return (
          <ArrayLayout
            key={field.name}
            field={field}
            value={value as unknown[]}
            onChange={onFieldChange}
            renderField={renderField}
            disabled={effectiveDisabled}
          />
        );


      case "button":
      case "action": {
        const fieldName = field.name as string;
        const isLoading = loadingFields[fieldName];
        return (
          <div key={fieldName} className="kyro-form-field">
            <button
              type="button"
              disabled={isLoading || effectiveDisabled}
              onClick={async () => {
                const action = (field.admin?.action || (field as Record<string, unknown>).action) as string | undefined;
                const method =
                  (field.admin?.method || (field as Record<string, unknown>).method || "POST") as string;
                if (action) {
                  setLoadingFields((prev) => ({
                    ...prev,
                    [fieldName]: true,
                  }));
                  try {
                    const response = await fetchWithAuth(action, {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(formData),
                    });
                    await response.json();
                    if (response.ok) {
                      // handle result
                    } else {
                      // handle error
                    }
                  } catch (err) {
                    console.error("Error executing action:", err);
                  } finally {
                    setLoadingFields((prev) => ({
                      ...prev,
                      [fieldName]: false,
                    }));
                  }
                }
              }}
              className={`kyro-btn kyro-btn-md kyro-btn-secondary transition-all active:scale-95 whitespace-nowrap flex items-center gap-2 ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {isLoading && (
                <svg
                  className="animate-spin h-3 w-3 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isLoading ? "Processing..." : field.label || "Click"}
            </button>
          </div>
        );
      }

      case "relationship-block":
        return (
          <div key={field.name} className="kyro-form-field">
            <label className="kyro-form-label">
              {field.label || field.name}
              {field.required && (
                <span className="kyro-form-label-required">*</span>
              )}
            </label>
            <RelationshipBlockField
              relationTo={field.relationTo as string}
              hasMany={field.hasMany as boolean}
              selectedIds={Array.isArray(value) ? value : value ? [value] : []}
              onChange={(_field: string, newValue: unknown) => {
                onFieldChange(newValue);
              }}
              compact
            />
            {field.admin?.description ? (
              <p className="kyro-form-help">{String(field.admin?.description)}</p>
            ) : null}
          </div>
        );

      default:
        return (
          <FieldRenderer
            key={field.name || Math.random().toString()}
            field={field}
            value={value}
            onChange={onFieldChange}
            error={error}
            disabled={effectiveDisabled}
            formData={formData}
            siblingData={currentData}
            collectionSlug={collectionSlug}
            globalSlug={globalSlug}
          />
        );
    }
  };

  if (clientLoading || !config) {
    return (
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <Shimmer variant="text" className="w-1/3" />
          <Shimmer variant="text" className="w-2/3" />
        </div>
        <div className="space-y-4">
          <Shimmer variant="rect" count={4} />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-16">
        <AlertTriangle className="w-8 h-8 text-[var(--kyro-danger)]" />
        <p className="text-sm text-[var(--kyro-text-secondary)]">
          Failed to load document. Check your connection.
        </p>
        <button
          type="button"
          onClick={() => {
            setFetchError(false);
            setClientLoading(true);
            setRetryTick((n) => n + 1);
          }}
          className="kyro-btn kyro-btn-primary px-6 py-2 rounded-xl text-sm font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {layout !== "single" && (
        <AutoFormHeader
          collectionSlug={collectionSlug}
          globalSlug={globalSlug}
          documentStatus={documentStatus || "draft"}
          hasUnpublishedChanges={hasUnpublishedChanges}
          localSaveStatus={localSaveStatus}
          isDuplicating={isDuplicating}
          handleCreateNew={handleCreateNew}
          handleDuplicate={handleDuplicate}
          handleUnpublish={handleUnpublish}
          handleDelete={handleDelete}
          handlePublish={handlePublish}
          handleSaveDraft={handleSaveDraft}
          handleSchedulePublish={handleSchedulePublish}
          handleConflictOverride={() => forceSave()}
        />
      )}
      {layout === "single" && (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
            <div className="flex items-center gap-3 text-[11px] font-medium">
              {autoSaveStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-[var(--kyro-text-muted)]">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              )}
              {autoSaveStatus === "success" && (
                <span className="text-[var(--kyro-success)] flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  {lastSavedAt ? `Saved ${Math.floor((Date.now() - lastSavedAt) / 60000)}m ago` : "Saved"}
                </span>
              )}
              {autoSaveStatus === "retrying" && (
                <span className="text-[var(--kyro-warning)] flex items-center gap-1.5">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Retrying...
                </span>
              )}
              {autoSaveStatus === "offline" && (
                <span className="text-[var(--kyro-text-muted)]">Offline — cached locally</span>
              )}
              {autoSaveStatus === "error" && (
                <span className="text-[var(--kyro-danger)]">Save failed</span>
              )}
              {autoSaveStatus === "conflict" && (
                <span className="text-[var(--kyro-danger)]">Conflict detected</span>
              )}
              {hasUnsavedChanges && autoSaveStatus !== "saving" && autoSaveStatus !== "retrying" && autoSaveStatus !== "conflict" && (
                <span className="text-[var(--kyro-warning)]">Unsaved changes</span>
              )}
              {!hasUnsavedChanges && autoSaveStatus !== "success" && autoSaveStatus !== "saving" && autoSaveStatus !== "error" && (
                <span className="text-[var(--kyro-success)]">All changes saved</span>
              )}
            </div>
            <span className="text-[11px] text-[var(--kyro-text-muted)] opacity-60">
              {formData.updatedAt ? `Modified ${new Date(formData.updatedAt as string).toLocaleString()}` : ""}
            </span>
          </div>
          <button
            id="btn-save"
            type="button"
            style={{ width: 0, height: 0, opacity: 0, padding: 0, margin: 0, border: 'none', position: 'absolute' }}
            onClick={async () => {
              autoSaveSkipRef.current = true;
              try {
                window.dispatchEvent(new Event("kyro:global-save-start"));
                const response = await saveDocument(formData);
                if (response.ok) {
                  const result = await response.json();
                  const savedData = result.data || formData;
                  setFormData({ ...formData, ...savedData });
                  setLastSavedData({ ...formData, ...savedData });
                  onActionSuccess?.("Changes saved");
                  if (globalSlug) {
                    window.dispatchEvent(new Event("kyro:soft-reload"));
                  }
                }
              } catch (e) {
                console.error("Save error exception:", e);
                onActionError?.("Save failed: " + (e as Error).message);
              } finally {
                autoSaveSkipRef.current = false;
                window.dispatchEvent(new Event("kyro:global-save-end"));
              }
            }}
          />
        </>
      )}
      <main className="w-full pt-6 md:pt-0">
        <ErrorBoundary>
          {view === "edit" && (
            <AutoFormEditView
              config={config}
              layout={layout}
              collectionSlug={collectionSlug}
              renderField={renderField}
            />
          )}
          {view === "version" && (
            <AutoFormVersionView
              handleRestoreVersion={handleRestoreVersion}
              handleCompareVersions={handleCompareVersions}
              toggleCompareSelection={toggleCompareSelection}
            />
          )}
          {view === "api" && (
            <AutoFormApiView
              collectionSlug={collectionSlug}
              globalSlug={globalSlug}
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

// SEO Utilities
function stripHtml(html: string) {
  if (typeof html !== "string") return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}
