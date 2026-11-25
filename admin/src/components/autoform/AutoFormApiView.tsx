import React, { useEffect, useState } from "react";
import { useAutoFormStore } from "../../lib/autoform-store";
import { fetchWithAuth } from "../../lib/api";
import { resolveApi } from "../../lib/paths";
import { toast } from "../../lib/stores";
import "./DocumentApi.css";

interface AutoFormApiViewProps {
  collectionSlug?: string;
  globalSlug?: string;
}
export function AutoFormApiView({ collectionSlug, globalSlug }: AutoFormApiViewProps) {
  const { formData } = useAutoFormStore();
  const [source, setSource] = useState<"editor" | "published" | "draft">(
    globalSlug || formData.id ? "published" : "editor",
  );
  const [payload, setPayload] = useState<unknown>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wrap, setWrap] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const id = String(formData.id || "");
  const endpoint = globalSlug
    ? resolveApi(`/globals/${encodeURIComponent(globalSlug)}`)
    : collectionSlug && id
      ? resolveApi(`/${encodeURIComponent(collectionSlug)}/${encodeURIComponent(id)}`)
      : "";
  const requestPath = endpoint ? `${endpoint}?draft=${source === "draft"}` : "";
  useEffect(() => {
    if (!endpoint || source === "editor") {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setStatus(null);
    setPayload(null);
    fetchWithAuth(requestPath, { signal: controller.signal, headers: { "x-kyro-admin": "false" } })
      .then(async (response) => {
        const body = await response.json();
        if (controller.signal.aborted) return;
        setStatus(response.status);
        setPayload(body);
        if (!response.ok)
          setError(typeof body?.error === "string" ? body.error : `Request failed (${response.status})`);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message || "Unable to load response");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [requestPath, source, refresh]);
  const editor = source === "editor" || !endpoint;
  const text = JSON.stringify(editor ? formData : payload, null, 2) || "null";
  const bytes = new TextEncoder().encode(text).length;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Unable to copy. Check clipboard permission.");
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${collectionSlug || globalSlug || "document"}-${id || "new"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="document-api" aria-label="Document API">
      <div className="document-api-request">
        <span className="document-api-method">GET</span>
        <code title={requestPath}>{requestPath || "Save this document to get an endpoint"}</code>
        {endpoint && (
          <button type="button" onClick={() => copy(new URL(requestPath, window.location.origin).href)}>
            Copy URL
          </button>
        )}
      </div>
      <div className="document-api-layout">
        <section className="document-api-payload">
          <header className="document-api-toolbar">
            <div className="document-api-sources" role="group" aria-label="Payload source">
              {(["published", "draft", "editor"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={source === option}
                  disabled={!endpoint && option !== "editor"}
                  onClick={() => setSource(option)}
                >
                  {option === "editor" ? "Editor data" : option === "draft" ? "Draft response" : "Published response"}
                </button>
              ))}
            </div>
            <div className="document-api-tools">
              {!editor && (
                <button type="button" onClick={() => setRefresh((n) => n + 1)} disabled={loading}>
                  {loading ? "Loading…" : "Refresh"}
                </button>
              )}
              <button type="button" aria-pressed={wrap} onClick={() => setWrap(!wrap)}>
                Wrap
              </button>
              <button type="button" onClick={() => copy(text)} disabled={loading || (!editor && payload === null)}>
                Copy JSON
              </button>
              <button type="button" onClick={download} disabled={loading || (!editor && payload === null)}>
                Download
              </button>
            </div>
          </header>
          {error && !editor && (
            <p role="alert" className="document-api-error">
              {error}
            </p>
          )}
          <div
            className="document-api-code"
            tabIndex={0}
            role="region"
            aria-label={editor ? "Editor document JSON" : "API response JSON"}
            aria-busy={!editor && loading}
          >
            {!editor && loading ? (
              <p role="status">Loading response…</p>
            ) : !editor && payload === null ? (
              <p>No response available.</p>
            ) : (
              <pre data-wrap={wrap || undefined}>
                <code>{text}</code>
              </pre>
            )}
          </div>
          <footer className="document-api-footer">
            <span>{editor ? "Local editor data" : `Authenticated request${status ? ` · HTTP ${status}` : ""}`}</span>
            <span>
              {!loading && (editor || payload !== null)
                ? `${text.split("\n").length} lines · ${(bytes / 1024).toFixed(1)} KB`
                : ""}
            </span>
          </footer>
        </section>
        <aside className="document-api-details">
          <h2>Document</h2>
          <dl>
            <div>
              <dt>{globalSlug ? "Global" : "Collection"}</dt>
              <dd>{globalSlug || collectionSlug || "—"}</dd>
            </div>
            <div>
              <dt>Document ID</dt>
              <dd>
                <code title={id}>{id || "Not saved"}</code>
                {id && (
                  <button type="button" onClick={() => copy(id)} aria-label="Copy document ID">
                    Copy
                  </button>
                )}
              </dd>
            </div>
          </dl>
          <p>Editor data includes local edits. Response views load the saved document through the API.</p>
        </aside>
      </div>
    </section>
  );
}
