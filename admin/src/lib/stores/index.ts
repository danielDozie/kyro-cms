import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiPath, adminPath } from "../paths";

// ============================================================
// AUTH STORE
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  avatar?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export interface Permissions {
  collections?: Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }>;
  globals?: Record<string, { read: boolean; update: boolean }>;
  media?: { read: boolean; create: boolean; update: boolean; delete: boolean };
  users?: { read: boolean; create: boolean; update: boolean; delete: boolean };
  [key: string]: unknown;
}

interface AuthState {
  user: AuthUser | null;
  permissions: Permissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null, permissions?: Permissions | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  permissions: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user, permissions = null) =>
    set({
      user,
      permissions,
      isAuthenticated: !!user,
      isLoading: false,
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
      isAuthenticated: false,
      user: null,
      permissions: null,
    }),

  logout: () =>
    set({
      user: null,
      permissions: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    }),
}));

const API_BASE = apiPath;
const ADMIN_BASE = adminPath;

export async function verifyAuth(): Promise<{
  user: AuthUser | null;
  permissions: Permissions | null;
}> {
  try {
    const [meRes, accessRes] = await Promise.all([
      fetch(`${API_BASE}/auth/me`, { credentials: "include" }),
      fetch(`${API_BASE}/auth/access`, { credentials: "include" }),
    ]);

    if (!meRes.ok) {
      return { user: null, permissions: null };
    }

    const [meData, accessData] = await Promise.all([
      meRes.json(),
      accessRes.ok ? accessRes.json() : Promise.resolve(null),
    ]);

    return {
      user: meData.user || null,
      permissions: accessData || null,
    };
  } catch {
    return { user: null, permissions: null };
  }
}

export async function doLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    useAuthStore.getState().logout();
  }
}

export function redirectToLogin(): void {
  window.location.href = `${ADMIN_BASE}/login`;
}


// ============================================================
// TOAST STORE
// ============================================================

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (type, message) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }));
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),
}));

export const toast = {
  success: (message: string) =>
    useToastStore.getState().addToast("success", message),
  error: (message: string) =>
    useToastStore.getState().addToast("error", message),
  warning: (message: string) =>
    useToastStore.getState().addToast("warning", message),
  info: (message: string) =>
    useToastStore.getState().addToast("info", message),
};

// ============================================================
// THEME STORE
// ============================================================

export type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",

      setMode: (mode) => set({ mode }),

      toggleMode: () =>
        set((state) => ({ mode: state.mode === "light" ? "dark" : "light" })),
    }),
    {
      name: "kyro-theme",
    },
  ),
);

// ============================================================
// UI STORE
// ============================================================

export interface ModalConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: "default" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg" | "xl";
}

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  modal: {
    open: boolean;
    config: ModalConfig | null;
  };
  confirm: (config: ModalConfig) => void;
  alert: (config: Omit<ModalConfig, "onConfirm" | "cancelLabel">) => void;
  closeModal: () => void;

  activeModal: string | null; // Legacy for specific hardcoded modals
  openModal: (modal: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  modal: {
    open: false,
    config: null,
  },
  confirm: (config) => set({
    modal: {
      open: true,
      config: { ...config, variant: config.variant || "default" },
    }
  }),
  alert: (config) => set({
    modal: {
      open: true,
      config: { 
        ...config, 
        variant: config.variant || "default",
        confirmLabel: config.confirmLabel || "OK",
        onConfirm: () => set((s) => ({ modal: { ...s.modal, open: false } }))
      },
    }
  }),
  closeModal: () => set((state) => ({
    modal: { ...state.modal, open: false },
    activeModal: null
  })),

  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
}));

// ============================================================
// EDITOR STORE
// ============================================================

interface EditorState {
  editor: unknown;
  setEditor: (editor: unknown) => void;

  blockDrawerOpen: boolean;
  openBlockDrawer: (options?: { targetColumn?: number }) => void;
  closeBlockDrawer: () => void;
  toggleBlockDrawer: () => void;

  selectedBlock: string | null;
  setSelectedBlock: (block: string | null) => void;

  pendingInsert: {
    pos: number | null;
    column: number | null;
  };
  setPendingInsert: (pos: number | null, column?: number) => void;
  clearPendingInsert: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),

  blockDrawerOpen: false,
  openBlockDrawer: (options) =>
    set({
      blockDrawerOpen: true,
      pendingInsert: { pos: null, column: options?.targetColumn ?? null },
    }),
  closeBlockDrawer: () =>
    set({
      blockDrawerOpen: false,
      pendingInsert: { pos: null, column: null },
    }),
  toggleBlockDrawer: () =>
    set((state) => ({ blockDrawerOpen: !state.blockDrawerOpen })),

  selectedBlock: null,
  setSelectedBlock: (block) => set({ selectedBlock: block }),

  pendingInsert: { pos: null, column: null },
  setPendingInsert: (pos, column) =>
    set({ pendingInsert: { pos, column: column ?? null } }),
  clearPendingInsert: () => set({ pendingInsert: { pos: null, column: null } }),
}));

// ============================================================
// DATA STORE
// ============================================================

interface DataCache<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

interface DataStore {
  cache: Record<string, DataCache<unknown>>;
  setCache: (key: string, data: unknown) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string) => void;
  getCache: (key: string) => DataCache<unknown> | null;
  invalidateCache: (key?: string) => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
  cache: {},

  setCache: (key, data) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: { data, loading: false, error: null, lastFetch: Date.now() },
      },
    })),

  setLoading: (key, loading) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: { ...state.cache[key], loading, error: null },
      },
    })),

  setError: (key, error) =>
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: { data: null, loading: false, error, lastFetch: null },
      },
    })),

  getCache: (key) => get().cache[key] || null,

  invalidateCache: (key) =>
    set((state) => {
      if (key) {
        const { [key]: _, ...rest } = state.cache;
        return { cache: rest };
      }
      return { cache: {} };
    }),
}));
