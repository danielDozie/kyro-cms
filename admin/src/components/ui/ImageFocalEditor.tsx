import "./ImageFocalEditor.css";
import { imageFrame } from "@kyro-cms/studio";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop as CropIcon, MousePointerClick, RefreshCcw, Eye } from "./icons";

interface RectPercent {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageFocalEditorProps {
  url: string;
  initialCrop?: RectPercent;
  initialHotspot?: RectPercent;
  onSave: (crop: RectPercent | undefined, hotspot: RectPercent | undefined) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ImageFocalEditor({
  url,
  initialCrop,
  initialHotspot,
  onSave,
  onCancel,
  isSaving = false,
}: ImageFocalEditorProps) {
  const [previewRatio, setPreviewRatio] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<"crop" | "hotspot">("crop");

  const [crop, setCrop] = useState<Crop | undefined>(
    initialCrop ? { unit: "%", ...initialCrop } : undefined
  );

  const [hotspot, setHotspot] = useState<RectPercent>(
    initialHotspot || { x: 40, y: 40, width: 20, height: 20 }
  );

  const [showHotspot, setShowHotspot] = useState(!!initialHotspot);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging logic for Hotspot
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; hX: number; hY: number; hW: number; hH: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, resizeType?: string) => {
    if (mode !== "hotspot" || isSaving || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();

    if (resizeType) {
      setIsResizing(resizeType);
    } else {
      setIsDragging(true);
    }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      hX: hotspot.x,
      hY: hotspot.y,
      hW: hotspot.width,
      hH: hotspot.height,
    };
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragStartRef.current || !imgRef.current) return;

    const imgRect = imgRef.current.getBoundingClientRect();
    if (!imgRect.width || !imgRect.height) return;
    const dx = ((e.clientX - dragStartRef.current.x) / imgRect.width) * 100;
    const dy = ((e.clientY - dragStartRef.current.y) / imgRect.height) * 100;

    const start = dragStartRef.current;

