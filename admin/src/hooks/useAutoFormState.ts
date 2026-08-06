import { useEffect, useRef, useCallback } from "react";
import { useAutoFormStore } from "../lib/autoform-store";
import { getLastChangeSource, setChangeSource } from "../lib/change-source";
import { slugifyText } from "../lib/slugify";
import { resolveUrl, fetchWithAuth } from "../lib/api";
import { normalizeUploadFields } from "../lib/normalize-upload-fields";
import { useUIStore } from "../lib/stores";
import { resolveFieldValue } from "../lib/resolve-field-value";
import { useQueue } from "./useQueue";

interface UseAutoFormStateProps {
  config: Record<string, unknown>;
  initialData: Record<string, unknown>;
  collectionSlug?: string;
  globalSlug?: string;
  documentId?: string;
  onChange?: (data: Record<string, unknown>) => void;
  onActionSuccess?: (msg: string) => void;
  onActionError?: (msg: string) => void;
}

export function useAutoFormState({
  config,
  initialData,
  collectionSlug,
  globalSlug,
  documentId,
  onChange,
  onActionSuccess,
  onActionError,
}: UseAutoFormStateProps) {
  const store = useAutoFormStore();
  const { confirm } = useUIStore();
  const {
    formData,
    setFormData,
    setField,
    lastSavedData,
    setLastSavedData,
    setHasUnsavedChanges,
    isSlugLocked,
    loadDocument,
    setIsAutoSaving,
    setAutoSaveStatus,
    setVersions,
    setLoadingVersions,
    sidebarCollapsed,
    setSidebarCollapsed,
    getDraftCache,
    setDraftCache,
    clearDraftCache,
    resetForm,
  } = store;

  const versionsEnabled = !!config?.versions;

  // Guard: clear stale formData from a previous page context.
  // For collections, if the loaded document's id doesn't match the expected
  // context key, the singleton zustand store is holding stale data.
  // Globals have no id field and are singleton per slug, so skip this check.
  // Must run in useEffect — calling resetForm() during render triggers
  // "Cannot update a component while rendering" React error.
  const currentContextKey = globalSlug || (initialData?.id as string | undefined) || documentId || collectionSlug;
  const needsResetRef = useRef(false);
  if (
    !globalSlug &&
    currentContextKey &&
    formData &&
    Object.keys(formData).length > 0 &&
    formData.id !== currentContextKey
  ) {
    needsResetRef.current = true;
  }

  useEffect(() => {
    if (needsResetRef.current) {
      needsResetRef.current = false;
      resetForm();
    }
  }, [resetForm]);

  const localSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const serverSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const lastAutoSaveTimeRef = useRef<number>(0);
  const autoSaveSkipRef = useRef<boolean>(false);
  const restorePromptedRef = useRef<string | null>(null);
  const previousFormDataRef = useRef<string>("");
  const astroSyncDataRef = useRef<string>("");
  const { queueTask } = useQueue();

  const getDocumentKey = useCallback(
    (id?: string) => {
      if (globalSlug) return `global:${globalSlug}`;
      if (collectionSlug && id) return `${collectionSlug}:${id}`;
      return null;
    },
    [collectionSlug, globalSlug],
  );

const persistBrowserDraft = useCallback(
     (
       documentKey: string,
       data: Record<string, unknown>,
      options?: { lastSyncedAt?: string | null },
    ) => {
      setDraftCache(documentKey, {
        data,
        baseUpdatedAt: (lastSavedData.updatedAt as string) ?? null,
        draftUpdatedAt: new Date().toISOString(),
        lastSyncedAt: options?.lastSyncedAt ?? null,
      });
    },
    [lastSavedData.updatedAt, setDraftCache],
  );

  const fetchVersions = useCallback(async () => {
    const url = globalSlug 
      ? resolveUrl(`/api/globals/${globalSlug}/versions`)
      : collectionSlug && formData.id 
        ? resolveUrl(`/api/${collectionSlug}/${formData.id}/versions`)
        : null;

    if (!url) return;
    setLoadingVersions(true);
    try {
      const resp = await fetchWithAuth(url);
      const data = await resp.json();
      setVersions(data.docs || []);
    } catch (e) {
      console.error("Failed to fetch versions:", e);
    } finally {
      setLoadingVersions(false);
    }
  }, [formData.id, collectionSlug, globalSlug, setLoadingVersions, setVersions]);

  const performLocalAutoSave = useCallback(() => {
    const state = useAutoFormStore.getState();
    const latestFormData = state.formData;
    if (autoSaveSkipRef.current || !collectionSlug || !latestFormData.id) return;
    if (!state.hasDirtyFields()) return;
    const documentKey = getDocumentKey(latestFormData.id as string);
    if (documentKey) {
      persistBrowserDraft(documentKey, latestFormData);
    }
  }, [collectionSlug, getDocumentKey, persistBrowserDraft]);

  const doAutosaveFetch = useCallback(async (options?: { keepalive?: boolean }) => {
    const state = useAutoFormStore.getState();
    const latestFormData = state.formData;
    const currentLastSaved = state.lastSavedData;

    if (autoSaveSkipRef.current) return;
    if (!globalSlug && (!collectionSlug || !latestFormData.id)) return;
    if (!state.hasDirtyFields()) return;

    const documentKey = getDocumentKey(latestFormData.id as string);
    if (documentKey) {
      persistBrowserDraft(documentKey, latestFormData);
    }

    if (!isOnlineRef.current) {
      setAutoSaveStatus("offline");
      return;
    }

    setIsAutoSaving(true);
    setAutoSaveStatus("saving");
    state.setBackgroundProcessing(true);

    if (globalSlug) {
      window.dispatchEvent(new Event("kyro:global-save-start"));
    }

    try {
      const url = globalSlug
        ? resolveUrl(`/api/globals/${globalSlug}?autosave=true`)
        : resolveUrl(`/api/${collectionSlug}/${latestFormData.id}?autosave=true`);

      const response = await fetchWithAuth(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Draft": "true",
        },
        keepalive: options?.keepalive,
        body: JSON.stringify({
          ...(normalizeUploadFields(latestFormData, true) as Record<string, unknown>),
          baseUpdatedAt: currentLastSaved.updatedAt ?? null,
        }),
      });

      if (response.ok) {
        lastAutoSaveTimeRef.current = Date.now();
        state.setRetryCount(0);
        state.setLastSavedAt(Date.now());
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

        if (documentKey) {
          setDraftCache(documentKey, {
            data: latestFormData,
            baseUpdatedAt: (currentLastSaved.updatedAt as string) ?? null,
            draftUpdatedAt: new Date().toISOString(),
            lastSyncedAt: (await response.clone().json()).data?.updatedAt || new Date().toISOString(),
          });
        }
        setAutoSaveStatus("success");
        setTimeout(() => {
          if (useAutoFormStore.getState().autoSaveStatus === "success") {
            setAutoSaveStatus("idle");
          }
        }, 2000);
      } else if (response.status === 409) {
        setAutoSaveStatus("conflict");
      } else {
        throw new Error(`Draft auto-save failed with status ${response.status}`);
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
      const currentState = useAutoFormStore.getState();
      const currentRetryCount = currentState.retryCount;
      if (currentRetryCount < 5) {
        currentState.setRetryCount(currentRetryCount + 1);
        setAutoSaveStatus("retrying");
        const delay = Math.min(1000 * Math.pow(2, currentRetryCount), 60000);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => performAutosave(options), delay);
      } else {
        setAutoSaveStatus("offline");
      }
    } finally {
      if (globalSlug) {
        window.dispatchEvent(new Event("kyro:global-save-end"));
      }
      setIsAutoSaving(false);
      useAutoFormStore.getState().setBackgroundProcessing(false);
    }
  }, [
    collectionSlug,
    getDocumentKey,
    globalSlug,
    persistBrowserDraft,
    setAutoSaveStatus,
    setDraftCache,
    setIsAutoSaving,
    versionsEnabled,
  ]);

  const performAutosave = useCallback((options?: { keepalive?: boolean }) => {
    queueTask(
      () => doAutosaveFetch(options),
      {
        beforeProcess: () => {
          return true;
        },
        afterProcess: () => {
          // Background processing complete
        },
      },
    );
  }, [doAutosaveFetch, queueTask]);

  const saveDocument = useCallback(
     async (dataOverride?: Record<string, unknown>, isDraft = true) => {
      const state = useAutoFormStore.getState();
      const payload = dataOverride || state.formData;
      
      const url = globalSlug 
        ? resolveUrl(`/api/globals/${globalSlug}`)
        : resolveUrl(`/api/${collectionSlug}/${payload.id}`);

      const response = await fetchWithAuth(
        url,
        {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "X-Draft": String(isDraft),
          },
          body: JSON.stringify({
            ...normalizeUploadFields(payload, true) as Record<string, unknown>,
            baseUpdatedAt: state.lastSavedData.updatedAt ?? null,
          }),
        },
      );

      if (response.status === 409) {
        setAutoSaveStatus("conflict");
      }

      return response;
    },
    [collectionSlug, globalSlug, setAutoSaveStatus],
  );

  // Force-save: retries without baseUpdatedAt to bypass OCC (conflict override)
  const forceSave = useCallback(
    async (isDraft = true) => {
      const state = useAutoFormStore.getState();
      const payload = state.formData;

      const url = globalSlug
        ? resolveUrl(`/api/globals/${globalSlug}`)
        : resolveUrl(`/api/${collectionSlug}/${payload.id}`);

      const response = await fetchWithAuth(
        url,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Draft": String(isDraft),
          },
          body: JSON.stringify({
            ...normalizeUploadFields(payload, true) as Record<string, unknown>,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        const savedData = result.data || payload;
        state.loadDocument(savedData, savedData);
        setAutoSaveStatus("success");
        setTimeout(() => {
          if (useAutoFormStore.getState().autoSaveStatus === "success") {
            setAutoSaveStatus("idle");
          }
        }, 2000);
      }

      return response;
    },
    [collectionSlug, globalSlug, setAutoSaveStatus],
  );

  // Track sidebar toggle
  useEffect(() => {
    const handleToggle = () => {
      setSidebarCollapsed(!sidebarCollapsed);
    };
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  // Track unsaved changes (handled by setField / dirtyFields now)

  // Initial data load
  const lastLoadedSlugRef = useRef<string | null>(null);
  const lastInitialDataRef = useRef<string>("");
  const initialDataLoadedRef = useRef(false);
  useEffect(() => {
    const currentSlug = globalSlug || (initialData?.id as string);
    const serialized = JSON.stringify(initialData);
    if (initialDataLoadedRef.current && lastLoadedSlugRef.current === currentSlug && lastInitialDataRef.current === serialized) return;

    loadDocument(initialData || {}, initialData || {});
    initialDataLoadedRef.current = true;
    lastLoadedSlugRef.current = currentSlug;
    lastInitialDataRef.current = serialized;
  }, [collectionSlug, formData.id, globalSlug, initialData, loadDocument]);

  useEffect(() => {
    if (!collectionSlug || !initialData?.id) return;

    const documentKey = getDocumentKey(formData.id as string);
    if (!documentKey) return;
    if (restorePromptedRef.current === documentKey) return;

    let cancelled = false;

    const maybeRestoreDraft = async () => {
      if (!versionsEnabled) return;
      const browserDraft = getDraftCache(documentKey);

      if (!browserDraft) return;
      if (JSON.stringify(browserDraft.data) === JSON.stringify(initialData)) {
        clearDraftCache(documentKey);
        return;
      }

      restorePromptedRef.current = documentKey;

      confirm({
        title: "Restore draft?",
        message:
          "A newer autosaved draft was found for this document. Restore it or discard it and continue with the saved version.",
        confirmLabel: "Restore draft",
        cancelLabel: "Discard draft",
        onConfirm: async () => {
          if (cancelled) return;
          const currentFormData = useAutoFormStore.getState().formData;
          const mergedData = { ...currentFormData, ...browserDraft.data };
          setFormData(mergedData);
          onActionSuccess?.("Recovered autosaved draft");
        },
        onCancel: async () => {
          clearDraftCache(documentKey);
        },
      });
    };

    maybeRestoreDraft();

    return () => {
      cancelled = true;
    };
  }, [
    clearDraftCache,
    collectionSlug,
    confirm,
    getDocumentKey,
    getDraftCache,
    initialData,
    onActionSuccess,
    setFormData,
    versionsEnabled,
  ]);

  // Recursively find a field by name inside tabs/group/collapsible
  function findFieldDeep(fields: Record<string, any>[], name: string): Record<string, any> | undefined {
    for (const f of fields) {
      if (f.name === name && f.admin?.autoGenerate === "title") return f;
      if (f.type === "tabs" && "tabs" in f) {
        for (const tab of f.tabs) {
          const found = findFieldDeep(tab.fields, name);
          if (found) return found;
        }
      }
      if ((f.type === "group" || f.type === "collapsible") && "fields" in f) {
        const found = findFieldDeep(f.fields, name);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Auto-generate metaTitle
  useEffect(() => {
    if (!config?.fields) return;
    const fields = config.fields as Record<string, unknown>[];
    const metaTitleField = findFieldDeep(fields, "metaTitle");
    if (!metaTitleField) return;

    const titleValue = resolveFieldValue(fields, formData, "title");
    const titleStr = titleValue ? String(titleValue) : "";

    if (titleStr && (!formData.metaTitle || formData.metaTitle === formData._lastMetaTitle)) {
      if (formData.metaTitle !== titleStr) {
        useAutoFormStore.setState((state) => ({
          formData: {
            ...state.formData,
            metaTitle: titleStr,
            _lastMetaTitle: titleStr,
          },
        }));
      }
    }
  }, [formData, config?.fields]);

  interface FieldConfig {
    name?: string;
    admin?: {
      autoGenerate?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  // Auto-generate slug
  useEffect(() => {
    const fields = config?.fields as FieldConfig[];
    const slugField = fields?.find(
      (f: FieldConfig) => f.name === "slug" && f.admin?.autoGenerate,
    );
    if (!slugField?.admin?.autoGenerate) return;
    const sourceField: string = slugField.admin.autoGenerate;

    const sourceValue = resolveFieldValue(fields, formData, sourceField);

    if (isSlugLocked && typeof sourceValue === "string" && sourceValue) {
      const newSlug = slugifyText(sourceValue);
      if (newSlug && newSlug !== formData.slug) {
        useAutoFormStore.setState((state) => ({
          formData: {
            ...state.formData,
            slug: newSlug,
          },
        }));
      }
    }
  }, [formData, isSlugLocked, config?.fields]);

  // Auto-save effect — only starts timers on keystroke-originated changes.
  // Local save fires after 1.5s of inactivity, server save after 8s.
  // Non-keystroke changes (block add/drag, select, checkbox, etc.) do NOT restart auto-save.
  useEffect(() => {
    if (sidebarCollapsed) return;
    if (!globalSlug && (!collectionSlug || !formData.id)) return;

    const state = useAutoFormStore.getState();
    if (!state.hasDirtyFields()) return;

    // Only schedule/reschedule on keystroke-originated changes
    if (getLastChangeSource() !== "keystroke") return;
    setChangeSource("other");

    // Compare serialized form data to avoid scheduling for unchanged metadata
    const serialized = JSON.stringify(formData);
    if (serialized === previousFormDataRef.current) return;

    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(performLocalAutoSave, 1500);

    // Queue autosave via the queue (debounced at 8s)
    if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = setTimeout(() => {
      previousFormDataRef.current = serialized;
      performAutosave();
    }, 8000);
  }, [formData, sidebarCollapsed, collectionSlug, globalSlug, performLocalAutoSave, performAutosave]);

  useEffect(() => {
    if (!globalSlug && (!collectionSlug || !formData.id)) return;

    const flushDraft = () => {
      if (autoSaveSkipRef.current) return;
      const state = useAutoFormStore.getState();
      if (!state.hasDirtyFields()) return;
      void performAutosave({ keepalive: true });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushDraft();
      }
    };

    const handleOnline = () => {
      isOnlineRef.current = true;
      flushDraft();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      const state = useAutoFormStore.getState();
      if (state.hasDirtyFields()) {
         state.setAutoSaveStatus("offline");
      }
    };

    window.addEventListener("blur", flushDraft);
    window.addEventListener("pagehide", flushDraft);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", flushDraft);
      window.removeEventListener("pagehide", flushDraft);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [collectionSlug, globalSlug, formData.id, performAutosave]);

  // Astro sync — avoid ping-pong loop with DetailView's setData
  useEffect(() => {
    const serialized = JSON.stringify(formData);
    if (serialized === astroSyncDataRef.current) return;
    astroSyncDataRef.current = serialized;

    const hiddenInput = document.getElementById("form-data") as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.value = serialized;
    }
    onChange?.(formData);
  }, [formData, onChange]);

  // Fetch versions on load
  useEffect(() => {
    if (globalSlug || formData.id) fetchVersions();
  }, [formData.id, globalSlug, fetchVersions]);

  // Derived status values the UI can use for badges and button state
  const documentStatus: 'draft' | 'published' | 'archived' | undefined = (() => {
    if (!formData.id && !globalSlug) return 'draft';
    if (!versionsEnabled) return 'published';
    return (formData.status as 'draft' | 'published' | undefined) || 'published';
  })();

  const hasUnpublishedChanges =
    !!formData._hasUnpublishedChanges ||
    ((!!formData.id || !!globalSlug) && documentStatus === 'draft');

  return {
    ...store,
    fetchVersions,
    performAutoSave: performAutosave,
    saveDocument,
    forceSave,
    autoSaveSkipRef,
    lastAutoSaveTimeRef,
    documentStatus,
    hasUnpublishedChanges,
    versionsEnabled,
  };
}
