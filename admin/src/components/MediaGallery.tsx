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
  X,
  FileIcon,
  FolderInput,
  FolderPlus,
  Grid,
  Link,
  Crop as CropIcon,
  Film,
  Music,
  FileText,
  Archive,
} from "./ui/icons";
import { PromptModal } from "./ui/PromptModal";
import { ImageFocalEditor } from "./ui/ImageFocalEditor";
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

interface MediaItem {
  id: string;
  title: string;
  filename: string;
  originalName?: string;
  url: string;
  thumbnailUrl?: string;
  type: "image" | "video" | "audio" | "document" | "archive" | "other";
  mimeType: string;
  fileSize: number;
  folder?: string;
  alt?: string;
  caption?: string;
  metadata?: {
    crop?: { x: number; y: number; width: number; height: number };
    hotspot?: { x: number; y: number; width: number; height: number };
    [key: string]: any;
  };
  createdAt: string;
  updatedAt?: string;
}

function getAbsoluteUrl(relativeUrl: unknown): string {
  if (typeof relativeUrl !== "string" || !relativeUrl) return "";
  if (typeof window === "undefined") return relativeUrl;
  // Remote URLs and blob URLs are returned as-is
  if (relativeUrl.startsWith("http") || relativeUrl.startsWith("blob:")) {
    return relativeUrl;
  }
  // Remove consecutive slashes for local paths (e.g. //photo... -> /photo...)
  const sanitized = relativeUrl.replace(/^\/+/, "/");
  return `${window.location.origin}${sanitized}`;
}

function getCroppedUrl(item: MediaItem, width?: number): string | null {
  if (!item.metadata?.crop) return null;
  const { x, y, width: cw, height: ch } = item.metadata.crop;
  if (!cw || !ch) return null;
  const base = getAbsoluteUrl(item.url);
  if (!base) return null;
  const params = new URLSearchParams({ url: item.url });
  params.set("cx", String(x));
  params.set("cy", String(y));
  params.set("cw", String(cw));
  params.set("ch", String(ch));
  if (width) params.set("w", String(width));
  const resizePath = `/api/media/resize?${params.toString()}`;
  if (typeof window === "undefined") return resizePath;
  return `${window.location.origin}${resizePath}`;
}

