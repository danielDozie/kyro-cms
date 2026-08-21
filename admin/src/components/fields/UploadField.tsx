import "../../lib/i18n";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Image as ImageIcon, Film, FileText, Music, File, X, Loader2, Check } from "../ui/icons";
import { apiGet, withCacheBust, apiPost, apiUpload, resolveApi, resolveMedia } from "../../lib/api";
import { toast } from "../../lib/stores";
import { useTranslation } from "react-i18next";

interface UploadFieldProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  title?: string;
  folder?: string;
}

interface MediaFolder {
  name: string;
  path: string;
}

const getFileType = (mimeType?: string, filename?: string) => {
  const mime = mimeType?.toLowerCase() || "";
  const name = filename?.toLowerCase() || "";

  if (
    mime.startsWith("image/") ||
    name.match(/\.(jpe?g|png|gif|webp|avif|svg)$/i)
  )
    return "image";
  if (mime.startsWith("video/") || name.match(/\.(mp4|webm|ogg|mov)$/i))
    return "video";
  if (mime.startsWith("audio/") || name.match(/\.(mp3|wav|ogg|m4a)$/i))
    return "audio";
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (name.match(/\.(doc|docx|txt|rtf|odt)$/i)) return "document";
  if (name.match(/\.(xls|xlsx|csv)$/i)) return "spreadsheet";
  if (name.match(/\.(zip|tar|gz|7z|rar)$/i)) return "archive";

  return "other";
};

const FileIcon = ({
  type,
  className,
}: {
  type: string;
  className?: string;
}) => {
  switch (type) {
    case "image":
      return <ImageIcon className={className} />;
    case "video":
      return <Film className={className} />;
    case "audio":
      return <Music className={className} />;
    case "pdf":
    case "document":
      return <FileText className={className} />;
    default:
      return <File className={className} />;
  }
};

