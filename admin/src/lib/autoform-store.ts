import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import { createStorage } from "unstorage";
import indexedbDriver from "unstorage/drivers/indexedb";
import type { Version, VersionDiff } from "@kyro-cms/core/client";
import { deepEqual, isEmpty } from "./deep-equal";
import { normalizeUploadFields } from "./normalize-upload-fields";

let storageInstance: ReturnType<typeof createStorage> | null = null;
let storageReady = false;

const getStorage = async () => {
  if (storageInstance && storageReady) {
    return storageInstance;
  }

  storageInstance = createStorage({
    driver: indexedbDriver({
      dbName: "kyro-autosave",
      storeName: "autosave",
    }),
  });

  storageReady = true;
  return storageInstance;
};

const createAutoFormStorage = (): StateStorage => {
  if (typeof window === "undefined") {
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }

  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const store = await getStorage();
        const value = await store.getItem<string>(name);
        return value ?? null;
      } catch (e) {
        console.error("Storage getItem error:", e);
        return localStorage.getItem(name);
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const store = await getStorage();
        await store.setItem(name, value);
      } catch (e) {
        console.error("Storage setItem error:", e);
        localStorage.setItem(name, value);
      }
    },
    removeItem: async (name: string): Promise<void> => {
      try {
        const store = await getStorage();
        await store.removeItem(name);
      } catch (e) {
        console.error("Storage removeItem error:", e);
        localStorage.removeItem(name);
      }
    },
  };
};

type AutoSaveStatus = "idle" | "saving" | "success" | "error" | "conflict" | "retrying" | "offline";

interface AutoFormStore {
   // In-memory document state
   formData: Record<string, unknown>;
   lastSavedData: Record<string, unknown>;
   sidebarCollapsed: boolean;
   draftCache: Record<string, BrowserDraftCacheEntry>;

   // Dirty field tracking (not persisted)
   dirtyFields: Set<string>;

   // UI State (not persisted)
   activeTab: number;
   isSlugLocked: boolean;
   view: "edit" | "version" | "api";
   isDropdownOpen: boolean;
   versions: Version[];
   loadingVersions: boolean;
   showPreview: boolean;
   previewUrl: string | null;
   isMenuOpen: boolean;
   hasUnsavedChanges: boolean;
   loadingFields: Record<string, boolean>;
   compareMode: boolean;
   compareSelected: string[];
   compareDiffs: VersionDiff[];
   loadingDiffs: boolean;
    isAutoSaving: boolean;
    autoSaveStatus: AutoSaveStatus;
    backgroundProcessing: boolean;

   // Auto-save
    lastAutoSaveTime: number;
    lastSavedAt: number | null;
    retryCount: number;
    autoSaveSkip: boolean;
    autoSaveTimer: NodeJS.Timeout | null;
   // Actions - Field Updates
   setField: (field: string, value: unknown) => void;
   setFormData: (data: Record<string, unknown>) => void;
   setLastSavedData: (data: Record<string, unknown>) => void;
   setNestedField: (path: string, value: unknown) => void;

