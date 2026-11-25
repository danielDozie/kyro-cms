export interface ImageRegion { x: number; y: number; width: number; height: number }

export interface MediaPlacementMetadata {
  crop?: ImageRegion | null;
  hotspot?: ImageRegion | null;
  alt?: string | null;
  caption?: string | null;
  [key: string]: any;
}

export interface MediaPlacement {
  id: string;
  relationTo?: string;
  metadata?: MediaPlacementMetadata;
}

export function imageFrame(width: number, height: number, crop?: ImageRegion | null, hotspot?: ImageRegion | null, aspect?: number): ImageRegion {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const valid = (rect?: ImageRegion | null) => rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
  const source = valid(crop) ? crop! : { x: 0, y: 0, width: 100, height: 100 };
  const x = clamp(source.x, 0, 99.99), y = clamp(source.y, 0, 99.99);
  const frame = { x, y, width: clamp(source.width, .01, 100 - x), height: clamp(source.height, .01, 100 - y) };
  if (!(width > 0 && height > 0 && aspect && aspect > 0)) return frame;
  const pixelRatio = aspect * height / width;
  const fw = Math.min(frame.width, frame.height * pixelRatio);
  const fh = fw / pixelRatio;
  const focus = valid(hotspot) ? hotspot! : frame;
  return {
    x: clamp(focus.x + focus.width / 2 - fw / 2, frame.x, frame.x + frame.width - fw),
    y: clamp(focus.y + focus.height / 2 - fh / 2, frame.y, frame.y + frame.height - fh),
    width: fw, height: fh,
  };
}