export function UploadField({
  field,
  value,
  onChange,
  disabled,
}: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isPickerFullscreen, setIsPickerFullscreen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlError, setUrlError] = useState("");
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);

  const fieldLabel = field?.label || field?.name || "File";
  const maxCount = field.maxCount ?? (field.hasMany ? 999 : 1);
  const isMultiple = maxCount > 1;
  const currentValue = Array.isArray(value) ? value : value ? [value] : [];
  const canAddMore = currentValue.length < maxCount;

  const [fetchedDetails, setFetchedDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchMissingDetails = async () => {
      const idsToFetch = currentValue
        .filter((item): item is string => typeof item === 'string')
        .map(id => id);

      const objectIdsToFetch = currentValue
        .filter((item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null &&
          typeof item.id === 'string' &&
          !item.url && !item.filename && !item.mimeType
        )
        .map(item => item.id as string);

      const allIds = [...idsToFetch, ...objectIdsToFetch];
      const missingIds = allIds.filter(id => !fetchedDetails[id]);

      if (missingIds.length === 0) return;

      try {
        const fetchedItems = await Promise.all(
          missingIds.map(id => apiGet<any>(`/api/media/${id}`))
        );

        setFetchedDetails(prev => {
          const next = { ...prev };
          fetchedItems.forEach(item => {
            if (item && item.id) next[item.id] = item;
          });
          return next;
        });
      } catch (err) {
        console.error("Failed to fetch media details:", err);
      }
    };

    fetchMissingDetails();
  }, [value, fetchedDetails]);

  useEffect(() => {
    if (showPicker) {
      loadFolders();
      loadMedia();
    }
  }, [showPicker, selectedFolder]);

  const loadFolders = async () => {
    try {
      const result = await apiGet<any>(withCacheBust("/api/media/folders"));
      setFolders(result.folders || []);
    } catch {
      setFolders([]);
    }
  };

  const loadMedia = async () => {
    setMediaLoading(true);
    try {
      let url = withCacheBust(
        `/api/media?limit=60&sortBy=createdAt&sortDir=desc`,
      );
      if (selectedFolder) {
        url += "&folder=" + encodeURIComponent(selectedFolder);
      }
      const result = await apiGet<any>(url);
      setMediaItems(result.docs || []);
    } catch {
      setMediaItems([]);
    } finally {
      setMediaLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedFolder) {
        formData.append("folder", selectedFolder);
      }
      const result = await apiUpload<any>("/api/media/upload", formData);
      const data = result.data || result.doc || result;
      const newImage = {
        ...data,
        id: data.id,
        filename: data.filename,
        originalName: data.originalName ?? file.name,
        url: data.url,
        mimeType: data.mimeType || file.type,
      };
      if (isMultiple) {
        onChange([...currentValue, newImage]);
      } else {
        onChange(newImage);
      }
      toast.success(`Asset synchronized: ${newImage.filename}`);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const addByUrl = async () => {
    const url = urlValue.trim();
    if (!url) return;

    setUrlError("");
    try {
      const result = await apiPost<any>("/api/media/upload", { url });
      const originalName = (() => {
        try {
          return (
            new URL(url).pathname.split("/").pop() ||
            result.originalName ||
            "url-image"
          );
        } catch {
          return result.originalName || "url-image";
        }
      })();
      const newImage = {
        id: result.id,
        filename: result.filename,
        originalName,
        url: result.url,
        mimeType: result.mimeType || "image/*",
      };
      if (isMultiple) {
        onChange([...currentValue, newImage]);
      } else {
        onChange(newImage);
      }
      toast.success(`URL asset established: ${newImage.filename}`);
      setUrlValue("");
      setShowUrlInput(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid URL";
      setUrlError(message);
    }
  };

  const toMediaObj = (item: MediaItem) => ({
    id: item.id,
    filename: item.filename,
    url: item.url,
    mimeType: item.mimeType,
  });

  const selectFromLibrary = (item: MediaItem) => {
    if (isMultiple) {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.id === item.id);
        if (exists) return prev.filter(i => i.id !== item.id);
        return [...prev, item];
      });
    } else {
      onChange(toMediaObj(item));
      setShowPicker(false);
      setPickerSearch("");
    }
  };

  const handleDone = () => {
    if (selectedItems.length > 0) {
      const newItems = [...currentValue, ...selectedItems.map(toMediaObj)];
      onChange(newItems);
    }
    setSelectedItems([]);
    setShowPicker(false);
    setPickerSearch("");
  };

  const removeImage = (index: number) => {
    const newValue = [...currentValue];
    newValue.splice(index, 1);
    onChange(isMultiple ? newValue : newValue[0] || null);
  };

  const filteredMedia = useMemo(() => {
    return mediaItems.filter((item) => {
      return (
        !pickerSearch ||
        item.filename?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        item.title?.toLowerCase().includes(pickerSearch.toLowerCase())
      );
    });
  }, [mediaItems, pickerSearch]);

  if (uploading) {
    return (
      <div className="text-xs text-[var(--kyro-text-muted)] p-2">
        Uploading...
      </div>
    );
  }

  const renderImagePreview = (rawImg: any, index?: number) => {
    if (!rawImg) return null;
    const id = typeof rawImg === 'string' ? rawImg : rawImg.id;
    const img = fetchedDetails[id] || (typeof rawImg === 'object' ? rawImg : { id });
    const fileType = getFileType(img.mimeType, img.filename || img.url);
    const isImage = fileType === "image";

    return (
      <div
        key={index}
        className="flex items-center gap-3 p-2.5 bg-[var(--kyro-surface-accent)] rounded-lg border border-[var(--kyro-border)] group"
      >
        <div className="w-10 h-10 rounded-md overflow-hidden bg-[var(--kyro-surface)] border border-[var(--kyro-border)] flex items-center justify-center flex-shrink-0">
          {isImage ? (
            <img
              src={resolveMedia(img.url)}
              alt={img.filename || "Preview"}
              className="w-full h-full object-cover"
            />
          ) : (
            <FileIcon
              type={fileType}
              className="w-5 h-5 text-[var(--kyro-text-secondary)]"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium truncate text-[var(--kyro-text-primary)]">
            {img.originalName || img.filename || "Unnamed File"}
          </div>
          <div className="text-[10px] text-[var(--kyro-text-muted)] tracking-wider font-bold">
            {fieldLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            index !== undefined ? removeImage(index) : onChange(null)
          }
          disabled={disabled}
          className="p-1.5 rounded-md text-[var(--kyro-text-muted)] hover:text-[var(--kyro-error)] hover:bg-[var(--kyro-danger-bg)] transition-all opacity-0 group-hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-2 relative">
      <input
        ref={inputRef}
        type="file"
        accept={field.allowedTypes?.join(",") || "*/*"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
        }}
        disabled={disabled}
        className="hidden"
      />

      {currentValue.length > 0 && (
        <div className={isMultiple ? "grid grid-cols-2 gap-2" : "space-y-2"}>
          {currentValue.map((img: any, i: number) =>
            renderImagePreview(img, i),
          )}
        </div>
      )}

      {(!currentValue.length || canAddMore) && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-semibold rounded border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] cursor-pointer hover:border-[var(--kyro-border-active)] transition-colors"
          >
            + Upload {fieldLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedItems([]);
              setShowPicker(true);
            }}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-semibold rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] cursor-pointer hover:border-[var(--kyro-border-active)] transition-colors"
          >
            Library
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-semibold rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] cursor-pointer hover:border-[var(--kyro-border-active)] transition-colors"
          >
            URL
          </button>
        </div>
      )}

      {showUrlInput && (
        <div className="flex gap-2 items-center">
          <input
            ref={urlInputRef}
            type="url"
            placeholder="https://example.com/image.jpg"
            value={urlValue}
            onChange={(e) => {
              setUrlValue(e.target.value);
              setUrlError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && addByUrl()}
            disabled={disabled}
            className="flex-1 px-2 py-1.5 text-xs rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)]"
          />
          <button
            type="button"
            onClick={addByUrl}
            disabled={disabled || !urlValue.trim()}
            className="kyro-btn kyro-btn-primary px-3 py-1.5 text-xs rounded cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Add
          </button>
          {urlError && (
            <span className="text-xs text-[var(--kyro-error)]">{urlError}</span>
          )}
        </div>
      )}

      {showPicker &&
        (isPickerFullscreen ? (
          createPortal(
            <MediaPickerContent
              isFullscreen
              isMultiple={isMultiple}
              selectedItems={selectedItems}
              pickerSearch={pickerSearch}
              setPickerSearch={setPickerSearch}
              folders={folders}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              mediaLoading={mediaLoading}
              filteredMedia={filteredMedia}
              selectFromLibrary={selectFromLibrary}
              onDone={handleDone}
              setIsPickerFullscreen={setIsPickerFullscreen}
              setShowPicker={setShowPicker}
            />,
            document.body,
          )
        ) : (
          <MediaPickerContent
            isFullscreen={false}
            isMultiple={isMultiple}
            selectedItems={selectedItems}
            pickerSearch={pickerSearch}
            setPickerSearch={setPickerSearch}
            folders={folders}
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            mediaLoading={mediaLoading}
            filteredMedia={filteredMedia}
            selectFromLibrary={selectFromLibrary}
            onDone={handleDone}
            setIsPickerFullscreen={setIsPickerFullscreen}
            setShowPicker={setShowPicker}
          />
        ))}
    </div>
  );
}

