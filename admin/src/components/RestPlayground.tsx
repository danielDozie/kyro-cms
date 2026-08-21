import "../lib/i18n";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUIStore, toast } from "../lib/stores";
import { apiPath } from "../lib/paths";
import { Modal } from "./ui/Modal";
import {
  Copy,
  Download,
  Check,
  Play,
  Plus,
  X,
  ChevronRight,
} from "./ui/icons";
import { useTranslation } from "react-i18next";

interface EnvVariable {
  key: string;
  value: string;
  enabled: boolean;
}

interface RequestFolder {
  id: string;
  name: string;
  requests: SavedRequest[];
}

interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  folderId?: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  duration: number;
}

interface RestPlaygroundProps {
  collections?: Array<{
    name: string;
    slug: string;
    endpoints: {
      list: string;
      create: string;
      read: string;
      update: string;
      delete: string;
    };
  }>;
}

const STORAGE_KEYS = {
  folders: "kyro-rest-folders",
  history: "kyro-rest-history",
  env: "kyro-rest-env",
};

const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e",
  POST: "#3b82f6",
  PATCH: "#eab308",
  DELETE: "#ef4444",
};

const METHOD_BG: Record<string, string> = {
  GET: "rgba(34,197,94,0.12)",
  POST: "rgba(59,130,246,0.12)",
  PATCH: "rgba(234,179,8,0.12)",
  DELETE: "rgba(239,68,68,0.12)",
};

