import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../lib/api";
import { useAutoFormStore } from "../../lib/autoform-store";
import { Modal } from "../ui/Modal";

export function CompositionActions({
  collection,
  open,
  onClose,
}: {
  collection: string;
  open: boolean;
  onClose: () => void;
}) {
  const { formData, hasUnsavedChanges, autoSaveStatus, loadDocument } = useAutoFormStore();
  const [preview, setPreview] = useState<any>(null);
  const [recoveries, setRecoveries] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/${encodeURIComponent(collection)}/${encodeURIComponent(String(formData.id))}`;
  const synced = !hasUnsavedChanges && autoSaveStatus !== "saving";
  async function review() {
    setBusy(true);
    setError("");
    try {
      const result = await apiGet(`${endpoint}/composition`);
      setRecoveries((result.recoveries || []).slice(0, 1));
      setPreview(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (open) void review();
    else setPreview(null);
  }, [open]);
  async function act(action: "convert" | "recover", versionId?: string) {
    if (!synced) {
      setError("Wait for your changes to sync before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiPost(`${endpoint}/composition`, { action, revision: preview.revision, versionId });
      const response = await apiGet(`${endpoint}?draft=true`);
      loadDocument(response.doc || response.data, response.doc || response.data);
      setPreview(null);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Modal open={open} onClose={() => !busy && onClose()} title="Document composition" size="sm" compact>
        {!preview && (
          <p role={error ? "alert" : "status"} className="text-sm text-[var(--kyro-text-secondary)]">
            {error || "Loading composition…"}
          </p>
        )}
        {preview && (
          <div className="space-y-4 text-sm font-normal">
            <p>
              {preview.layouts} layout blocks and {preview.settings} design settings will be removed. Content order,
              media and references are retained.
            </p>
            <p className="text-xs text-[var(--kyro-text-secondary)]">
              {Object.entries(preview.blockTypes || {})
                .map(([name, count]) => `${name} × ${count}`)
                .join(" · ")}
            </p>
            <p className="text-[var(--kyro-text-secondary)]">
              Your latest pre-conversion snapshot is saved first, replacing the previous recovery snapshot. Conversion
              creates an unpublished draft; your live document stays unchanged.
            </p>
            {!preview.recoverable && (
              <p role="alert">This database adapter does not support protected recovery. Conversion is unavailable.</p>
            )}
            {error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            <button
              type="button"
              className="kyro-btn kyro-btn-sm kyro-btn-primary"
              disabled={busy || !synced || !preview.recoverable || (!preview.layouts && !preview.settings)}
              onClick={() => act("convert")}
            >
              {busy ? "Working…" : "Convert to content only"}
            </button>
            {recoveries.length > 0 && (
              <div className="space-y-2 border-t border-[var(--kyro-border)] pt-3">
                <p className="text-xs text-[var(--kyro-text-secondary)]">Recovery snapshot · restore into a draft</p>
                {recoveries.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={busy || !synced}
                    className="kyro-btn kyro-btn-sm kyro-btn-secondary w-full justify-between"
                    onClick={() => act("recover", v.id)}
                  >
                    <span>Restore layouts</span>
                    <time>{new Date(v.createdAt || v.created_at).toLocaleString()}</time>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
