import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  const [mode, setMode] = useState<"crop" | "hotspot">("crop");
  
  const [crop, setCrop] = useState<Crop | undefined>(
    initialCrop ? { unit: "%", ...initialCrop } : undefined
  );
  
  const [hotspot, setHotspot] = useState<RectPercent>(
    initialHotspot || { x: 40, y: 40, width: 20, height: 20 }
  );
  
  const [showHotspot, setShowHotspot] = useState(!!initialHotspot);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging logic for Hotspot
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; hX: number; hY: number; hW: number; hH: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, resizeType?: string) => {
    if (mode !== "hotspot") return;
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
      
      if (isResizing.includes("e")) newW = start.hW + dx;
      if (isResizing.includes("w")) { newX = start.hX + dx; newW = start.hW - dx; }
      if (isResizing.includes("s")) newH = start.hH + dy;
      if (isResizing.includes("n")) { newY = start.hY + dy; newH = start.hH - dy; }
      
      // Minimum size and constrain bounds
      if (newW < 5) { newW = 5; if (isResizing.includes("w")) newX = start.hX + start.hW - 5; }
      if (newH < 5) { newH = 5; if (isResizing.includes("n")) newY = start.hY + start.hH - 5; }
      
      newX = Math.max(0, Math.min(newX, 100 - newW));
      newY = Math.max(0, Math.min(newY, 100 - newH));
      newW = Math.min(newW, 100 - newX);
      newH = Math.min(newH, 100 - newY);
      
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
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, isResizing, handlePointerMove, handlePointerUp]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Optional: init defaults here if needed
  };

  const handleSave = () => {
    const finalCrop = crop?.width && crop?.height 
      ? { x: crop.x, y: crop.y, width: crop.width, height: crop.height }
      : undefined;
      
    const finalHotspot = showHotspot ? hotspot : undefined;
    
    onSave(finalCrop, finalHotspot);
  };

  const handleReset = () => {
    setCrop(undefined);
    setShowHotspot(false);
  };

  // Build preview URL with crop params
  const previewUrl = useMemo(() => {
    if (!crop || !crop.width || !crop.height) return null;
    const params = new URLSearchParams({ url });
    params.set("cx", String(crop.x));
    params.set("cy", String(crop.y));
    params.set("cw", String(crop.width));
    params.set("ch", String(crop.height));
    return `/api/media/resize?${params.toString()}`;
  }, [url, crop]);

  const hasCrop = crop?.width && crop.height;

  return (
    <div className="flex flex-col h-full bg-[var(--kyro-bg)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--kyro-border)] bg-[var(--kyro-surface)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("crop")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === "crop" 
                ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]" 
                : "text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)]"
            }`}
          >
            <CropIcon className="w-4 h-4" />
            Crop
          </button>
          <button
            onClick={() => {
              setMode("hotspot");
              if (!showHotspot) setShowHotspot(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
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
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center min-w-[120px] px-6 py-2 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] text-sm font-bold rounded-lg shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Editor + Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor (left) */}
        <div className="flex-1 w-full flex items-center justify-center p-8 overflow-hidden relative select-none">
          <div className="relative max-w-full max-h-full flex items-center justify-center" ref={containerRef}>
            <ReactCrop
              crop={crop}
              onChange={(c, pc) => setCrop(pc)} // Save percentage crop
              locked={mode === "hotspot"}
              className={mode === "hotspot" ? "opacity-70 transition-opacity" : "transition-opacity"}
            >
              <img
                ref={imgRef}
                src={url}
                alt="Focal Editor"
                className="max-h-[70vh] object-contain pointer-events-none"
                onLoad={onImageLoad}
              />
            </ReactCrop>
            
            {/* Hotspot Overlay */}
            {showHotspot && imgRef.current && (
              <div
                className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
              >
                {/* Overlay that matches the image dimensions exactly */}
                <div 
                  className="relative" 
                  style={{ 
                    width: imgRef.current.width, 
                    height: imgRef.current.height 
                  }}
                >
                  <div
                    className={`absolute border-2 shadow-2xl transition-colors duration-200 ${
                      mode === "hotspot" 
                        ? "border-blue-500 bg-blue-500/20 cursor-move pointer-events-auto shadow-blue-500/50" 
                        : "border-blue-500/50 bg-blue-500/10 pointer-events-none"
                    }`}
                    style={{
                      left: `${hotspot.x}%`,
                      top: `${hotspot.y}%`,
                      width: `${hotspot.width}%`,
                      height: `${hotspot.height}%`,
                      borderRadius: "50%",
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
          <div className="w-[280px] border-l border-[var(--kyro-border)] bg-[var(--kyro-surface)] flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--kyro-border)]">
              <Eye className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
              <span className="text-xs font-bold text-[var(--kyro-text-secondary)] tracking-wide uppercase">
                Preview
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-[var(--kyro-border)]"
                />
              )}
            </div>
            <div className="px-4 py-3 border-t border-[var(--kyro-border)] text-[10px] text-[var(--kyro-text-secondary)] font-mono">
              <div>x: {crop?.x?.toFixed(1)}%  y: {crop?.y?.toFixed(1)}%</div>
              <div>w: {crop?.width?.toFixed(1)}%  h: {crop?.height?.toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Help Text */}
      <div className="p-4 text-center bg-[var(--kyro-surface-accent)] border-t border-[var(--kyro-border)] text-sm text-[var(--kyro-text-secondary)]">
        {mode === "crop" 
          ? "Drag to define the crop area. The preview panel shows the result in real-time."
          : "Drag the circle to define the focal hotspot. This area will always remain visible when the image is resized."}
      </div>
    </div>
  );
}
