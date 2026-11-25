import { lazy } from "react";
import { MediaLoadBoundary } from "./ui/MediaLoadBoundary";

const MediaGallery = lazy(() => import("./MediaGallery").then((module) => ({ default: module.MediaGallery })));

export function MediaLibraryView() {
  return (
    <MediaLoadBoundary
      loading="Loading media library…"
      failed="The media library couldn’t load."
      recoverLabel="Reload page"
      onRecover={() => window.location.reload()}
    >
      <MediaGallery />
    </MediaLoadBoundary>
  );
}