  // Actions - UI State
  setActiveTab: (tab: number) => void;
  setIsSlugLocked: (locked: boolean | ((prev: boolean) => boolean)) => void;
  setView: (view: "edit" | "version" | "api") => void;
  setIsDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setVersions: (versions: Version[]) => void;
  setLoadingVersions: (loading: boolean) => void;
  setShowPreview: (show: boolean | ((prev: boolean) => boolean)) => void;
  setPreviewUrl: (url: string | null) => void;
  setIsMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setLoadingFields: (fields: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  updateLoadingField: (field: string, loading: boolean) => void;
  setCompareMode: (mode: boolean) => void;
  setCompareSelected: (selected: string[] | ((prev: string[]) => string[])) => void;
  setCompareDiffs: (diffs: VersionDiff[]) => void;
  setLoadingDiffs: (loading: boolean) => void;
  setIsAutoSaving: (saving: boolean) => void;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
  setBackgroundProcessing: (processing: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLastSavedAt: (time: number | null) => void;
  setRetryCount: (count: number) => void;

  // Auto-save actions
  setAutoSaveSkip: (skip: boolean) => void;
  setLastAutoSaveTime: (time: number) => void;
  startAutoSaveTimer: (callback: () => void, delay: number) => void;
  clearAutoSaveTimer: () => void;


  // Actions - Data Management
  markSaved: () => void;
  resetForm: () => void;
loadDocument: (
     data: Record<string, unknown>,
     lastSaved?: Record<string, unknown>,
   ) => void;

   getField: (field: string) => unknown;
   getNestedField: (path: string) => unknown;
  getHasChanges: () => boolean;
  hasDirtyFields: () => boolean;
  getDirtyData: () => Record<string, unknown>;
  clearDirtyFields: () => void;
  pruneExpiredDrafts: () => void;
  setDraftCache: (documentKey: string, draft: BrowserDraftCacheEntry) => void;
  getDraftCache: (documentKey: string) => BrowserDraftCacheEntry | null;
  clearDraftCache: (documentKey: string) => void;
}

export interface BrowserDraftCacheEntry {
   data: Record<string, unknown>;
  baseUpdatedAt?: string | null;
  draftUpdatedAt: string;
  lastSyncedAt?: string | null;
}

export const useAutoFormStore = create<AutoFormStore>()(
  persist(
    (set, get) => ({
      // Initial persisted state
      formData: {},
      lastSavedData: {},
      sidebarCollapsed: false,
      draftCache: {},

      // Dirty field tracking
      dirtyFields: new Set<string>(),

      // Initial UI state
      activeTab: 0,
      isSlugLocked: true,
      view: "edit",
      isDropdownOpen: false,
      versions: [],
      loadingVersions: false,
      showPreview: false,
      previewUrl: null,
      isMenuOpen: false,
      hasUnsavedChanges: false,
      loadingFields: {},
      compareMode: false,
      compareSelected: [],
      compareDiffs: [],
      loadingDiffs: false,
      isAutoSaving: false,
      autoSaveStatus: "idle" as AutoSaveStatus,
      backgroundProcessing: false,

      // Auto-save state
      lastAutoSaveTime: 0,
      lastSavedAt: null,
      retryCount: 0,
      autoSaveSkip: false,
      autoSaveTimer: null,


      // Field update actions
        setField: (field: string, value: unknown) => {
         if (!field || field === "undefined") return;
         const state = get();
         const newDirty = new Set(state.dirtyFields);
         // Mark dirty if value differs from last saved baseline (normalized to strip full media details)
         const normalizedValue = normalizeUploadFields(value);
         const normalizedLastSaved = normalizeUploadFields(state.lastSavedData[field]);
         if (isEmpty(normalizedValue) && isEmpty(normalizedLastSaved)) {
           newDirty.delete(field);
         } else if (!deepEqual(normalizedValue, normalizedLastSaved)) {
           newDirty.add(field);
         } else {
           newDirty.delete(field);
         }
         const nextFormData = { ...state.formData };
         delete nextFormData.undefined;
         delete nextFormData["undefined"];
         nextFormData[field] = value;
         set({
           formData: nextFormData,
           dirtyFields: newDirty,
           hasUnsavedChanges: newDirty.size > 0,
         });
       },

       setFormData: (data: Record<string, unknown>) => {
         const cleanData = { ...data };
         delete cleanData.undefined;
         delete cleanData["undefined"];
         set({ formData: cleanData });
       },

       setNestedField: (path: string, value: unknown) => {
         set((state) => {
           const keys = path.split(".");
           const newFormData = { ...state.formData };
           let current: Record<string, unknown> = newFormData;

          for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] === undefined) {
              current[keys[i]] = {};
            }
            const nextVal = current[keys[i]] as Record<string, unknown>;
            current[keys[i]] = { ...nextVal };
            current = current[keys[i]] as Record<string, unknown>;
          }

          current[keys[keys.length - 1]] = value;
          delete newFormData.undefined;
          delete newFormData["undefined"];

          return { formData: newFormData };
        });
      },

      // UI state actions
      setActiveTab: (tab: number) => set({ activeTab: tab }),
      setIsSlugLocked: (locked) =>
        set((state) => ({
          isSlugLocked:
            typeof locked === "function" ? locked(state.isSlugLocked) : locked,
        })),
      setView: (view) => set({ view }),
      setIsDropdownOpen: (open) =>
        set((state) => ({
          isDropdownOpen:
            typeof open === "function" ? open(state.isDropdownOpen) : open,
        })),
      setVersions: (versions: Version[]) => set({ versions }),
      setLoadingVersions: (loading: boolean) =>
        set({ loadingVersions: loading }),
      setShowPreview: (show) =>
        set((state) => ({
          showPreview:
            typeof show === "function" ? show(state.showPreview) : show,
        })),
      setPreviewUrl: (previewUrl) => set({ previewUrl }),
      setIsMenuOpen: (open) =>
        set((state) => ({
          isMenuOpen: typeof open === "function" ? open(state.isMenuOpen) : open,
        })),
      setHasUnsavedChanges: (hasChanges: boolean) =>
        set({ hasUnsavedChanges: hasChanges }),
      setLoadingFields: (fields) =>
        set((state) => ({
          loadingFields:
            typeof fields === "function" ? fields(state.loadingFields) : fields,
        })),
      updateLoadingField: (field, loading) =>
        set((state) => ({
          loadingFields: { ...state.loadingFields, [field]: loading },
        })),
      setCompareMode: (mode: boolean) => set({ compareMode: mode }),
      setCompareSelected: (selected) =>
        set((state) => ({
          compareSelected:
            typeof selected === "function"
              ? selected(state.compareSelected)
              : selected,
        })),
      setCompareDiffs: (diffs: VersionDiff[]) => set({ compareDiffs: diffs }),
      setLoadingDiffs: (loading: boolean) => set({ loadingDiffs: loading }),
      setIsAutoSaving: (saving: boolean) => set({ isAutoSaving: saving }),
      setAutoSaveStatus: (status: AutoSaveStatus) => set({ autoSaveStatus: status }),
      setBackgroundProcessing: (processing: boolean) => set({ backgroundProcessing: processing }),
      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),
      setLastSavedAt: (time: number | null) => set({ lastSavedAt: time }),
      setRetryCount: (count: number) => set({ retryCount: count }),

      // Auto-save actions
      setAutoSaveSkip: (skip: boolean) => set({ autoSaveSkip: skip }),
      setLastAutoSaveTime: (time: number) => set({ lastAutoSaveTime: time }),

      startAutoSaveTimer: (callback: () => void, delay: number) => {
        const { autoSaveTimer } = get();
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer);
        }
        const timer = setTimeout(callback, delay);
        set({ autoSaveTimer: timer as any });
      },

      clearAutoSaveTimer: () => {
        const { autoSaveTimer } = get();
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer);
          set({ autoSaveTimer: null });
        }
      },

      // Data management
      markSaved: () => {
        const { formData } = get();
        set({
          lastSavedData: formData,
          hasUnsavedChanges: false,
          dirtyFields: new Set<string>(),
          lastSavedAt: Date.now(),
        });
      },

      setLastSavedData: (data: Record<string, unknown>) => {
        set({ lastSavedData: data });
      },

      resetForm: () => {
        set({
          formData: {},
          lastSavedData: {},
          hasUnsavedChanges: false,
          dirtyFields: new Set<string>(),
          activeTab: 0,
        });
      },

      loadDocument: (
        data: Record<string, unknown>,
        lastSaved?: Record<string, unknown>,
      ) => {
        const cleanData = { ...data };
        delete cleanData.undefined;
        delete cleanData["undefined"];
        const cleanLastSaved = lastSaved ? { ...lastSaved } : cleanData;
        delete cleanLastSaved.undefined;
        delete cleanLastSaved["undefined"];

        const state = get();
        if (
          state.formData === cleanData &&
          state.lastSavedData === cleanLastSaved &&
          !state.hasUnsavedChanges
        ) {
          return;
        }
        set({
          formData: cleanData,
          lastSavedData: cleanLastSaved,
          hasUnsavedChanges: false,
          dirtyFields: new Set<string>(),
        });
      },

      // Computed values
      getField: (field: string) => {
        return get().formData[field];
      },

      getNestedField: (path: string) => {
        const keys = path.split(".");
        let current: unknown = get().formData;

        for (const key of keys) {
          if (current === undefined || current === null) return undefined;
          current = (current as Record<string, unknown>)[key];
        }

        return current;
      },

      getHasChanges: () => {
        return get().dirtyFields.size > 0;
      },

      hasDirtyFields: () => {
        return get().dirtyFields.size > 0;
      },

      getDirtyData: () => {
        const { formData, dirtyFields } = get();
        const delta: Record<string, unknown> = {};
        for (const field of dirtyFields) {
          delta[field] = formData[field];
        }
        return delta;
      },

      clearDirtyFields: () => {
        set({ dirtyFields: new Set<string>(), hasUnsavedChanges: false });
      },

      pruneExpiredDrafts: () => {
        const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
        const now = Date.now();
        const { draftCache } = get();
        const pruned: Record<string, BrowserDraftCacheEntry> = {};
        for (const [key, entry] of Object.entries(draftCache)) {
          if (now - new Date(entry.draftUpdatedAt).getTime() < DRAFT_TTL_MS) {
            pruned[key] = entry;
          }
        }
        set({ draftCache: pruned });
      },

      setDraftCache: (documentKey, draft) =>
        set((state) => ({
          draftCache: {
            ...state.draftCache,
            [documentKey]: draft,
          },
        })),

      getDraftCache: (documentKey) => get().draftCache[documentKey] || null,

      clearDraftCache: (documentKey) =>
        set((state) => {
          const next = { ...state.draftCache };
          delete next[documentKey];
          return { draftCache: next };
        }),
    }),
    {
      name: "kyro-autoform-storage",
      storage: createJSONStorage(() => createAutoFormStorage()),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        draftCache: state.draftCache,
      }),
      onRehydrateStorage: () => (state) => {
        // Prune expired drafts on hydration
        if (state) {
          state.pruneExpiredDrafts();
        }
      },
    },
  ),
);

// Helper hook to get field value with tab support
export function useAutoFormField(
   fieldName: string,
   tabData?: Record<string, unknown>,
) {
  const formData = useAutoFormStore((s) => s.formData);
  const setField = useAutoFormStore((s) => s.setField);
  const setNestedField = useAutoFormStore((s) => s.setNestedField);

  // If tabData is provided, look inside it first (for fields inside tabs)
  if (tabData !== undefined) {
    return {
      value: tabData[fieldName],
      onChange: (value: unknown) => {
        return value;
      },
    };
  }

  return {
    value: formData[fieldName],
    onChange: (value: unknown) => setField(fieldName, value),
  };
}

