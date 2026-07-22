import { useState, useEffect, useMemo } from "react";
import { apiPost } from "../lib/api";
import { toast, useAuthStore, type AuthUser } from "../lib/stores";
import type { CollectionConfig, GlobalConfig } from "@kyro-cms/core/client";
import { ListView } from "./ListView";
import { DetailView } from "./DetailView";
import { CreateView } from "./CreateView";
import { LoginPage } from "./LoginPage";
import { Dashboard } from "./Dashboard";
import { UserManagement } from "./UserManagement";
import { BrandingHub } from "./BrandingHub";
import { DeveloperCenter } from "./DeveloperCenter";
import { WebhookManager } from "./WebhookManager";
import { MediaGallery } from "./MediaGallery";
import { CommandPalette } from "./ui/CommandPalette";
import { GlobalModal } from "./ui/GlobalModal";
import { Toaster } from "./ui/Toaster";
import { ThemeProvider, type ThemeMode } from "./ThemeProvider";
import { toArray, toCollectionMap, toGlobalMap } from "../lib/config";
import "../styles/main.css";

type View =
  | "list"
  | "detail"
  | "create"
  | "settings"
  | "users"
  | "roles"
  | "audit"
  | "media"
  | "branding"
  | "developer"
  | "webhooks";

export interface KyroAdminConfig {
  collections?: CollectionConfig[] | Record<string, CollectionConfig>;
  globals?: GlobalConfig[] | Record<string, GlobalConfig>;
  adapter?: unknown;
  name?: string;
}

interface AdminProps {
  config: KyroAdminConfig;
  theme?: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
}

export function Admin({ config, theme = "light", onThemeChange }: AdminProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const collections = useMemo(
    () => toCollectionMap(toArray(config.collections)),
    [config.collections],
  );

  const globals = useMemo(
    () => toGlobalMap(toArray(config.globals)),
    [config.globals],
  );

  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeGlobal, setActiveGlobal] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>("list");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    // Basic session check
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
          setAuthenticated(true);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated && !activeCollection) {
      const firstCol = Object.keys(collections)[0];
      if (firstCol) setActiveCollection(firstCol);
    }
  }, [authenticated, collections, activeCollection]);

  const handleNavigate = (view: View, collection: string | null = null, id: string | null = null) => {
    setCurrentView(view);
    if (collection) setActiveCollection(collection);
    if (id) setActiveDocumentId(id);
    setIsCommandPaletteOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    (window as { openCommandPalette?: () => void }).openCommandPalette = () => setIsCommandPaletteOpen(true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      delete (window as { openCommandPalette?: () => void }).openCommandPalette;
    };
  }, []);

  const handleLogin = async (data: Record<string, unknown>) => {
    try {
      const response = await apiPost<any>("/api/users/login", data);
      if (response.user) {
        setCurrentUser(response.user);
        setAuthenticated(true);
        toast.success("Welcome back!");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message || "Login failed");
    }
  };

  if (!authenticated) {
    return (
      <LoginPage
        onAuth={(token, user) => {
          setCurrentUser(user as any);
          setAuthenticated(true);
        }}
        theme={theme as any}
      />
    );
  }

  const renderContent = () => {
    const collection = activeCollection ? collections[activeCollection] : null;

    switch (currentView) {
      case "create":
        return collection ? (
          <CreateView
            config={config as any}
            collection={collection}
            onSuccess={() => setCurrentView("list")}
            onCancel={() => setCurrentView("list")}
            onError={(msg) => toast.error(msg)}
          />
        ) : null;

      case "detail":
        return collection && activeDocumentId ? (
          <DetailView
            config={config as any}
            collection={collection}
            documentId={activeDocumentId}
            onBack={() => setCurrentView("list")}
            onSave={() => {}}
            onError={(msg) => toast.error(msg)}
          />
        ) : null;

      case "users":
        return <UserManagement />;

      case "media":
        return <MediaGallery />;

      case "branding":
        return <BrandingHub />;

      case "developer":
        return <DeveloperCenter collections={collections as any} />;

      case "webhooks":
        return <WebhookManager />;

      case "list":
      default:
        return collection ? (
          <ListView
            config={config as any}
            collection={collection}
            onCreate={() => setCurrentView("create")}
            onEdit={(id: string) => handleNavigate("detail", activeCollection, id)}
          />
        ) : (
          <Dashboard 
            onNavigate={handleNavigate as any} 
            collections={collections as any}
            user={currentUser as any}
          />
        );
    }
  };

  return (
    <ThemeProvider {...({ mode: theme, onChange: onThemeChange } as any)}>
        <div className="kyro-admin min-h-screen bg-[var(--kyro-bg)] text-[var(--kyro-text-primary)]">
          <div className="flex h-screen overflow-hidden">
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <CommandPalette 
                  isOpen={isCommandPaletteOpen}
                  onClose={() => setIsCommandPaletteOpen(false)}
                  collections={collections as any}
                  globals={globals as any}
                  onNavigate={handleNavigate as any} 
                />
                {renderContent()}
              </div>
            </main>
          </div>
          <GlobalModal />
          <Toaster />
        </div>
    </ThemeProvider>
  );
}