type FilterType =
  | "all"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileType(mimeType: string): FilterType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("archive")
  )
    return "archive";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("doc") ||
    mimeType.includes("text")
  )
    return "document";
  return "other";
}

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
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
      setItems((prev) => prev.map((item) => (item.id === id ? result.doc : item)));
      if (panelItem?.id === id) {
        setPanelItem(result.doc);
      }
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
        crop: cropData,
        hotspot: hotspotData
      };

      const result = await apiPatch(`/api/media/${panelItem.id}`, { metadata });
      setItems(prev => prev.map(item => item.id === panelItem.id ? result.doc : item));
      setPanelItem(result.doc);
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
      className={`flex flex-col h-full bg-[var(--kyro-bg)] transition-all duration-300 ${isDragging ? "ring-4 ring-[var(--kyro-sidebar-active)] ring-inset" : ""}`}
      {...(pickerMode ? {} : {
        onDragOver: (e) => { e.preventDefault(); setIsDragging(true); },
        onDragLeave: () => setIsDragging(false),
        onDrop: (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleUpload(e.dataTransfer.files); },
      })}
    >
      {/* Top Bar */}
      <div className={`flex flex-col ${pickerMode ? "gap-2 p-2" : "gap-4 md:gap-6 p-4 md:p-6 rounded-md md:rounded-t-xl surface-tile"} border-b border-[var(--kyro-border)] backdrop-blur-md sticky top-0 z-10`}>
        {!pickerMode && (
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-lg md:text-xl font-bold tracking-tighter text-[var(--kyro-text-primary)]">
                Media Library
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold tracking-widest text-[var(--kyro-text-secondary)] opacity-50">
                  {total} Items <span className="hidden sm:inline">· {formatFileSize(stats.totalSize)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-[var(--kyro-surface-accent)] p-1 rounded-xl border border-[var(--kyro-border)] hidden sm:flex">
                <button
                  onClick={() => setView("grid")}
                  className={`p-1.5 md:p-2 rounded-lg transition-all ${view === "grid" ? "bg-[var(--kyro-surface)] shadow-sm text-[var(--kyro-text-primary)]" : "text-[var(--kyro-text-secondary)] opacity-50 hover:opacity-100"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-1.5 md:p-2 rounded-lg transition-all ${view === "list" ? "bg-[var(--kyro-surface)] shadow-sm text-[var(--kyro-text-primary)]" : "text-[var(--kyro-text-secondary)] opacity-50 hover:opacity-100"}`}
                >
                  <FileIcon className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowMobileFilters(true)}
                className="md:hidden p-2 rounded-xl bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
              >
                <Filter className="w-4 h-4" />
              </button>

              {canUpload && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-3 md:px-6 py-2 md:py-2.5 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all"
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
              placeholder={t("fields.searchAssets", { defaultValue: "Search assets..." })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] transition-all text-xs font-bold"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Folders Sidebar */}
        {!pickerMode && (
          <div className="w-64 border-r border-[var(--kyro-border)] surface-tile mt-6 overflow-y-auto hidden md:block">
            <div className="p-6 space-y-6">
              <div>
                <span className="text-[10px] font-bold  tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40 block mb-4">
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
                      onClick={() => setFilter(t)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[11px] font-bold capitalize transition-all ${filter === t ? "text-[var(--kyro-text-primary)] bg-[var(--kyro-surface-accent)]" : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)]/50"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${filter === t ? "bg-[var(--kyro-primary)]" : "bg-transparent border border-current opacity-30"}`}
                      />
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--kyro-border)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold  tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40">
                    Folders
                  </span>
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="p-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-colors text-[var(--kyro-text-primary)]"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => setCurrentFolder("")}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${currentFolder === "" ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] shadow-md" : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] hover:text-[var(--kyro-text-primary)]"}`}
                  >
                    <FolderInput className="w-4 h-4 opacity-70" />
                    All Assets
                  </button>
                  {folders.map((folder) => (
                    <div key={folder} className="group relative">
                      <button
                        onClick={() => setCurrentFolder(folder)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${currentFolder === folder ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] shadow-md" : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] hover:text-[var(--kyro-text-primary)]"}`}
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
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[var(--kyro-bg)]">
          <div className={`flex-1 overflow-y-auto custom-scrollbar ${pickerMode ? "px-2 py-4" : "py-4 px-2 md:py-8 md:px-4"}`}>
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <Shimmer variant="media-card" count={12} />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-[var(--kyro-surface-accent)] flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  <Grid className="w-10 h-10 text-[var(--kyro-text-muted)] opacity-30" />
                </div>
                <h3 className="text-xl font-bold text-[var(--kyro-text-primary)] tracking-tight">
                  No assets found
                </h3>
                <p className="text-[var(--kyro-text-secondary)] mt-2 max-w-xs mx-auto text-sm font-medium leading-relaxed">
                  Upload your first file or create a folder to organize your
                  media assets.
                </p>
                {!pickerMode && canUpload && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-8 px-8 py-3 bg-[var(--kyro-text-primary)] text-[var(--kyro-bg)] rounded-2xl font-bold text-xs hover:scale-105 transition-all shadow-xl"
                  >
                    Start Uploading
                  </button>
                )}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`group relative aspect-square rounded-lg overflow-hidden bg-[var(--kyro-surface-accent)] border-2 transition-all duration-300 cursor-pointer ${selectedIds.has(item.id) ? "border-[var(--kyro-primary)]" : "border-transparent hover:border-[var(--kyro-border-strong)] hover:shadow-2xl hover:-translate-y-1"}`}
                    onClick={() => setPanelItem(item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleSelectOne(item.id, e);
                    }}
                  >
                    {item.type === "image" ? (
                      <img
                        src={getCroppedUrl(item, 400) || item.url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4">
                        <div className="p-4 rounded-2xl bg-[var(--kyro-surface)] shadow-inner text-[var(--kyro-text-secondary)] group-hover:scale-110 transition-transform duration-500">
                          {item.type === "video" ? (
                            <Film className="w-8 h-8" />
                          ) : item.type === "audio" ? (
                            <Music className="w-8 h-8" />
                          ) : item.type === "document" ? (
                            <FileText className="w-8 h-8" />
                          ) : item.type === "archive" ? (
                            <Archive className="w-8 h-8" />
                          ) : (
                            <FileIcon className="w-8 h-8" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold  tracking-widest text-[var(--kyro-text-secondary)] opacity-50 text-center px-4 line-clamp-2">
                          {item.title}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-[10px] truncate max-w-[120px]">
                          {item.filename}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => handleSelectOne(item.id, e)}
                            className={`kyro-btn-primary p-1.5 rounded-lg transition-all ${selectedIds.has(item.id) ? "" : "bg-white/10 text-white hover:bg-white/20"}`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedIds.has(item.id) && (
                      <div className="absolute top-3 left-3 w-6 h-6 rounded-lg bg-[var(--kyro-primary)] text-[var(--kyro-sidebar-text-active)] flex items-center justify-center shadow-lg border-2 border-white/20 animate-in zoom-in duration-300">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="surface-tile overflow-hidden rounded-lg animate-in fade-in duration-500">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold  tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40 border-b border-[var(--kyro-border)]">
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
                              <span className="font-bold text-xs text-[var(--kyro-text-primary)] truncate max-w-[200px]">
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
                        <td className="px-6 py-4 text-[11px] font-bold text-[var(--kyro-text-secondary)]">
                          {formatFileSize(item.fileSize)}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-[var(--kyro-text-secondary)]">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectOne(item.id, e);
                            }}
                            className={`kyro-btn-primary p-2 rounded-lg transition-all ${selectedIds.has(item.id) ? "" : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] opacity-0 group-hover:opacity-100"}`}
                          >
                            <Grid className="w-4 h-4" />
                          </button>
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
                  className="px-8 py-3 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
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

      {/* Upload Banner */}
      {!pickerMode && uploading && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] w-full max-w-lg">
          <div className="bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-[2rem] shadow-2xl p-6 ring-1 ring-white/10 animate-in slide-in-from-bottom-12 duration-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] flex items-center justify-center animate-pulse">
                  <Spinner />
                </div>
                <span className="text-sm font-bold tracking-tight text-[var(--kyro-text-primary)]">
                  Uploading Files
                </span>
              </div>
              <span className="text-[10px] font-bold  tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-50">
                {Object.keys(uploadProgress).length} Total
              </span>
            </div>
            <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(uploadProgress).map(([name, progress]) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-[var(--kyro-text-primary)] truncate max-w-[200px]">
                      {name}
                    </span>
                    <span className="text-[var(--kyro-primary)]">
                      {progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--kyro-surface-accent)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--kyro-primary)] transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selection Footer */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60] bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-full shadow-2xl px-2 py-2 flex items-center gap-12 animate-in slide-in-from-bottom-12 duration-700 ring-1 ring-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-5 border-r border-[var(--kyro-border)] ">
            <div className="w-12 h-12 rounded-full bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] flex items-center justify-center text-lg font-bold shadow-inner">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-[11px] font-bold  tracking-[0.2em] text-[var(--kyro-text-primary)]">
                Selected
              </p>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-[10px] font-bold text-[var(--kyro-primary)] hover:underline opacity-80"
              >
                Clear all
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {onSelect && (
              <button
                onClick={() => {
                  const selectedItems = items.filter((i) => selectedIds.has(i.id));
                  onSelect(selectedItems);
                }}
                className="px-8 py-3 bg-[var(--kyro-text-primary)] text-[var(--kyro-bg)] rounded-full font-bold text-xs hover:scale-105 transition-all shadow-xl"
              >
                Confirm Selection
              </button>
            )}
            {!pickerMode && canDelete && (
              <button
                onClick={handleBulkDelete}
                className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all active:scale-90"
              >
                <Trash2 className="w-5 h-5" />
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
          <div className="fixed bottom-0 left-0 right-0 bg-[var(--kyro-surface)] rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-12 duration-300">
            <div className="sticky top-0 bg-[var(--kyro-surface)] z-10 flex items-center justify-between p-6 pb-4 border-b border-[var(--kyro-border)]">
              <h3 className="text-sm font-bold tracking-tight text-[var(--kyro-text-primary)]">
                Filters
              </h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 rounded-xl hover:bg-[var(--kyro-surface-accent)] transition-colors text-[var(--kyro-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Quick Filters */}
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40 block mb-4">
                  Quick Filters
                </span>
                <div className="flex flex-wrap gap-2">
                  {(["all", "image", "video", "audio", "document", "archive"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setFilter(t); setShowMobileFilters(false); }}
                      className={`px-4 py-2 rounded-xl text-[11px] font-bold capitalize transition-all border ${filter === t ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] border-transparent" : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] border-[var(--kyro-border)] hover:border-[var(--kyro-text-muted)]"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Folders */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40">
                    Folders
                  </span>
                  <button
                    onClick={() => { setShowNewFolderModal(true); setShowMobileFilters(false); }}
                    className="p-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-colors text-[var(--kyro-text-primary)]"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setCurrentFolder(""); setShowMobileFilters(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${currentFolder === "" ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] shadow-md" : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] hover:text-[var(--kyro-text-primary)]"}`}
                  >
                    <FolderInput className="w-4 h-4 opacity-70" />
                    All Assets
                  </button>
                  {folders.map((folder) => (
                    <div key={folder} className="group relative">
                      <button
                        onClick={() => { setCurrentFolder(folder); setShowMobileFilters(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${currentFolder === folder ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] shadow-md" : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] hover:text-[var(--kyro-text-primary)]"}`}
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
        open={!!panelItem}
        onClose={() => setPanelItem(null)}
        title={t("tooltips.assetDetails", { defaultValue: "Asset Details" })}
        subtitle={panelItem?.filename}
      >
        {panelItem && (
          <div className="flex flex-col h-full">
            <div className="aspect-video w-full rounded-2xl bg-[var(--kyro-bg)] border border-[var(--kyro-border)] overflow-hidden relative group">
              {panelItem.type === "image" ? (
                <img
                  src={getCroppedUrl(panelItem) || getAbsoluteUrl(panelItem.url)}
                  alt=""
                  className="w-full h-full object-contain p-4"
                />
              ) : panelItem.type === "video" ? (
                <video
                  src={getAbsoluteUrl(panelItem.url)}
                  controls
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-[var(--kyro-surface-accent)] flex items-center justify-center">
                    <FileIcon className="w-10 h-10 text-[var(--kyro-text-secondary)]" />
                  </div>
                  <Badge variant="outline" className="text-xs font-bold">
                    {panelItem.mimeType}
                  </Badge>
                </div>
              )}

              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setShowPreview(true)}
                  className="p-2.5 bg-black/50 backdrop-blur-md text-white rounded-xl hover:bg-black/70 transition-all"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-8 space-y-8 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--kyro-surface-accent)]/50 border border-[var(--kyro-border)]">
                  <span className="text-[9px] font-bold  tracking-widest text-[var(--kyro-text-secondary)] opacity-50 block mb-1">
                    Dimensions
                  </span>
                  <span className="text-xs font-bold text-[var(--kyro-text-primary)]">
                    {panelItem.type === "image" ? "Original Resolution" : "N/A"}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--kyro-surface-accent)]/50 border border-[var(--kyro-border)]">
                  <span className="text-[9px] font-bold  tracking-widest text-[var(--kyro-text-secondary)] opacity-50 block mb-1">
                    File Size
                  </span>
                  <span className="text-xs font-bold text-[var(--kyro-text-primary)]">
                    {formatFileSize(panelItem.fileSize)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold  tracking-widest text-[var(--kyro-text-secondary)] opacity-50 block mb-2 px-1">
                    Public Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getAbsoluteUrl(panelItem.url)}
                      className="flex-1 px-4 py-3 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl text-[10px] font-bold font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          getAbsoluteUrl(panelItem.url),
                        );
                        toast.success("URL copied to clipboard");
                      }}
                      className="p-3 bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-border)] border border-[var(--kyro-border)] rounded-xl transition-all"
                    >
                      <Link className="w-4 h-4 text-[var(--kyro-text-primary)]" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold  tracking-widest text-[var(--kyro-text-secondary)] opacity-50 block mb-2 px-1">
                      Alt Text
                    </label>
                    <textarea
                      value={panelItem.alt || ""}
                      onChange={(e) =>
                        updateMetadata(panelItem.id, { alt: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-lg text-xs font-bold transition-all resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
                      placeholder={t("fields.describeThisAsset", { defaultValue: "Describe this asset..." })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold  tracking-widest text-[var(--kyro-text-secondary)] opacity-50 block mb-2 px-1">
                      Caption
                    </label>
                    <textarea
                      value={panelItem.caption || ""}
                      onChange={(e) =>
                        updateMetadata(panelItem.id, {
                          caption: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-lg text-xs font-bold transition-all resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-transparent"
                      placeholder={t("fields.addACaption", { defaultValue: "Add a caption..." })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {!pickerMode && (
              <div className="pt-8 border-t border-[var(--kyro-border)] mt-8 flex gap-3 pb-8">
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = getAbsoluteUrl(panelItem.url);
                    link.download = panelItem.filename;
                    link.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl font-bold text-xs shadow-lg hover:opacity-90 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {panelItem.type === "image" && canUpdate && (
                  <button
                    onClick={() => setShowCrop(true)}
                    className="p-3 border border-[var(--kyro-border)] rounded-xl text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-all"
                  >
                    <CropIcon className="w-4 h-4" />
                  </button>
                )}
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
                    className="p-3 border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
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
              <span className="text-white font-bold text-lg tracking-tight">
                {panelItem.filename}
              </span>
              <span className="text-white/40 text-[10px] font-bold  tracking-widest mt-1">
                {formatFileSize(panelItem.fileSize)} · {panelItem.mimeType}
              </span>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 w-full flex items-center justify-center p-12">
            {panelItem.type === "image" ? (
              <img
                src={getCroppedUrl(panelItem) || getAbsoluteUrl(panelItem.url)}
                alt=""
                className="max-h-full max-w-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-500"
              />
            ) : panelItem.type === "video" ? (
              <video
                src={getAbsoluteUrl(panelItem.url)}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg shadow-2xl"
              />
            ) : (
              <div className="text-white text-center">
                <FileIcon className="w-24 h-24 mx-auto mb-6 opacity-20" />
                <p className="text-xl font-bold opacity-50">
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
          onClose={() => setShowCrop(false)}
          title=""
          size="full"
          variant="lightbox"
        >
          <ImageFocalEditor
            url={getAbsoluteUrl(panelItem.url)}
            initialCrop={panelItem.metadata?.crop}
            initialHotspot={panelItem.metadata?.hotspot}
            onSave={handleSaveCropHotspot}
            onCancel={() => setShowCrop(false)}
            isSaving={uploading}
          />
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
                className="flex-1 px-4 py-3 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl font-bold text-center hover:opacity-90 transition-colors"
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
                className="flex-1 px-4 py-3 border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] rounded-xl font-bold hover:bg-[var(--kyro-surface-accent)] transition-colors"
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