    if (isDragging) {
      let newX = start.hX + dx;
      let newY = start.hY + dy;

      // Constrain to bounds
      newX = Math.max(0, Math.min(newX, 100 - start.hW));
      newY = Math.max(0, Math.min(newY, 100 - start.hH));

      setHotspot(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      let newX = start.hX;
      let newY = start.hY;
      let newW = start.hW;
      let newH = start.hH;

      if (isResizing.includes("e")) newW = Math.max(5, Math.min(start.hW + dx, 100 - start.hX));
      if (isResizing.includes("s")) newH = Math.max(5, Math.min(start.hH + dy, 100 - start.hY));
      if (isResizing.includes("w")) {
        newX = Math.max(0, Math.min(start.hX + dx, start.hX + start.hW - 5));
        newW = start.hX + start.hW - newX;
      }
      if (isResizing.includes("n")) {
        newY = Math.max(0, Math.min(start.hY + dy, start.hY + start.hH - 5));
        newH = start.hY + start.hH - newY;
      }
      setHotspot({ x: newX, y: newY, width: newW, height: newH });
    }
  }, [isDragging, isResizing, hotspot]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, isResizing, handlePointerMove, handlePointerUp]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    setFailed(false);
  };

  const handleSave = () => {
    if (!loaded || failed || isSaving) return;
    const selectedCrop = previewRatio
      ? imageFrame(imgRef.current!.naturalWidth, imgRef.current!.naturalHeight, crop, showHotspot ? hotspot : undefined, previewRatio)
      : crop;
    const finalCrop = selectedCrop?.width && selectedCrop?.height
      ? { x: selectedCrop.x, y: selectedCrop.y, width: selectedCrop.width, height: selectedCrop.height }
      : undefined;

    const finalHotspot = showHotspot ? hotspot : undefined;

    onSave(finalCrop, finalHotspot);
  };

  const handleReset = () => {
    setCrop(undefined);
    setPreviewRatio(undefined);
    setShowHotspot(false);
    setMode("crop");
    setHotspot({ x: 40, y: 40, width: 20, height: 20 });
  };

  const hasCrop = loaded;
  return (
    <div className="focal-editor">
      {/* Toolbar */}
      <div className="focal-toolbar">
        <div className="flex items-center gap-2">
          <button
            aria-pressed={mode === "crop"}
            disabled={isSaving}
            onClick={() => setMode("crop")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "crop"
                ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]"
                : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"
            }`}
          >
            <CropIcon className="w-4 h-4" />
            Crop
          </button>
          <button
            aria-pressed={mode === "hotspot"}
            disabled={isSaving}
            onClick={() => {
              setMode("hotspot");
              if (!showHotspot) setShowHotspot(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "hotspot"
                ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]"
                : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"
            }`}
          >
            <MousePointerClick className="w-4 h-4" />
            Hotspot
          </button>

          <div className="w-px h-6 bg-[var(--kyro-border)] mx-2"></div>

          <button
            disabled={isSaving}
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={isSaving}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            data-save="true"
            onClick={handleSave}
            disabled={isSaving || !loaded || failed}
            className="flex items-center justify-center min-w-[120px] px-3 py-2 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] text-sm font-medium rounded-lg  hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "Save Edits"
            )}
          </button>
        </div>
      </div>

      {failed && <p role="alert">The image could not load. Close the editor and try again.</p>}
      {/* Editor + Preview Area */}
      <div className="focal-workspace">
        {/* Editor (left) */}
        <div className="focal-canvas">
          <div className="relative max-w-full max-h-full flex items-center justify-center" ref={containerRef}>
            <ReactCrop
              crop={crop}
              onChange={(c, pc) => setCrop(pc)} // Save percentage crop
              disabled={mode === "hotspot" || isSaving}
              className={mode === "hotspot" ? "opacity-70 transition-opacity" : "transition-opacity"}
            >
              <img
                ref={imgRef}
                src={url}
                alt="Focal Editor"
                style={{ display: "block", maxWidth: "100%", maxHeight: "65vh", width: "auto", height: "auto" }}
                draggable={false}
                onError={() => { setFailed(true); setLoaded(false); }}
                onLoad={onImageLoad}
              />
            </ReactCrop>

            {/* Hotspot Overlay */}
            {showHotspot && loaded && imgRef.current && (
              <div
                className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
              >
                {/* Overlay that matches the image dimensions exactly */}
                <div
                  className="relative"
                  style={{
                    width: "100%",
                    height: "100%"
                  }}
                >
                  <div
                    className={`absolute border-2  transition-colors duration-200 ${
                      mode === "hotspot"
                        ? "border-blue-500 bg-blue-500/20 cursor-move pointer-events-auto "
                        : "border-blue-500/50 bg-blue-500/10 pointer-events-none"
                    }`}
                    style={{
                      left: `${hotspot.x}%`,
                      top: `${hotspot.y}%`,
                      width: `${hotspot.width}%`,
                      height: `${hotspot.height}%`,
                      borderRadius: "50%",
                      touchAction: "none",
                    }}
                    onPointerDown={(e) => handlePointerDown(e)}
                  >
                    {/* Center dot */}
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 -ml-1 -mt-1 bg-blue-500 rounded-full"></div>

                    {/* Resize handles */}
                    {mode === "hotspot" && (
                      <>
                        <div
                          className="absolute top-0 left-1/2 w-4 h-4 -ml-2 -mt-2 bg-blue-500 rounded-full cursor-ns-resize"
                          onPointerDown={(e) => handlePointerDown(e, "n")}
                        />
                        <div
                          className="absolute bottom-0 left-1/2 w-4 h-4 -ml-2 -mb-2 bg-blue-500 rounded-full cursor-ns-resize"
                          onPointerDown={(e) => handlePointerDown(e, "s")}
                        />
                        <div
                          className="absolute top-1/2 left-0 w-4 h-4 -ml-2 -mt-2 bg-blue-500 rounded-full cursor-ew-resize"
                          onPointerDown={(e) => handlePointerDown(e, "w")}
                        />
                        <div
                          className="absolute top-1/2 right-0 w-4 h-4 -mr-2 -mt-2 bg-blue-500 rounded-full cursor-ew-resize"
                          onPointerDown={(e) => handlePointerDown(e, "e")}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview (right) */}
        {hasCrop && (
          <div className="focal-previews">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--kyro-border)]">
              <Eye className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
              <span className="text-xs font-normal text-[var(--kyro-text-secondary)] tracking-normal">
                Choose framing
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" style={{ overflowY: "auto" }}>
              <div style={{ display: "grid", gap: 12, width: "100%" }}>
                {[{ label: "Wide", aspect: 16 / 9 }, { label: "Square", aspect: 1 }, { label: "Portrait", aspect: 3 / 4 }].map(({ label, aspect }) => {
                  const frame = imageFrame(imgRef.current?.naturalWidth || 1, imgRef.current?.naturalHeight || 1, crop, showHotspot ? hotspot : undefined, aspect);
                  return <button key={label} type="button" aria-pressed={previewRatio === aspect}
                    aria-label={`Use ${label.toLowerCase()} crop`} disabled={isSaving}
                    onClick={() => setPreviewRatio(current => current === aspect ? undefined : aspect)}
                    style={{ padding: 6, textAlign: "left", color: "var(--kyro-text-primary)", background: "transparent",
                      borderRadius: 6, border: `1px solid ${previewRatio === aspect ? "var(--kyro-primary)" : "var(--kyro-border)"}` }}>
                    <svg role="img" aria-label={label + " image preview"}
                      viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
                      style={{ width: "100%", maxHeight: 150, aspectRatio: String(aspect), overflow: "hidden" }} preserveAspectRatio="none">
                      <image href={url} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
                    </svg>
                    <span style={{ fontSize: 12 }}>{label}{previewRatio === aspect ? " · Selected" : ""}</span>
                  </button>;
                })}
              </div>
            </div>
            <p className="focal-preview-hint">Select a preview to apply its framing. Select again to use your free crop.</p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="focal-help">
        {mode === "crop"
          ? "Drag over the image to crop. Your original stays preserved."
          : "Move and resize the circle around your subject. Previews show how each shape frames it."}
      </div>
    </div>
  );
}