export function RestPlayground({ collections = [] }: RestPlaygroundProps) {
    const { t } = useTranslation();
  const [sidebarTab, setSidebarTab] = useState<"collections" | "saved" | "history" | "env">("collections");
  const [folders, setFolders] = useState<RequestFolder[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SavedRequest | null>(null);
  const [currentRequest, setCurrentRequest] = useState<SavedRequest>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kyro_rest_current");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      id: "new",
      name: "Untitled Request",
      method: "GET",
      url: "",
      headers: {},
      body: "",
    };
  });
  const [response, setResponse] = useState<{ status: number; duration: number; size: number; data: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<"params" | "headers" | "body">("params");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [saveToFolderId, setSaveToFolderId] = useState("");
  const [saveRequestName, setSaveRequestName] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"editor" | "response">("editor");
  const [splitPos, setSplitPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { confirm } = useUIStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedFolders = localStorage.getItem(STORAGE_KEYS.folders);
    if (savedFolders) setFolders(JSON.parse(savedFolders));
    const savedHistory = localStorage.getItem(STORAGE_KEYS.history);
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedEnv = localStorage.getItem(STORAGE_KEYS.env);
    if (savedEnv) setEnvVars(JSON.parse(savedEnv));
    else setEnvVars([
      { key: "baseUrl", value: apiPath, enabled: true },
      { key: "token", value: "", enabled: true },
    ]);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(folders));
  }, [folders, isMounted]);

  useEffect(() => {
    if (isMounted) localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history, isMounted]);

  useEffect(() => {
    if (isMounted) localStorage.setItem(STORAGE_KEYS.env, JSON.stringify(envVars));
  }, [envVars, isMounted]);

  useEffect(() => {
    if (isMounted) localStorage.setItem("kyro_rest_current", JSON.stringify(currentRequest));
  }, [currentRequest, isMounted]);

  const resolveUrl = (url: string) => {
    let resolved = url;
    envVars.forEach((v) => {
      if (v.enabled) resolved = resolved.replace(`{{${v.key}}}`, v.value);
    });
    if (resolved.startsWith("/")) {
      const baseUrl = envVars.find((v) => v.key === "baseUrl" && v.enabled)?.value || apiPath;
      resolved = `${baseUrl}${resolved}`;
    }
    return resolved;
  };

  const handleSend = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = Date.now();
    try {
      const url = resolveUrl(currentRequest.url);
      const headers: Record<string, string> = { ...currentRequest.headers };
      const token = envVars.find(v => v.key === 'token' && v.enabled)?.value;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: currentRequest.method,
        headers: { "Content-Type": "application/json", ...headers },
        body: currentRequest.method !== "GET" && currentRequest.body ? currentRequest.body : undefined,
      });

      const duration = Date.now() - start;
      const status = res.status;
      const data = await res.json().catch(() => ({}));

      setResponse({ status, duration, size: JSON.stringify(data).length, data });

      setHistory((prev) => [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        method: currentRequest.method,
        url: currentRequest.url,
        status,
        duration,
      }, ...prev].slice(0, 50));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [currentRequest, envVars]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSend]);

  const loadRequest = (req: SavedRequest) => {
    setCurrentRequest(req);
    setSelectedRequest(req);
    setResponse(null);
    setError(null);
  };

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders((prev) => [...prev, { id: Date.now().toString(), name: newFolderName, requests: [] }]);
    setNewFolderName("");
    setShowFolderModal(false);
  };

  const deleteFolder = (id: string) => {
    confirm({
      title: "Delete Folder",
      message: "Are you sure? All requests inside will be deleted.",
      variant: "danger",
      onConfirm: () => setFolders((prev) => prev.filter((f) => f.id !== id)),
    });
  };

  const saveRequest = () => {
    if (!saveRequestName.trim() || !saveToFolderId) return;
    const newSavedRequest: SavedRequest = {
      ...currentRequest, id: Date.now().toString(), name: saveRequestName, folderId: saveToFolderId,
    };
    setFolders((prev) => prev.map((f) => f.id === saveToFolderId ? { ...f, requests: [...f.requests, newSavedRequest] } : f));
    setSelectedRequest(newSavedRequest);
    setShowSaveModal(false);
  };

  const deleteRequest = (id: string) => {
    setFolders((prev) => prev.map((f) => ({ ...f, requests: f.requests.filter((r) => r.id !== id) })));
    if (selectedRequest?.id === id) setSelectedRequest(null);
  };

  const duplicateRequest = () => {
    setCurrentRequest({ ...currentRequest, id: Date.now().toString(), name: `${currentRequest.name} (copy)` });
    setSelectedRequest(null);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: "1.0", exportedAt: new Date().toISOString(), folders, history: history.slice(0, 50), envVars }, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `kyro-rest-playground-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.folders) setFolders((prev) => [...prev, ...data.folders]);
        if (data.history) setHistory((prev) => [...data.history, ...prev].slice(0, 50));
        if (data.envVars) setEnvVars((prev) => [...prev, ...data.envVars]);
        toast.success("Your playground data has been imported.");
      } catch { toast.error("Invalid JSON file structure."); }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    confirm({
      title: "Clear All Data?",
      message: "Are you sure? This action cannot be undone.",
      variant: "danger",
      onConfirm: () => {
        setFolders([]);
        setHistory([]);
        setEnvVars([{ key: "baseUrl", value: apiPath, enabled: true }, { key: "token", value: "", enabled: true }]);
        localStorage.removeItem(STORAGE_KEYS.folders);
        localStorage.removeItem(STORAGE_KEYS.history);
        localStorage.removeItem(STORAGE_KEYS.env);
      },
    });
  };

  const handleCopyResponse = async () => {
    if (response?.data) {
      await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadResponse = () => {
    if (!response?.data) return;
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "rest-response.json";
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handlePrettifyBody = () => {
    try {
      const parsed = JSON.parse(currentRequest.body || "{}");
      setCurrentRequest((prev) => ({ ...prev, body: JSON.stringify(parsed, null, 2) }));
    } catch { /* ignore */ }
  };

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitPos(Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging]);

  const editorPills = [
    { key: "params" as const, label: "Params" },
    { key: "headers" as const, label: "Headers" },
    { key: "body" as const, label: "Body" },
  ];

  const sidebarPills = [
    { key: "collections" as const, label: "Collections" },
    { key: "saved" as const, label: "Saved" },
    { key: "history" as const, label: "History" },
    { key: "env" as const, label: "Env" },
  ];

  const methodColor = METHOD_COLORS[currentRequest.method] || "#6b7280";

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-[var(--kyro-bg)] overflow-hidden rounded-lg border border-[var(--kyro-border)]">
      {/* Compact top bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)] shrink-0">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="p-1 rounded-lg text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"
          title={t("tooltips.toggleSidebar", { defaultValue: "Toggle sidebar" })}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${showSidebar ? "rotate-180" : ""}`} />
        </button>
        <select
          value={currentRequest.method}
          onChange={(e) => setCurrentRequest({ ...currentRequest, method: e.target.value })}
          className="px-2 py-1 text-[10px] font-bold rounded-md border-0 text-white"
          style={{ backgroundColor: methodColor }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          ref={inputRef}
          type="text"
          value={currentRequest.url}
          onChange={(e) => setCurrentRequest({ ...currentRequest, url: e.target.value })}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-md text-[var(--kyro-text-primary)] placeholder:text-[var(--kyro-text-muted)] focus:outline-none focus:border-[var(--kyro-primary)] font-mono"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-2.5 py-1.5 text-[10px] font-semibold rounded-md border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-all"
          >
            Save
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !currentRequest.url}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
          >
            <Play className="w-3 h-3" />
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar backdrop */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/40 z-10 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Left sidebar */}
        {showSidebar && (
          <div className="absolute md:relative z-20 h-full w-60 flex-shrink-0 flex flex-col border-r border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
            <div className="flex border-b border-[var(--kyro-border)]">
              {sidebarPills.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSidebarTab(p.key)}
                  className={`flex-1 px-1 py-1.5 text-[9px] font-semibold tracking-wider transition-all ${
                    sidebarTab === p.key
                      ? "text-[var(--kyro-primary)] border-b-2 border-[var(--kyro-primary)] bg-[var(--kyro-surface-accent)]"
                      : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {sidebarTab === "collections" && (
                <div className="space-y-2">
                  {collections.map((col) => (
                    <div key={col.slug}>
                      <h3 className="text-[10px] font-bold text-[var(--kyro-text-muted)] mb-1 px-2">{col.name}</h3>
                      {[
                        { method: "GET", path: col.endpoints.list, name: "List" },
                        { method: "POST", path: col.endpoints.create, name: "Create" },
                        { method: "GET", path: col.endpoints.read, name: "Get" },
                        { method: "PATCH", path: col.endpoints.update, name: "Update" },
                        { method: "DELETE", path: col.endpoints.delete, name: "Delete" },
                      ].map((ep, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentRequest((prev) => ({ ...prev, method: ep.method, url: ep.path, name: `${col.name} - ${ep.name}` }));
                            setResponse(null);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded text-[10px] hover:bg-[var(--kyro-surface-accent)] transition-colors"
                        >
                          <span
                            className="text-white px-1 py-0.5 rounded text-[8px] font-bold"
                            style={{ backgroundColor: METHOD_COLORS[ep.method] }}
                          >
                            {ep.method}
                          </span>
                          <span className="text-[var(--kyro-text-secondary)] truncate">{ep.name}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {sidebarTab === "saved" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 mb-1">
                    <button onClick={() => setShowFolderModal(true)} className="text-[10px] font-semibold text-[var(--kyro-primary)] hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Folder
                    </button>
                    <div className="flex gap-2">
                      <button onClick={exportData} className="text-[9px] text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)]">Export</button>
                      <label className="text-[9px] text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] cursor-pointer">
                        Import
                        <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
                      </label>
                    </div>
                  </div>
                  {folders.length === 0 && (
                    <p className="text-[10px] text-[var(--kyro-text-muted)] text-center py-4">No saved requests yet</p>
                  )}
                  {folders.map((folder) => (
                    <div key={folder.id}>
                      <div className="flex items-center justify-between px-2 mb-1">
                        <h3 className="text-[10px] font-bold text-[var(--kyro-text-muted)]">{folder.name}</h3>
                        <button onClick={() => deleteFolder(folder.id)} className="text-[var(--kyro-text-muted)] hover:text-[var(--kyro-danger)]">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {folder.requests.map((req) => (
                        <div
                          key={req.id}
                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                            selectedRequest?.id === req.id
                              ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]"
                              : "hover:bg-[var(--kyro-surface-accent)]"
                          }`}
                          onClick={() => loadRequest(req)}
                        >
                          <span
                            className="text-white px-1 py-0.5 rounded text-[8px] font-bold"
                            style={{ backgroundColor: METHOD_COLORS[req.method] }}
                          >
                            {req.method}
                          </span>
                          <span className={`flex-1 text-[10px] truncate ${selectedRequest?.id === req.id ? "text-white" : "text-[var(--kyro-text-secondary)]"}`}>
                            {req.name}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); deleteRequest(req.id); }}
                            className="opacity-0 group-hover:opacity-100 text-[var(--kyro-text-muted)] hover:text-[var(--kyro-danger)]"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {sidebarTab === "history" && (
                <div className="space-y-1">
                  <div className="flex justify-end px-2 mb-1">
                    <button onClick={() => setHistory([])} className="text-[9px] font-semibold text-[var(--kyro-danger)] hover:underline">Clear</button>
                  </div>
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-1.5 rounded hover:bg-[var(--kyro-surface-accent)] cursor-pointer transition-colors border-b border-[var(--kyro-border)] last:border-0"
                      onClick={() => { setCurrentRequest((prev) => ({ ...prev, method: item.method, url: item.url })); setResponse(null); }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-white px-1 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: METHOD_COLORS[item.method] }}>
                          {item.method}
                        </span>
                        <span
                          className="text-white px-1 py-0.5 rounded text-[8px] font-bold"
                          style={{ backgroundColor: item.status < 400 ? METHOD_COLORS.GET : METHOD_COLORS.DELETE }}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-[9px] text-[var(--kyro-text-secondary)] truncate mb-0.5">{item.url}</div>
                      <div className="text-[8px] text-[var(--kyro-text-muted)] flex justify-between">
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        <span>{item.duration}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sidebarTab === "env" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-[10px] font-bold text-[var(--kyro-text-muted)]">Variables</h3>
                    <button onClick={clearAllData} className="text-[9px] text-[var(--kyro-danger)] font-semibold hover:underline">Reset</button>
                  </div>
                  {envVars.map((env, i) => (
                    <div key={i} className="p-2 bg-[var(--kyro-surface-accent)] rounded-lg border border-[var(--kyro-border)] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-[var(--kyro-text-muted)]">{env.key}</span>
                        <input type="checkbox" checked={env.enabled} onChange={() => { const n = [...envVars]; n[i].enabled = !n[i].enabled; setEnvVars(n); }} className="accent-[var(--kyro-primary)]" />
                      </div>
                      <input type="text" value={env.value} onChange={(e) => { const n = [...envVars]; n[i].value = e.target.value; setEnvVars(n); }}
                        className="w-full bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded px-2 py-1 text-[10px] font-mono text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
                      />
                    </div>
                  ))}
                  <button onClick={() => setEnvVars([...envVars, { key: "", value: "", enabled: true }])}
                    className="w-full py-1.5 border-2 border-dashed border-[var(--kyro-border)] rounded-lg text-[10px] text-[var(--kyro-text-muted)] hover:border-[var(--kyro-primary)] hover:text-[var(--kyro-primary)] transition-all"
                  >
                    + Add Variable
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main split area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Mobile panel switcher */}
          <div className="flex md:hidden border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)] px-3 py-1.5 gap-1">
            <button
              onClick={() => setMobilePanel("editor")}
              className={`flex-1 px-3 py-1 text-[10px] font-semibold rounded-md transition-all ${
                mobilePanel === "editor"
                  ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]"
                  : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"
              }`}
            >
              Request
            </button>
            <button
              onClick={() => setMobilePanel("response")}
              className={`flex-1 px-3 py-1 text-[10px] font-semibold rounded-md transition-all ${
                mobilePanel === "response"
                  ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]"
                  : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"
              }`}
            >
              Response
            </button>
          </div>

          {/* Left: Editor */}
          <div
            className={`${mobilePanel === "editor" ? "flex" : "hidden"} md:flex flex-col overflow-hidden border-r border-[var(--kyro-border)] w-full md:w-auto`}
            style={{ width: typeof window !== "undefined" && window.innerWidth >= 768 ? `${splitPos}%` : undefined }}
          >
            {/* Editor pills */}
            <div className="flex gap-0.5 px-3 py-1.5 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
              {editorPills.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setActiveEditorTab(p.key)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                    activeEditorTab === p.key
                      ? "bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)]"
                      : "text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {activeEditorTab === "body" && (
                <button onClick={handlePrettifyBody} className="ml-auto px-2 py-1 text-[10px] font-semibold rounded-md text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]">
                  Prettify
                </button>
              )}
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-hidden">
              {activeEditorTab === "params" && (
                <div className="flex items-center justify-center h-full text-[11px] text-[var(--kyro-text-muted)]">
                  Use query parameters in the URL (e.g. <code className="mx-1 px-1 py-0.5 bg-[var(--kyro-surface-accent)] rounded font-mono">?limit=10</code>)
                </div>
              )}
              {activeEditorTab === "headers" && (
                <textarea
                  value={JSON.stringify(currentRequest.headers, null, 2)}
                  onChange={(e) => { try { setCurrentRequest({ ...currentRequest, headers: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
                  className="w-full h-full bg-[var(--kyro-bg)] border-0 p-3 font-mono text-[11px] text-[var(--kyro-text-primary)] resize-none focus:outline-none placeholder:text-[var(--kyro-text-muted)]"
                  placeholder='{ "X-Custom-Header": "value" }'
                />
              )}
              {activeEditorTab === "body" && (
                <textarea
                  value={currentRequest.body}
                  onChange={(e) => setCurrentRequest({ ...currentRequest, body: e.target.value })}
                  className="w-full h-full bg-[var(--kyro-bg)] border-0 p-3 font-mono text-[11px] text-[var(--kyro-text-primary)] resize-none focus:outline-none placeholder:text-[var(--kyro-text-muted)]"
                  placeholder='{ "key": "value" }'
                />
              )}
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-3 py-1 border-t border-[var(--kyro-border)] bg-[var(--kyro-surface)] text-[9px] text-[var(--kyro-text-muted)] font-mono">
              <span>{currentRequest.method} {currentRequest.url || "No URL"}</span>
              <span>{currentRequest.body?.length || 0} chars</span>
            </div>
          </div>

          {/* Drag handle - hidden on mobile */}
          {showSidebar && (
            <div
              className="hidden md:block absolute top-0 bottom-0 z-10 w-1.5 cursor-col-resize group"
              style={{ left: `calc(${splitPos}% - 3px)` }}
              onMouseDown={startDrag}
            >
              <div className="w-0.5 h-full mx-auto bg-transparent group-hover:bg-[var(--kyro-primary)] group-hover:opacity-40 transition-all" />
            </div>
          )}

          {/* Right: Response */}
          <div
            className={`${mobilePanel === "response" ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-hidden min-w-0 w-full md:w-auto`}
            style={{ width: typeof window !== "undefined" && window.innerWidth >= 768 ? (showSidebar ? `${100 - splitPos}%` : "50%") : undefined }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
              <span className="text-[10px] font-semibold text-[var(--kyro-text-secondary)]">Response</span>
              {response && (
                <>
                  {response.duration > 0 && (
                    <span className="text-[9px] font-mono text-[var(--kyro-text-muted)]">{response.duration}ms</span>
                  )}
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    (response.status as number) < 400 ? "bg-[var(--kyro-success-bg)] text-[var(--kyro-success)]" : "bg-[var(--kyro-danger-bg)] text-[var(--kyro-danger)]"
                  }`}>
                    {response.status as number}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--kyro-text-muted)]">{response.size}B</span>
                </>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button onClick={handleCopyResponse} className="p-1 rounded text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]" title={t("tooltips.copyResponse", { defaultValue: "Copy response" })}>
                  {copied ? <Check className="w-3 h-3 text-[var(--kyro-success)]" /> : <Copy className="w-3 h-3" />}
                </button>
                <button onClick={handleDownloadResponse} className="p-1 rounded text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]" title={t("tooltips.downloadResponse", { defaultValue: "Download response" })}>
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[var(--kyro-bg-secondary)]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-6 h-6 border-2 border-[var(--kyro-primary)] border-t-transparent rounded-full" />
                </div>
              ) : error ? (
                <div className="p-3 m-3 rounded bg-[var(--kyro-danger-bg)] border border-[var(--kyro-danger)]/20 text-[11px] text-[var(--kyro-danger)] font-medium">
                  ⚠ {error}
                </div>
              ) : response ? (
                <pre className="text-[11px] font-mono text-[var(--kyro-text-primary)] whitespace-pre-wrap p-3">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30">
                  <Play className="w-10 h-10 mb-2" />
                  <p className="text-[11px] font-bold">Send a request</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal open={showFolderModal} onClose={() => setShowFolderModal(false)} title={t("tooltips.createFolder", { defaultValue: "Create Folder" })} size="sm"
        footer={
          <div className="flex gap-2">
            <button onClick={() => setShowFolderModal(false)} className="kyro-btn kyro-btn-md kyro-btn-ghost">Cancel</button>
            <button onClick={createFolder} className="kyro-btn kyro-btn-md kyro-btn-primary">Create</button>
          </div>
        }
      >
        <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
          placeholder={t("fields.folderName", { defaultValue: "Folder name..." })} className="w-full bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-lg px-3 py-2 text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
        />
      </Modal>

      <Modal open={showSaveModal} onClose={() => setShowSaveModal(false)} title={t("tooltips.saveRequest", { defaultValue: "Save Request" })} size="sm"
        footer={
          <div className="flex gap-2">
            <button onClick={() => setShowSaveModal(false)} className="kyro-btn kyro-btn-md kyro-btn-ghost">Cancel</button>
            <button onClick={saveRequest} className="kyro-btn kyro-btn-md kyro-btn-primary" disabled={!saveRequestName || !saveToFolderId}>Save</button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-[var(--kyro-text-muted)] block mb-1">Request Name</label>
            <input type="text" value={saveRequestName} onChange={(e) => setSaveRequestName(e.target.value)}
              placeholder="e.g. List Posts" className="w-full bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-lg px-3 py-2 text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--kyro-text-muted)] block mb-1">Folder</label>
            <select value={saveToFolderId} onChange={(e) => setSaveToFolderId(e.target.value)}
              className="w-full bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-lg px-3 py-2 text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
            >
              <option value="">Select Folder...</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
