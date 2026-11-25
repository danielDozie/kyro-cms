import "../lib/i18n";
import { Maximize, LayoutGrid, List } from "lucide-react";
import { Search, Check, Server, Filter } from "./ui/icons";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "./ui/Spinner";
import { Shimmer } from "./ui/Shimmer";
import { SlidePanel } from "./ui/SlidePanel";
import { Modal } from "./ui/Modal";
import { Badge } from "./ui/Badge";
import { Folder } from "./ui/icons";

import {
  Trash2,
  Download,
  Maximize2,
  Eye,
  X,
  FileIcon,
  FolderInput,
  FolderPlus,
  Image,
  Link,
  Crop as CropIcon,
  Film,
  Music,
  FileText,
  Archive,
} from "./ui/icons";
import { PromptModal } from "./ui/PromptModal";
import { MediaLoadBoundary } from "./ui/MediaLoadBoundary";
import {
  apiGet,
  apiPost,
  apiDelete,
  apiPatch,
  withCacheBust,
  apiUpload,
} from "../lib/api";
import { adminPath } from "../lib/paths";
import { useAuthStore, useUIStore, toast } from "../lib/stores";
import { useTranslation } from "react-i18next";

import {
  type MediaItem,
  type FilterType,
  getAbsoluteUrl,
  getCroppedUrl,
  formatFileSize,
  formatDate,
  getFileType,
} from "../types/media";

const ImageFocalEditor = React.lazy(() =>
  import("./ui/ImageFocalEditor").then((module) => ({ default: module.ImageFocalEditor })),
);