function MediaPickerContent({
  isFullscreen,
  isMultiple,
  selectedItems,
  pickerSearch,
  setPickerSearch,
  folders,
  selectedFolder,
  setSelectedFolder,
  mediaLoading,
  filteredMedia,
  selectFromLibrary,
  onDone,
  setIsPickerFullscreen,
  setShowPicker,
}: {
  isFullscreen: boolean;
  isMultiple: boolean;
  selectedItems: MediaItem[];
  pickerSearch: string;
  setPickerSearch: (v: string) => void;
  folders: MediaFolder[];
  selectedFolder: string;
  setSelectedFolder: (v: string) => void;
  mediaLoading: boolean;
  filteredMedia: MediaItem[];
  selectFromLibrary: (item: MediaItem) => void;
  onDone: () => void;
  setIsPickerFullscreen: (v: boolean) => void;
  setShowPicker: (v: boolean) => void;
}) {
    const { t } = useTranslation();
  const isItemSelected = (id: string) => selectedItems.some(i => i.id === id);

  return (
    <div
      className={`${isFullscreen
        ? "fixed inset-0 z-[9999]"
        : "relative z-[9999] w-[360px] max-h-[400px] mt-1 rounded-lg shadow-lg"
        } overflow-hidden bg-[var(--kyro-surface)] border border-[var(--kyro-border)] flex flex-col`}
    >
      <div className="p-2 border-b border-[var(--kyro-border)] flex flex-col gap-2">
        <input
          type="text"
          placeholder={t("fields.searchMedia", { defaultValue: "Search media..." })}
          value={pickerSearch}
          onChange={(e) => setPickerSearch(e.target.value)}
          className="w-full px-2 py-1.5 text-xs rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)]"
        />
        {folders.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedFolder("")}
              className={`kyro-btn-primary px-2 py-1 text-xs rounded transition-colors ${selectedFolder === ""
                ? ""
                : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-border)]"
                }`}
            >
              All
            </button>
            {folders.slice(0, 6).map((folder) => (
              <button
                key={folder.path}
                type="button"
                onClick={() => setSelectedFolder(folder.path)}
                className={`kyro-btn-primary px-2 py-1 text-xs rounded transition-colors ${selectedFolder === folder.path
                  ? ""
                  : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-border)]"
                  }`}
              >
                {folder.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Picker Items */}
      <div className="flex-1 overflow-auto p-2">
        {mediaLoading ? (
          <div className="text-center py-5 text-xs text-[var(--kyro-text-muted)]">
            Loading...
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-5 text-xs text-[var(--kyro-text-muted)]">
            No media found
          </div>
        ) : (
          <div
            className={`grid gap-1 ${isFullscreen
              ? "grid-cols-[repeat(auto-fill,minmax(140px,1fr))]"
              : "grid-cols-3"
              }`}
          >
            {filteredMedia.map((item) => {
              const selected = isItemSelected(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectFromLibrary(item)}
                  className={`border rounded-md overflow-hidden cursor-pointer p-0 bg-[var(--kyro-surface)] transition-all relative group ${selected
                    ? "border-[var(--kyro-primary)] ring-2 ring-[var(--kyro-primary)]"
                    : "border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]"
                    }`}
                >
                  <div
                    className={`w-full flex items-center justify-center bg-[var(--kyro-surface-accent)] ${isFullscreen ? "h-[120px]" : "h-[80px]"
                      }`}
                  >
                    {getFileType(item.mimeType, item.filename) === "image" ? (
                      <img
                        src={resolveMedia(item.thumbnailUrl || item.url)}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileIcon
                        type={getFileType(item.mimeType, item.filename)}
                        className={isFullscreen ? "w-10 h-10" : "w-8 h-8"}
                      />
                    )}
                  </div>
                  {isMultiple && selected && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--kyro-primary)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-[var(--kyro-border)] flex justify-between items-center">
        <span className="text-xs text-[var(--kyro-text-muted)]">
          {filteredMedia.length} items
        </span>
        <div className="flex gap-2 items-center">
          {isMultiple && (
            <button
              type="button"
              onClick={onDone}
              className="kyro-btn kyro-btn-primary px-3 py-1 text-xs font-semibold rounded cursor-pointer hover:opacity-90 transition-opacity"
            >
              Done{selectedItems.length > 0 ? ` (${selectedItems.length})` : ""}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsPickerFullscreen(!isFullscreen)}
            className="p-1.5 rounded text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPicker(false);
              setIsPickerFullscreen(false);
            }}
            className="text-xs text-[var(--kyro-text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--kyro-text-primary)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
