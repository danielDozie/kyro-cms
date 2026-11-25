import "./overlays.css";
import "../../lib/i18n";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { resolveUrl, apiGet } from "../../lib/api";
import {
  Search,
  FileText,
  Image as ImageIcon,
  Settings,
  Plus,
  ArrowRight,
  Clock,
  Loader2,
  File,
  Moon,
  Sun,
  LogOut,
  Shield,
  Code,
  Database,
  Network as NetworkIcon,
  Hexagon,
} from "./icons";
import { DynamicIcon } from "./DynamicIcon";
import { useAuthStore } from "../../lib/stores";
import { useTranslation } from "react-i18next";

interface SearchResult {
  collection: string;
  label: string;
  id: string;
  title: string;
  doc?: Record<string, unknown>;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Record<string, unknown>;
  globals: Record<string, unknown>;
  onNavigate: (view: string, collection?: string, id?: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  collections,
  globals,
  onNavigate,
}: CommandPaletteProps) {
    const { t } = useTranslation();
  const { user, permissions } = useAuthStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const keyboardNavigation = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setSearchResults([]);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await apiGet(`/search?q=${encodeURIComponent(searchQuery)}&limit=15`, { autoToast: false });
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => performSearch(query), 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  useEffect(() => {
    setSelectedIndex(0);
    if (resultsRef.current) resultsRef.current.scrollTop = 0;
  }, [query]);
  useEffect(() => {
    if (keyboardNavigation.current) {
      resultsRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
      keyboardNavigation.current = false;
    }
  }, [selectedIndex]);
  if (!isOpen) return null;

  const collectionItems = Object.entries(collections)
    .filter(([slug]) => permissions?.collections?.[slug]?.read !== false)
    .map(([slug, config]: [string, any]) => ({
      id: `col-${slug}`,
      label: config.label || slug,
      type: "collection",
      slug,
      icon: config.admin?.icon || "FileText",
    }));

  const globalItems = Object.entries(globals)
    .filter(([slug]) => permissions?.globals?.[slug]?.read !== false)
    .map(([slug, config]: [string, any]) => ({
      id: `global-${slug}`,
      label: config.label || slug,
      type: "global",
      slug,
      icon: config.admin?.icon || "Settings",
    }));

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const isAdmin = user?.role === "admin";

  const actionItems = [
    {
      id: "action-media",
      label: "Media Gallery",
      type: "action",
      view: "media",
      icon: ImageIcon,
      visible: isAdmin || permissions?.collections?.media?.read === true,
    },
    {
      id: "action-users",
      label: "Team Management",
      type: "action",
      view: "users",
      icon: Clock,
      visible: isAdmin,
    },
    {
      id: "action-audit",
      label: "Audit Logs",
      type: "action",
      view: "audit",
      icon: File,
      visible: isAdmin,
    },
    {
      id: "action-roles",
      label: "Roles & Permissions",
      type: "action",
      view: "roles",
      icon: Shield,
      visible: isAdmin,
    },
    {
      id: "action-api",
      label: "REST API Explorer",
      type: "action",
      view: "api-explorer",
      icon: Database,
      visible: isAdmin,
    },
    {
      id: "action-graphql",
      label: "GraphQL Playground",
      type: "action",
      view: "graphql",
      icon: Hexagon,
      visible: isAdmin,
    },
    {
      id: "action-rest",
      label: "REST Playground",
      type: "action",
      view: "rest",
      icon: NetworkIcon,
      visible: isAdmin,
    },
    {
      id: "action-theme",
      label: isDark ? "Switch to Light Mode" : "Switch to Dark Mode",
      type: "action",
      view: "theme",
      icon: isDark ? Sun : Moon,
      visible: true,
    },
    {
      id: "action-logout",
      label: "Sign Out",
      type: "action",
      view: "logout",
      icon: LogOut,
      visible: true,
    },
  ].filter((a) => a.visible);

  const docResultItems: { id: string; label: string; type: string; collection: string; label2?: string; docId: string; icon: typeof File; doc?: Record<string, unknown> }[] = searchResults.map((result, idx) => {
    let displayTitle = result.title;
    if (!displayTitle || displayTitle === result.id || /^[0-9a-fA-F-]{20,}$/.test(displayTitle)) {
      if (result.doc) {
        displayTitle =
          (result.doc.name as string) ||
          (result.doc.label as string) ||
          (result.doc.title as string) ||
          (result.doc.email as string) ||
          (result.doc.fullName as string) ||
          (result.doc.username as string) ||
          (result.doc.heading as string) ||
          (result.doc.slug as string) ||
          (result.doc.filename as string) ||
          result.title ||
          "Untitled";
      }
    }
    return {
      id: `doc-${result.collection}-${result.id}`,
      label: displayTitle || "Untitled",
      type: "document",
      collection: result.collection,
      label2: result.label,
      docId: result.id,
      icon: File,
      doc: result.doc,
    };
  });

  const allItems =
    query.length >= 2
      ? [...actionItems, ...collectionItems, ...globalItems, ...docResultItems]
      : [...actionItems, ...collectionItems, ...globalItems];

  const filteredItems =
    query === ""
      ? allItems
      : allItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      keyboardNavigation.current = true;
      setSelectedIndex((i) => filteredItems.length ? (i + 1) % filteredItems.length : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      keyboardNavigation.current = true;
      setSelectedIndex(
        (i) => filteredItems.length ? (i - 1 + filteredItems.length) % filteredItems.length : 0,
      );
    } else if (e.key === "Enter") {
      const item = filteredItems[selectedIndex];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSelect = (item: { type: string; slug?: string; view?: string; collection?: string; docId?: string }) => {
    if (item.type === "collection") {
      if (item.slug === "users") {
        onNavigate(item.slug, item.slug);
      } else {
        onNavigate("list", item.slug);
      }
    } else if (item.type === "global") {
      onNavigate("settings", item.slug);
    } else if (item.type === "document") {
      if (item.collection === "users") {
        onNavigate("users", "users", item.docId);
      } else {
        onNavigate("edit", item.collection, item.docId);
      }
    } else if (item.type === "action") {
      if (item.view === "users") {
        onNavigate("users", "users");
      } else if (item.view === "media") {
        onNavigate("media", "media");
      } else {
        onNavigate(item.view as string, item.view as string);
      }
    }
    onClose();
  };

  const getSectionLabel = () => {
    if (query === "") return "Quick Actions & Collections";
    if (searchResults.length > 0) return "Documents";
    if (loading) return "Searching...";
    return "Search Results";
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 kyro-dialog-backdrop"
        onClick={onClose}
      />

      {/* Palette Body */}
      <div className="relative command-palette-panel" role="dialog" aria-modal="true" aria-label="Search anything">
        <div className="command-palette-search">
          {loading ? (
            <Loader2 className="w-5 h-5 text-[var(--kyro-text-secondary)] opacity-50 mr-4 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-[var(--kyro-text-secondary)] opacity-50 mr-4" />
          )}
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Search anything"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-search-results"
            aria-activedescendant={filteredItems[selectedIndex] ? `command-result-${selectedIndex}` : undefined}
            placeholder={t("fields.searchAnything", { defaultValue: "Search anything..." })}
            className="flex-1 bg-transparent border-none focus:outline-none text-base font-normal text-[var(--kyro-text-primary)] placeholder:text-[var(--kyro-text-muted)]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-2 px-2 py-1 bg-[var(--kyro-bg-secondary)] rounded-md border border-[var(--kyro-border)]">
            <span className="text-[10px] font-semibold text-[var(--kyro-text-muted)]">
              ESC
            </span>
          </div>
        </div>

        <div id="command-search-results" ref={resultsRef} className="command-palette-results" role="listbox" aria-label="Search results">
          {filteredItems.length > 0 ? (
            <div className="space-y-1 px-2">
              <p className="px-3 text-xs font-medium text-[var(--kyro-text-muted)] mb-2">
                {getSectionLabel()}
              </p>
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  id={`command-result-${index}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className="command-palette-result"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-md ${index === selectedIndex ? "bg-white/20" : "bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)]"}`}
                    >
                      <DynamicIcon name={item.icon} className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-normal text-sm">{(item as any).label}</span>
                      {item.type === "document" && (item as any).label2 && (
                        <span
                          className={`text-[11px] font-normal ${index === selectedIndex ? "text-[var(--kyro-text-secondary)]" : "text-[var(--kyro-text-muted)]"}`}
                        >
                          {(item as any).label2}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-[var(--kyro-text-secondary)] italic opacity-60">
                {query.length >= 2 && !loading
                  ? `No results found for "${query}"`
                  : "Start typing to search..."}
              </p>
            </div>
          )}
        </div>

        <div className="command-palette-footer">
          <div className="flex gap-6">
            <span className="flex items-center gap-2">
              ↑↓ Navigate
            </span>
            <span className="flex items-center gap-2">
              ⏎ Select
            </span>
          </div>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