export function MediaGallery({
  onSelect,
  multiple = true,
  pickerMode = false,
}: {
  onSelect?: (items: MediaItem[]) => void;
  multiple?: boolean;
  pickerMode?: boolean;
}) {
  const { t } = useTranslation();
  const { permissions } = useAuthStore();
  const canUpload = permissions?.media?.create !== false;
  const canDelete = permissions?.media?.delete !== false;
  const canUpdate = permissions?.media?.update !== false;

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [folderSearch, setFolderSearch] = useState("");
  const visibleFolders = folders.filter(folder => folder.toLowerCase().includes(folderSearch.toLowerCase()));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const [panelItem, setPanelItem] = useState<MediaItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [storageConfigured, setStorageConfigured] = useState<boolean | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);
  const [showStorageConfigModal, setShowStorageConfigModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 40;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { confirm, alert } = useUIStore();
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
      });
      if (currentFolder) params.append("folder", currentFolder);
      if (search) params.append("search", search);
      if (filter !== "all") params.append("type", filter);

      const result = await apiGet(withCacheBust(`/api/media?${params}`));
      const newItems = (result.docs || []).map((doc: Record<string, unknown>) => ({
        ...doc,
        type: getFileType(doc.mimeType as string),
      }));

      setItems(prev => pageNum === 1 ? newItems : [...prev, ...newItems]);
      setTotal(result.totalDocs || 0);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error("Failed to load media:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentFolder, search, filter, limit]);

  const loadFolders = useCallback(async () => {
    try {
      const result = await apiGet(withCacheBust("/api/media/folders"));
      setFolders(Array.isArray(result) ? result : result.folders || []);
    } catch (error) {
      console.error("Failed to load folders:", error);
    }
  }, []);

  const checkStorage = useCallback(async () => {
    try {
      const res = await apiGet("/api/globals/storage-settings");
      const isConfigured = !!res?.data?.provider;
      setStorageConfigured(isConfigured);
    } catch (e) {
      setStorageConfigured(false);
    }
  }, []);

  useEffect(() => {
    if (!pickerMode) checkStorage();
  }, [checkStorage, pickerMode]);

  useEffect(() => {
    if (pickerMode) return;
    if (storageConfigured === false && !storageChecked) {
      setStorageChecked(true);
      setShowStorageConfigModal(true);
    }
  }, [pickerMode, storageConfigured, storageChecked]);

  useEffect(() => {
    setPage(1);
    loadMedia(1);
  }, [currentFolder, search, filter, loadMedia]);

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadMedia(nextPage);
  };

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (pickerMode) return;
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        handleUpload(files);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [pickerMode, currentFolder, storageConfigured]);

  const handleUpload = async (files: FileList | File[]) => {
    if (!storageConfigured) {
      setShowStorageConfigModal(true);
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (currentFolder) formData.append("folder", currentFolder);

        await apiUpload("/api/media/upload", formData, (progress: number) => {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: progress,
          }));
        });
        successCount++;
      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error);
        failCount++;
      }
    }

    setUploading(false);
    setUploadProgress({});
    setPage(1);
    loadMedia(1);
    loadFolders();
    if (failCount > 0) {
      toast.error(`${failCount} file(s) failed to upload`);
    }
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
    }
  };

  const handleBulkDelete = () => {
    confirm({
      title: "Delete Media",
      message: `Are you sure you want to delete ${selectedIds.size} item(s)? This cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          for (const id of Array.from(selectedIds)) {
            await apiDelete(`/api/media/${id}`);
          }
          setSelectedIds(new Set());
          setPage(1);
          loadMedia(1);
          toast.success(`${selectedIds.size} item(s) deleted`);
        } catch (error) {
          console.error("Bulk delete failed:", error);
          toast.error("Failed to delete some items");
        }
      }
    });
  };

  const handleSelectOne = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (!multiple) newSet.clear();
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const createFolder = async (name: string) => {
    try {
      await apiPost("/api/media/folders", { name });
      loadFolders();
      setShowNewFolderModal(false);
      toast.success(`Folder "${name}" created`);
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteFolder = (folder: string) => {
    confirm({
      title: "Delete Folder",
      message: `Are you sure you want to delete the folder "${folder}"? All media in this folder will be moved to the root.`,
      variant: "danger",
      confirmLabel: "Delete Folder",
      onConfirm: async () => {
        try {
          await apiDelete(`/api/media/folders?path=${encodeURIComponent(folder)}`);
          if (currentFolder === folder) setCurrentFolder("");
          loadFolders();
          setPage(1);
          loadMedia(1);
          toast.success(`Folder "${folder}" deleted`);
        } catch (error) {
          console.error("Failed to delete folder:", error);
          toast.error("Failed to delete folder");
        }
      }
    });
  };

  const updateMetadata = async (id: string, data: Partial<MediaItem>) => {
    try {
      const result = await apiPatch(`/api/media/${id}`, data);
      const updated = { ...result.doc, type: getFileType(result.doc.mimeType) };
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setPanelItem(current => current?.id === id ? updated : current);
      toast.success("Metadata updated");
    } catch (error) {
      console.error("Failed to update metadata:", error);
      toast.error("Failed to update metadata");
    }
  };

  const handleSaveCropHotspot = async (cropData: any, hotspotData: any) => {
    if (!panelItem) return;
    try {
      setUploading(true);
      const metadata = {
        ...panelItem.metadata,
        crop: cropData || null,
        hotspot: hotspotData || null
      };

      const result = await apiPatch(`/api/media/${panelItem.id}`, { metadata });
      const updated = { ...result.doc, type: getFileType(result.doc.mimeType) };
      setItems(prev => prev.map(item => item.id === panelItem.id ? updated : item));
      setPanelItem(current => current?.id === panelItem.id ? updated : current);
      setShowCrop(false);
      toast.success("Crop & hotspot saved");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save focal metadata");
    } finally {
      setUploading(false);
    }
  };

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.totalSize += item.fileSize || 0;
        return acc;
      },
      { totalSize: 0 },
    );
  }, [items]);

  return (
    <div
      style={{ position: "relative", isolation: "isolate" }}
      className={`${pickerMode ? "" : "media-workspace"} flex flex-col h-full bg-[var(--kyro-bg)] ${isDragging ? "ring-4 ring-[var(--kyro-sidebar-active)] ring-inset" : ""}`}
      {...(pickerMode ? {} : {
        onDragOver: (e) => { e.preventDefault(); setIsDragging(true); },
        onDragLeave: () => setIsDragging(false),
        onDrop: (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleUpload(e.dataTransfer.files); },
      })}
    >
      {/* Top Bar */}
      <div className={`flex flex-col ${pickerMode ? "gap-2 p-2" : "gap-4 md:gap-6 p-4 md:p-6 rounded-lg md:rounded-t-lg"} border-b border-[var(--kyro-border)] backdrop-blur-md sticky top-0 z-10`}>
        {!pickerMode && (
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-lg md:text-xl font-medium tracking-tight text-[var(--kyro-text-primary)]">
                Media Library
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-normal text-[var(--kyro-text-secondary)]">
                  {total} items <span className="hidden sm:inline">· {formatFileSize(stats.totalSize)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="media-view-switch" role="group" aria-label="Media view">
                <button
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                  className="media-view-option"
                >
                  <LayoutGrid size={15} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  className="media-view-option"
                >
                  <List size={15} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              <button
                aria-label="Filter media"
                onClick={() => setShowMobileFilters(true)}
                className="md:hidden p-2 rounded-md bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
              >
                <Filter className="w-4 h-4" />
              </button>

              {canUpload && (
                <button
                  aria-label="Upload media"
                  onClick={() => fileInputRef.current?.click()}
                  className="media-upload flex items-center justify-center gap-2 px-3 md:px-3 py-2 md:py-2 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-md font-medium text-xs  active:scale-95 transition-all"
                >
                  <span className="md:hidden text-lg leading-none">+</span>
                  <Maximize2 className="w-4 h-4 hidden md:block" />
                  <span className="hidden md:inline">Upload</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className={`flex items-center w-full`}>
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-muted)]" />
            <input
              type="text"
              aria-label="Search media"
              placeholder={t("fields.searchAssets", { defaultValue: "Search assets..." })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] transition-all text-xs font-normal"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden gap-4 mt-4">
        {/* Folders Sidebar */}
        {!pickerMode && (
          <div className="w-64 border-r border-[var(--kyro-border)] rounded-lg overflow-y-auto hidden md:block">
            <div className="p-6 space-y-6">
              <div>
                <span className="text-[10px] font-normal  tracking-normal text-[var(--kyro-text-secondary)] opacity-40 block mb-4">
                  Quick Filters
                </span>
                <div className="space-y-1">
                  {(
                    [
                      "all",
                      "image",
                      "video",
                      "audio",
                      "document",
                      "archive",
                    ] as const
                  ).map((t) => (
                    <button
                      key={t}
                      aria-pressed={filter === t}
                      onClick={() => setFilter(t)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-[11px] font-medium capitalize transition-all ${filter === t ? "text-[var(--kyro-text-primary)] bg-[var(--kyro-surface-accent)]" : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]/50"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${filter === t ? "bg-[var(--kyro-primary)]" : "bg-transparent border border-current opacity-30"}`}
                      />
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="media-folder-section">
                <div className="media-folder-heading"><h3>Media folders <span>{folders.length}</span></h3>{canUpload && <button type="button" className="kyro-btn kyro-btn-sm kyro-btn-ghost kyro-btn-icon" onClick={() => setShowNewFolderModal(true)} aria-label="Create media folder"><FolderPlus className="w-4 h-4" /></button>}</div>
                <p className="media-folder-help">Group related files. Folders do not affect publishing.</p>
                {folders.length > 5 && <input type="search" value={folderSearch} onChange={event => setFolderSearch(event.target.value)} placeholder="Find a folder…" aria-label="Find a media folder" className="media-folder-search" />}
                <nav className="media-folder-nav" aria-label="Media folders">
                  <button type="button" aria-pressed={currentFolder === ""} onClick={() => setCurrentFolder("")}><FolderInput className="w-4 h-4" aria-hidden="true" /><span>All assets</span></button>
                  {visibleFolders.map(folder => <div className="media-folder-row" key={folder}><button type="button" title={folder} aria-pressed={currentFolder === folder} onClick={() => setCurrentFolder(folder)}><Folder className="w-4 h-4" aria-hidden="true" /><span>{folder}</span></button>{canDelete && <button type="button" className="media-folder-delete" aria-label={`Delete folder ${folder}`} onClick={() => handleDeleteFolder(folder)}><Trash2 className="w-3.5 h-3.5" /></button>}</div>)}
                  {folders.length === 0 && <p className="media-folder-help">No folders yet. Create one to organize your files.</p>}
                  {folders.length > 0 && visibleFolders.length === 0 && <p className="media-folder-help">No matching folders.</p>}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div ref={mediaContainerRef} style={{ position: "relative", overflow: "hidden" }} className="flex-1 flex flex-col min-h-0 min-w-0 bg-[var(--kyro-bg)]">
          {!pickerMode && <div className="media-location"><div><button type="button" onClick={() => setCurrentFolder("")}>Media library</button><span aria-hidden="true">/</span><strong>{currentFolder || "All assets"}</strong><small>{total} {total === 1 ? "file" : "files"}</small></div>{currentFolder && <button type="button" className="kyro-btn kyro-btn-sm kyro-btn-ghost" onClick={() => setCurrentFolder("")}>Clear folder</button>}</div>}
          {!pickerMode && <details className="media-folder-directory"><summary>Browse folders <span>{folders.length}</span></summary><div>{folders.length ? folders.map(folder => <button type="button" key={folder} onClick={event => { setCurrentFolder(folder); event.currentTarget.closest("details")?.removeAttribute("open"); }}><Folder className="w-5 h-5" aria-hidden="true" /><span>{folder}</span><span aria-hidden="true">↗</span></button>) : <p className="media-folder-help">Folders keep related assets together. {canUpload && <button type="button" onClick={() => setShowNewFolderModal(true)}>Create your first folder</button>}</p>}</div></details>}
          <div className={`flex-1 overflow-y-auto custom-scrollbar ${pickerMode ? "" : ""}`}>
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <Shimmer variant="media-card" count={12} />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-[var(--kyro-surface-accent)] flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  <Image className="w-10 h-10 text-[var(--kyro-text-muted)] opacity-30" />
                </div>
                <h3 className="text-xl font-normal text-[var(--kyro-text-primary)] tracking-tight">
                  No assets found
                </h3>
                <p className="text-[var(--kyro-text-secondary)] mt-2 max-w-xs mx-auto text-sm font-medium leading-relaxed">
                  Upload your first file or create a folder to organize your
                  media assets.
                </p>
                {!pickerMode && canUpload && (
                  <button
                    aria-label="Upload media"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-8 px-3 py-2 bg-[var(--kyro-text-primary)] text-[var(--kyro-bg)] rounded-md font-medium text-xs hover:scale-105 transition-all "
                  >
                    Start Uploading
                  </button>
                )}
              </div>
            ) : view === "grid" ? (
              <div className="media-asset-grid">
                {items.map(item => <div key={item.id} className={`media-asset-card ${selectedIds.has(item.id) ? "is-selected" : ""}`}>
                  <button type="button" className="media-asset-preview" aria-label={`Open ${item.title || item.filename}`} onClick={() => setPanelItem(item)}>
                    {item.type === "image" ? <img src={getCroppedUrl(item, 400) || item.url} alt="" loading="lazy" /> : <span className="media-file-placeholder"><FileIcon className="w-8 h-8" /><span>{item.type}</span></span>}
                  </button>
                  <div className="media-asset-caption">
                    <button type="button" className="media-asset-name" title={item.filename} onClick={() => setPanelItem(item)}>{item.filename}</button>
                    <button type="button" className="media-asset-select" aria-label={`Select ${item.filename}`} aria-pressed={selectedIds.has(item.id)} onClick={e => handleSelectOne(item.id, e)}><Check className="w-4 h-4" aria-hidden="true" /></button>
                  </div>
                </div>)}
              </div>
            ) : (
              <div className="surface-tile overflow-hidden rounded-lg animate-in fade-in duration-500">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-normal  tracking-normal text-[var(--kyro-text-secondary)] opacity-40 border-b border-[var(--kyro-border)]">
                      <th className="px-6 py-4 w-12">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-[var(--kyro-border)] text-[var(--kyro-primary)] focus:ring-[var(--kyro-primary)]"
                          checked={selectedIds.size === items.length}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedIds(new Set(items.map((i) => i.id)));
                            else setSelectedIds(new Set());
                          }}
                        />
                      </th>
                      <th className="px-6 py-4">Asset</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Size</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--kyro-border)]">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={`group hover:bg-[var(--kyro-surface-accent)] transition-colors cursor-pointer ${selectedIds.has(item.id) ? "bg-[var(--kyro-surface-accent)]" : ""}`}
                        onClick={() => setPanelItem(item)}
                      >
                        <td
                          className="px-6 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={(e) => handleSelectOne(item.id, e)}
                            className="w-4 h-4 rounded border-[var(--kyro-border)] text-[var(--kyro-primary)] focus:ring-[var(--kyro-primary)]"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[var(--kyro-bg)] overflow-hidden border border-[var(--kyro-border)] flex-shrink-0 flex items-center justify-center">
                              {item.type === "image" ? (
                                <img
                                  src={getCroppedUrl(item, 96) || item.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FileIcon className="w-5 h-5 text-[var(--kyro-text-secondary)] opacity-50" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-normal text-xs text-[var(--kyro-text-primary)] truncate max-w-[200px]">
                                {item.title || item.filename}
                              </span>
                              <span className="text-[10px] text-[var(--kyro-text-secondary)] opacity-50 truncate">
                                {item.filename}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-[9px]">
                            {item.mimeType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-normal text-[var(--kyro-text-secondary)]">
                          {formatFileSize(item.fileSize)}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-normal text-[var(--kyro-text-secondary)]">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="media-row-actions">
                            <button
                              type="button"
                              className="media-row-action"
                              aria-label={`View details for ${item.filename}`}
                              title="View details"
                              onClick={event => { event.stopPropagation(); setPanelItem(item); }}
                            >
                              <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
                            </button>
                            <a
                              className="media-row-action"
                              href={getAbsoluteUrl(item.url)}
                              download={item.filename}
                              aria-label={`Download ${item.filename}`}
                              title="Download"
                              onClick={event => event.stopPropagation()}
                            >
                              <Download size={15} strokeWidth={1.75} aria-hidden="true" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Load More Button */}
            {!loading && page < totalPages && (
              <div className="flex justify-center mt-8 pb-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-3 py-2 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-md font-medium text-xs hover:scale-105 active:scale-95 transition-all  disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Spinner size="sm" /> Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!pickerMode && uploading && <p role="status">Uploading media…</p>}
      {/* Selection actions */}
      {selectedIds.size > 0 && (
        <div className="media-selection-toolbar" role="toolbar" aria-label="Selected media actions">
          <span className="media-selection-count" role="status">{selectedIds.size} selected</span>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="media-selection-clear">
            Clear
          </button>
          <div className="flex items-center gap-4">
            {onSelect && (
              <button
                onClick={() => {
                  const selectedItems = items.filter((i) => selectedIds.has(i.id));
                  onSelect(selectedItems);
                }}
                className="media-selection-confirm"
              >
                Use selected
              </button>
            )}
            {!pickerMode && canDelete && (
              <button
                onClick={handleBulkDelete}
                aria-label={`Delete ${selectedIds.size} selected assets`}
                title="Delete selected"
                className="media-selection-delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Filters Bottom Sheet */}
      {showMobileFilters && !pickerMode && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-[var(--kyro-surface)] rounded-t-3xl  max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-12 duration-300">
            <div className="sticky top-0 bg-[var(--kyro-surface)] z-10 flex items-center justify-between p-6 pb-4 border-b border-[var(--kyro-border)]">
              <h3 className="text-sm font-normal tracking-tight text-[var(--kyro-text-primary)]">
                Filters
              </h3>
              <button
                aria-label="Close media filters"
                onClick={() => setShowMobileFilters(false)}
                className="p-2 rounded-md hover:bg-[var(--kyro-surface-accent)] transition-colors text-[var(--kyro-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Quick Filters */}
              <div>
                <span className="text-[10px] font-normal tracking-normal text-[var(--kyro-text-secondary)] opacity-40 block mb-4">
                  Quick Filters
                </span>
                <div className="flex flex-wrap gap-2">
                  {(["all", "image", "video", "audio", "document", "archive"] as const).map((t) => (
                    <button
                      key={t}
                      aria-pressed={filter === t}
                      onClick={() => { setFilter(t); setShowMobileFilters(false); }}
                      className={`px-4 py-2 rounded-md text-[11px] font-medium capitalize transition-all border ${filter === t ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] border-transparent" : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] border-[var(--kyro-border)] hover:border-[var(--kyro-text-muted)]"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Folders */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-normal tracking-normal text-[var(--kyro-text-secondary)] opacity-40">
                    Folders
                  </span>
                  <button
                    aria-label="Create media folder"
                    onClick={() => { setShowNewFolderModal(true); setShowMobileFilters(false); }}
                    className="p-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-colors text-[var(--kyro-text-primary)]"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setCurrentFolder(""); setShowMobileFilters(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium transition-all ${currentFolder === "" ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] " : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] hover:text-[var(--kyro-text-primary)]"}`}
                  >
                    <FolderInput className="w-4 h-4 opacity-70" />
                    All Assets
                  </button>
                  {folders.map((folder) => (
                    <div key={folder} className="group relative">
                      <button
                        onClick={() => { setCurrentFolder(folder); setShowMobileFilters(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-xs font-medium transition-all ${currentFolder === folder ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] " : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] hover:text-[var(--kyro-text-primary)]"}`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center opacity-70">
                          <Folder fill={currentFolder === folder ? "currentColor" : "none"} />
                        </div>
                        {folder}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                          setShowMobileFilters(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Panel */}
      <SlidePanel
        contained
        containerRef={mediaContainerRef}
        open={!!panelItem}
        onClose={() => { if (!showPreview && !showCrop) setPanelItem(null); }}
        title={panelItem?.filename || "Asset details"}
      >
        {panelItem && (
          <div className="asset-inspector" key={panelItem.id}>
            <div className="asset-inspector-preview">
              {panelItem.type === "image" ? (
                <img src={getCroppedUrl(panelItem) || getAbsoluteUrl(panelItem.url)} alt={panelItem.alt || ""} />
              ) : panelItem.type === "video" ? (
                <video src={getAbsoluteUrl(panelItem.url)} controls />
              ) : panelItem.type === "audio" ? (
                <audio src={getAbsoluteUrl(panelItem.url)} controls />
              ) : <FileIcon aria-hidden="true" />}
              {["image", "video"].includes(panelItem.type) && (
                <button className="asset-expand" aria-label="Expand preview" title="Expand preview" onClick={() => setShowPreview(true)}>
                  <Maximize size={13} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="asset-inspector-facts">{panelItem.mimeType} · {formatFileSize(panelItem.fileSize)}</p>
            <div className="asset-inspector-tools">
              {panelItem.type === "image" && canUpdate && !pickerMode && (
                <button onClick={() => setShowCrop(true)}><CropIcon size={15} /> Crop & focus</button>
              )}
              <a href={getAbsoluteUrl(panelItem.url)} target="_blank" rel="noopener noreferrer">Open original ↗</a>
              {!pickerMode && <a href={getAbsoluteUrl(panelItem.url)} download={panelItem.filename}><Download size={15} /> Download</a>}
            </div>
            {panelItem.type === "image" && (
              <details className="asset-inspector-details">
                <summary>Original image{panelItem.metadata?.crop || panelItem.metadata?.hotspot ? " · Edits applied" : ""}</summary>
                <img src={getAbsoluteUrl(panelItem.url)} alt={panelItem.alt || panelItem.filename}
                  style={{ width: "100%", maxHeight: 200, objectFit: "contain", marginTop: 8 }} />
                <p>The original is preserved. Use Crop & focus, then Reset and Save edits to restore the full image.</p>
              </details>
            )}
            <AssetDescription item={panelItem} editable={canUpdate} onSave={updateMetadata} />
            <details className="asset-inspector-details">
              <summary>File details</summary>
              <p>Uploaded {formatDate(panelItem.createdAt)}</p>
              <label>Public link<input readOnly value={getAbsoluteUrl(panelItem.url)} onFocus={event => event.currentTarget.select()} /></label>
              <button onClick={async () => {
                try {
                  await navigator.clipboard.writeText(getAbsoluteUrl(panelItem.url));
                  toast.success("Public link copied");
                } catch {
                  toast.error("Select the public link and copy it manually.");
                }
              }}><Link size={14} /> Copy link</button>
            </details>
            {!pickerMode && (
              <div className="asset-inspector-footer">
                {canDelete && (
                  <button
                    onClick={() => {
                      confirm({
                        title: "Delete Asset",
                        message: `Are you sure you want to delete ${panelItem.filename}? This cannot be undone.`,
                        variant: "danger",
                        onConfirm: async () => {
                          try {
                            await apiDelete(`/api/media/${panelItem.id}`);
                            setPanelItem(null);
                            loadMedia(1);
                          } catch (error) {
                            console.error("Delete failed:", error);
                            toast.error("Failed to delete asset");
                          }
                        }
                      });
                    }}
                    className="asset-delete"
                  >
                    <Trash2 size={14} /> Delete asset
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* Preview Modal */}
      {showPreview && panelItem && (
        <Modal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          title=""
          size="full"
          variant="lightbox"
        >
          <div className="flex items-center justify-between p-6">
            <div className="flex flex-col">
              <span className="text-white font-normal text-lg tracking-tight">
                {panelItem.filename}
              </span>
              <span className="text-white/40 text-[10px] font-normal  tracking-normal mt-1">
                {formatFileSize(panelItem.fileSize)} · {panelItem.mimeType}
              </span>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 w-full flex items-center justify-center p-12">
            {panelItem.type === "image" ? (
              <img
                src={getCroppedUrl(panelItem) || getAbsoluteUrl(panelItem.url)}
                alt=""
                className="max-h-full max-w-full object-contain  rounded-lg animate-in zoom-in-95 duration-500"
              />
            ) : panelItem.type === "video" ? (
              <video
                src={getAbsoluteUrl(panelItem.url)}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg "
              />
            ) : (
              <div className="text-white text-center">
                <FileIcon className="w-24 h-24 mx-auto mb-6 opacity-20" />
                <p className="text-xl font-normal opacity-50">
                  Preview not available for this file type
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Focal Editor Modal */}
      {!pickerMode && showCrop && panelItem && (
        <Modal
          open={showCrop}
          onClose={() => { if (!uploading) setShowCrop(false); }}
          title=""
          size="full"
          variant="lightbox"
        >
          <MediaLoadBoundary
            loading={t("media.loadingCropEditor", { defaultValue: "Loading crop editor…" })}
            failed={t("media.cropEditorLoadFailed", { defaultValue: "The crop editor couldn’t load." })}
            recoverLabel={t("common.close", { defaultValue: "Close" })}
            onRecover={() => setShowCrop(false)}
          >
            <ImageFocalEditor
              url={getAbsoluteUrl(panelItem.url)}
              initialCrop={panelItem.metadata?.crop}
              initialHotspot={panelItem.metadata?.hotspot}
              onSave={handleSaveCropHotspot}
              onCancel={() => { if (!uploading) setShowCrop(false); }}
              isSaving={uploading}
            />
          </MediaLoadBoundary>
        </Modal>
      )}
      {!pickerMode && (
        <PromptModal
          open={showNewFolderModal}
          onClose={() => setShowNewFolderModal(false)}
          onSubmit={createFolder}
          title={t("tooltips.createNewFolder", { defaultValue: "Create New Folder" })}
          placeholder={t("fields.folderName", { defaultValue: "Folder name" })}
        />
      )}
      {!pickerMode && (
        <Modal
          open={showStorageConfigModal}
          onClose={() => setShowStorageConfigModal(false)}
          title={t("tooltips.storageNotConfigured", { defaultValue: "Storage Not Configured" })}
          size="md"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--kyro-sidebar-active)] flex items-center justify-center">
              <Server className="w-8 h-8 text-[var(--kyro-sidebar-text-active)]" />
            </div>
            <p className="text-[var(--kyro-text-secondary)] mb-6 text-sm">
              Before uploading media, you need to configure your storage
              settings. Choose where files should be stored and how URLs are
              generated.
            </p>
            <div className="flex gap-3">
              <a
                href={`${adminPath}/settings/storage-settings`}
                className="flex-1 px-4 py-3 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl font-normal text-center hover:opacity-90 transition-colors"
              >
                Configure Storage
              </a>
              <button
                type="button"
                onClick={() => {
                  // Set default storage config programmatically
                  apiPost("/api/globals/storage-settings", {
                    provider: "local",
                    local: {
                      uploadDir: "./public/uploads",
                      baseUrl: "/uploads",
                    },
                  }).then(() => {
                    setShowStorageConfigModal(false);
                    setStorageConfigured(true);
                    window.dispatchEvent(new Event('kyro:soft-reload'));
                  }).catch(() => {
                    toast.error("Failed to configure storage");
                  });
                }}
                className="flex-1 px-4 py-2 border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] rounded-md font-medium hover:bg-[var(--kyro-surface-accent)] transition-colors"
              >
                Use Defaults
              </button>
            </div>
          </div>
        </Modal>
      )}
      {!pickerMode && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) handleUpload(e.target.files);
          }}
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar,.tar"
        />
      )}
    </div>
  );
}

function AssetDescription({ item, editable, onSave }: {
  item: MediaItem;
  editable: boolean;
  onSave: (id: string, fields: Partial<MediaItem>) => Promise<void>;
}) {
  const [alt, setAlt] = useState(item.alt || "");
  const [caption, setCaption] = useState(item.caption || "");
  const [saving, setSaving] = useState(false);
  const changed = alt !== (item.alt || "") || caption !== (item.caption || "");
  return (
    <form onSubmit={async event => {
      event.preventDefault();
      if (!editable || saving || !changed) return;
      setSaving(true);
      try { await onSave(item.id, { alt, caption }); }
      finally { setSaving(false); }
    }}>
      <label htmlFor="asset-alt">Alt text</label>
      {editable && <button className="asset-use-name" type="button" disabled={saving} onClick={() => setAlt(item.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "))}>Use filename</button>}
      <textarea id="asset-alt" rows={2} readOnly={!editable || saving} value={alt} onChange={event => setAlt(event.target.value)} />
      <label htmlFor="asset-caption">Caption</label>
      <textarea id="asset-caption" rows={2} readOnly={!editable || saving} value={caption} onChange={event => setCaption(event.target.value)} />
      {editable && changed && <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>}
    </form>
  );
}
