import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPatch, apiPost, apiDelete } from "../lib/api";
import type {
  KyroConfig,
  CollectionConfig,
  GlobalConfig,
} from "@kyro-cms/core/client";
import { AutoForm } from "./AutoForm";
import { ActionBar, type DocumentStatus, type SaveStatus } from "./ActionBar";
import { Spinner } from "./ui/Spinner";
import { Shimmer } from "./ui/Shimmer";
import { useUIStore, toast } from "../lib/stores";
import { useAutoFormStore } from "../lib/autoform-store";
import { PageHeader } from "./ui/PageHeader";
import { Badge } from "./ui/Badge";
import { SplitButton } from "./ui/SplitButton";
import { Lock, FileText, ChevronLeft, Save } from "lucide-react";
import { navigate } from "../lib/navigate";
import { useTranslation } from "react-i18next";
import "../lib/i18n";
import { adminPath } from "../lib/paths";
import { resolveFieldValue } from "../lib/resolve-field-value";


interface DetailViewProps {
  config: KyroConfig;
  collection?: CollectionConfig;
  global?: GlobalConfig;
  documentId?: string;
  onBack: () => void;
  onSave: () => void;
  onDelete?: () => void;
  onError: (message: string) => void;
  mode?: "collection" | "global";
}

export function DetailView({
  config,
  collection,
  global,
  documentId,
  onBack,
  onSave,
  onDelete,
  onError,
  mode = "collection",
}: DetailViewProps) {
  const { t } = useTranslation();
  const { confirm, alert } = useUIStore();
  const [data, setData] = useState<Record<string, unknown>>({});
  const [originalData, setOriginalData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [status, setStatus] = useState<DocumentStatus>("draft");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const showPreview = useAutoFormStore((state) => state.showPreview);
  const setShowPreview = useAutoFormStore((state) => state.setShowPreview);
  const previewUrl = useAutoFormStore((state) => state.previewUrl);
  const setPreviewUrl = useAutoFormStore((state) => state.setPreviewUrl);

  const fields = global?.fields || collection?.fields || [];
  const label = global?.label || collection?.label || "Document";
  const slug = global?.slug || collection?.slug || "";

  const hasChanges = JSON.stringify(data) !== JSON.stringify(originalData);

  // Auto-set status to draft when there are changes from a published state
  useEffect(() => {
    if (hasChanges && status === "published") {
      setStatus("draft");
    }
  }, [hasChanges, status]);

  useEffect(() => {
    if (hasChanges && saveStatus === "saved") {
      setSaveStatus("idle");
    }
  }, [hasChanges, saveStatus]);

  useEffect(() => {
    if (mode === "global") {
      loadGlobal();
    } else if (documentId) {
      loadDocument();
    }
  }, [documentId, mode, slug]);


  const loadDocument = async () => {
    try {
      setLoading(true);
      const result = (await apiGet(`/api/${slug}/${documentId}`, { autoToast: false }) as {
        data?: Record<string, unknown>;
        status?: string;
        createdAt?: string;
        updatedAt?: string;
        publishedAt?: string;
      });
      const docData = result.data || {};
      setData(docData);
      setOriginalData(docData);
      setStatus(((docData as any)?.status || result.status || "draft") as DocumentStatus);
      setCreatedAt(result.createdAt || (docData.createdAt as string) || null);
      setUpdatedAt(result.updatedAt || (docData.updatedAt as string) || null);
      setPublishedAt(result.publishedAt || (docData.publishedAt as string) || null);
    } catch {
      onError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const loadGlobal = async () => {
    try {
      setLoading(true);
      const result = (await apiGet(`/api/globals/${slug}`, { autoToast: false }) as {
        data?: Record<string, unknown>;
        createdAt?: string;
        updatedAt?: string;
      });
      const globalData = result.data || {};
      setData(globalData);
      setOriginalData(globalData);
      setCreatedAt(result.createdAt || null);
      setUpdatedAt(result.updatedAt || null);
    } catch {
      onError("Failed to load global");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(
    async (isAutosave = false) => {
      try {
        setSaveStatus("saving");
        const endpoint =
          mode === "global"
            ? `/api/globals/${slug}`
            : `/api/${slug}/${documentId}`;

        const isDraft = status === "draft" || (data as any)?.status === "draft";
        const result = (await apiPatch(endpoint, data, { autoToast: false, headers: { "X-Draft": String(isDraft) } }) as { data?: Record<string, unknown> });
        const savedData = (result && (result.data || result)) || data;

        if (!isAutosave) {
          setOriginalData(savedData);
          onSave();
        }

        setData(savedData);
        setStatus((savedData as any)?.status || status);
        setSaveStatus("saved");
        setUpdatedAt(new Date().toISOString());

        // Show green border for 3 seconds after any save
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);

        if (!isAutosave) {
          const isDraft = status === "draft" || (savedData as any)?.status === "draft";
          if (isDraft) toast.warning(t("toast.draftSaved", { defaultValue: "Draft saved" }));
          else toast.success(t("toast.updated", { defaultValue: "Updated" }));
        }

        setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);

        if (showPreview) {
          refreshPreviewUrl(savedData);
        }

      } catch (e: any) {
        setSaveStatus("error");
        if (!isAutosave) {
          onError(t("toast.saveError", { defaultValue: "Failed to save changes" }));
          toast.error(t("toast.saveError", { defaultValue: "Failed to save changes" }));
        }
      } finally {
        setSaving(false);
      }
    },
    [data, mode, slug, documentId, status, onSave, onError],
  );

  const handlePublish = async () => {
    try {
      setSaving(true);
      await apiPatch(`/api/${slug}/${documentId}`, data, {
        autoToast: false,
        headers: { "X-Draft": "false" },
      } as any);
      setStatus("published");
      setPublishedAt(new Date().toISOString());
      toast.success(t("toast.published", { defaultValue: "Published successfully" }));
      onSave();
    } catch {
      onError(t("toast.publishError", { defaultValue: "Failed to publish" }));
      toast.error(t("toast.publishError", { defaultValue: "Failed to publish" }));
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    try {
      setSaving(true);
      await apiPatch(`/api/${slug}/${documentId}`, { status: 'draft' }, {
        autoToast: false,
        headers: { "X-Draft": "false" },
      } as any);
      setStatus("draft");
      toast.warning(t("toast.unpublished", { defaultValue: "Document unpublished" }));
      onSave();
    } catch {
      onError(t("toast.unpublishError", { defaultValue: "Failed to unpublish" }));
      toast.error(t("toast.unpublishError", { defaultValue: "Failed to unpublish" }));
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      setIsDuplicating(true);
      const response = await apiPost(`/api/${slug}/${documentId}/duplicate`, undefined, { autoToast: false }) as { data?: { id?: string } };
      toast.success(t("toast.duplicated", { defaultValue: "Document duplicated" }));
      if (response?.data?.id) {
        navigate(`${adminPath}/${slug}/${response.data.id}`);
      } else {
        navigate(`${adminPath}/${slug}`);
      }
    } catch (e) {
      toast.error((e as Error).message || t("toast.duplicateError", { defaultValue: "Failed to duplicate document" }));
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleCopyData = async () => {
    try {
      const copyPayload = { ...data };
      // Strip system fields
      delete copyPayload.id;
      delete copyPayload.createdAt;
      delete copyPayload.updatedAt;
      delete (copyPayload as any).status;

      await navigator.clipboard.writeText(JSON.stringify(copyPayload));
      toast.success(t("toast.dataCopied", { defaultValue: "Document data copied to clipboard" }));
    } catch (e) {
      toast.error(t("toast.copyError", { defaultValue: "Failed to copy document data" }));
    }
  };

  const handlePasteData = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const pastedData = JSON.parse(text);
      if (typeof pastedData !== 'object' || pastedData === null) {
        throw new Error("Invalid format");
      }

      setData((prev) => ({
        ...prev,
        ...pastedData,
        // Preserve system fields from overwrite
        id: prev.id,
        createdAt: prev.createdAt,
        updatedAt: prev.updatedAt,
        status: prev.status,
      }));
      toast.success(t("toast.dataPasted", { defaultValue: "Document data pasted" }));
    } catch (e) {
      toast.error(t("toast.pasteError", { defaultValue: "Clipboard does not contain valid document JSON" }));
    }
  };

  const handleDeleteTrigger = () => {
    confirm({
      title: t("detailView.deleteTitle", { defaultValue: "Delete {{label}}?", label }),
      message: t("detailView.deleteMessage", { defaultValue: "This action cannot be undone." }),
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsDeleting(true);
          await apiDelete(`/api/${slug}/${documentId}`);
          navigate(`${adminPath}/${slug}`);
        } catch (e) {
          setIsDeleting(false);
        }
      }
    });
  };
  const refreshPreviewUrl = async (docData: any = data) => {
    try {
      const endpoint = mode === "global" ? `/api/globals/${slug}/preview-url` : `/api/${slug}/preview-url`;
      console.log("[Kyro Preview] Calling endpoint:", endpoint, "with data keys:", Object.keys(docData || {}), "documentId:", documentId);
      const res = await apiPost(endpoint, { ...docData, id: documentId }, { autoToast: false });
      console.log("[Kyro Preview] Response:", JSON.stringify(res));
      if (res && (res as any).url) {
        console.log("[Kyro Preview] Setting previewUrl:", (res as any).url);
        setPreviewUrl((res as any).url);
      } else {
        console.warn("[Kyro Preview] No url in response:", res);
      }
    } catch (e: any) {
      console.error("[Kyro Preview] Error:", e.message, e);
      toast.error(e.message || "Failed to generate preview URL");
    }
  };

  useEffect(() => {
    if (showPreview) {
      refreshPreviewUrl(data);
    }
  }, [showPreview]);

  const togglePreview = () => {
    const nextState = !showPreview;
    setShowPreview(nextState);
    if (nextState) {
      refreshPreviewUrl(data);
    }
  };
  if (loading) {
    return (
      <div className="kyro-detail">
        <div className="space-y-6 p-4">
          <div className="space-y-2">
            <Shimmer variant="text" className="w-1/3" />
            <Shimmer variant="text" className="w-2/3" />
          </div>
          <div className="space-y-4">
            <Shimmer variant="rect" count={4} />
          </div>
        </div>
      </div>
    );
  }

  const isSingleLayout =
    mode === "global" || collection?.admin?.layout === "single";

  return (
    <div className="kyro-detail">
      <PageHeader
        back={{ onClick: onBack }}
        breadcrumbs={[
          { label: mode === "global" ? t("detailView.globals", { defaultValue: "Globals" }) : t("detailView.collections", { defaultValue: "Collections" }) },
          {
            label: label,
            href: mode === "collection" ? `${adminPath}/${slug}` : undefined
          },
          { label: mode === "global" ? t("actions.edit", { defaultValue: "Edit" }) : documentId ? t("actions.edit", { defaultValue: "Edit" }) : t("actions.new", { defaultValue: "New" }) }
        ]}
        title={
          (mode === "global" ? label : ((resolveFieldValue(collection?.fields as any, data, collection?.admin?.useAsTitle || "title") as string) || data.name as string || documentId || t("detailView.newDocument", { defaultValue: "New {{label}}", label: collection?.singularLabel || label })))
        }
        metadata={[
          <Badge
            key="status"
            variant={status === "published" ? "success" : "warning"}
            dot
            className="text-[10px] font-bold "
          >
            {t(`status.${status}`, { defaultValue: status })}
          </Badge>
        ]}
      />

      <ActionBar
        status={status}
        saveStatus={saveStatus}
        hasChanges={hasChanges}
        onSave={() => handleSave(false)}
        onPublish={handlePublish}
        onUnpublish={status === "published" ? handleUnpublish : undefined}
        onDuplicate={handleDuplicate}
        onCopyData={handleCopyData}
        onPasteData={handlePasteData}
        onViewHistory={() => {
          window.dispatchEvent(new CustomEvent('kyro:show-version-history'));
        }}
        onPreview={((collection as any)?.admin?.disablePreview || (global as any)?.admin?.disablePreview) ? undefined : togglePreview}
        onDelete={handleDeleteTrigger}
        onBack={onBack}
        onToggleSidebar={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
        publishedAt={publishedAt}
        updatedAt={updatedAt}
      />

      <div
        className={
          showPreview
            ? "w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 pt-4 md:pt-0 h-[calc(100vh-140px)]"
            : isSingleLayout
              ? "w-full pt-4 md:pt-8"
              : "w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 md:gap-8 pt-4 md:pt-0"
        }
      >
        <div className={`space-y-4 md:space-y-8 min-w-0 ${showPreview ? "overflow-y-auto pr-2 pb-20" : ""}`}>
          <div className="surface-tile p-4 md:p-8">
            <div className="flex items-center justify-between mb-8 px-1">
              <h2 className="text-[10px] font-bold  tracking-[0.2em] opacity-40">
                {t("detailView.coreConfiguration", { defaultValue: "Core Configuration" })}
              </h2>
              <div className="h-px flex-1 bg-[var(--kyro-border)] ml-6 opacity-30" />
            </div>
            <AutoForm
              config={
                collection
                  ? { ...collection, fields: fields }
                  : ({ slug: "unknown", fields: fields } as CollectionConfig)
              }
              data={data}
              onChange={setData}
              layout={isSingleLayout ? "single" : "split"}
              globalSlug={mode === "global" ? slug : undefined}
              collectionSlug={mode === "collection" ? slug : undefined}
              onActionSuccess={(message) => toast.success(message)}
              onActionError={(message) => toast.error(message)}
              documentStatus={status}
              justSaved={justSaved}
            />
            {isSingleLayout && (
              <div className="mt-8 pt-8 border-t border-[var(--kyro-border)] flex justify-end gap-3">
                {mode === "collection" && documentId && (
                  <button
                    type="button"
                    onClick={handleDeleteTrigger}
                    disabled={isDeleting || saving}
                    className="kyro-btn kyro-btn-sm text-[var(--kyro-danger)] hover:bg-[var(--kyro-danger)]/10 w-full justify-start mt-2"
                  >
                    {isDeleting ? t("actions.deleting", { defaultValue: "Deleting..." }) : t("actions.deleteDocument", { defaultValue: "Delete Document" })}
                  </button>
                )}
                <SplitButton
                  status={status}
                  saveStatus={saving ? "saving" : "idle"}
                  hasChanges={hasChanges}
                  onPublish={() => handleSave(false)}
                  disabled={saving}
                />
              </div>
            )}
          </div>
        </div>

        {showPreview && (
          <div className="surface-tile flex flex-col overflow-hidden h-full border border-[var(--kyro-border)] rounded-xl animate-in fade-in slide-in-from-right-4 duration-500 shadow-xl bg-white dark:bg-black">
            <div className="bg-[var(--kyro-surface-accent)] border-b border-[var(--kyro-border)] p-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 pl-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
              </div>
              <div className="text-[10px] font-mono opacity-50 truncate max-w-[60%] bg-[var(--kyro-bg)] px-3 py-1 rounded">
                {previewUrl || t("detailView.generatingPreview", { defaultValue: "Generating preview URL..." })}
              </div>
              <div className="w-16"></div>
            </div>
            <div className="flex-1 bg-white relative">
              {!previewUrl ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="w-6 h-6 text-[var(--kyro-primary)]" />
                </div>
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 bg-white"
                  title={t("tooltips.preview", { defaultValue: "Preview" })}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              )}
            </div>
          </div>
        )}

        {!isSingleLayout && !showPreview && (
          <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="surface-tile p-4 md:p-8">
              <h3 className="text-[10px] font-bold  tracking-[0.2em] opacity-40 mb-4 md:mb-6">
                {t("detailView.metadata", { defaultValue: "Metadata" })}
              </h3>
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold  tracking-widest opacity-40">
                    {t("detailView.dynamicStatus", { defaultValue: "Dynamic Status" })}
                  </span>
                  <div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold  tracking-widest ${status === "published" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}
                    >
                      {status || "draft"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold  tracking-widest opacity-40">
                    {t("detailView.dateCreated", { defaultValue: "Date Created" })}
                  </span>
                  <span className="text-sm font-bold text-[var(--kyro-text-secondary)]">
                    {createdAt
                      ? new Date(createdAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                      : t("common.na", { defaultValue: "N/A" })}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold  tracking-widest opacity-40">
                    {t("detailView.lastModified", { defaultValue: "Last Modified" })}
                  </span>
                  <span className="text-sm font-bold text-[var(--kyro-text-secondary)]">
                    {updatedAt
                      ? new Date(updatedAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                      : t("detailView.justNow", { defaultValue: "Just now" })}
                  </span>
                </div>
                {publishedAt && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold  tracking-widest opacity-40">
                      {t("detailView.publicAt", { defaultValue: "Public At" })}
                    </span>
                    <span className="text-sm font-bold text-[var(--kyro-text-secondary)]">
                      {new Date(publishedAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="surface-tile p-4 md:p-8 bg-[var(--kyro-bg-secondary)]">
              <h3 className="text-[10px] font-bold  tracking-[0.2em] opacity-40 mb-3 md:mb-4">
                {t("detailView.quickLinks", { defaultValue: "Quick Links" })}
              </h3>
              <div className="space-y-2 md:space-y-3">
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={isDuplicating || saving}
                  className="kyro-btn kyro-btn-sm kyro-btn-ghost w-full justify-start"
                >
                  {isDuplicating ? t("actions.duplicating", { defaultValue: "Duplicating..." }) : t("actions.duplicateDocument", { defaultValue: "Duplicate Document" })}
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(previewUrl, "_blank")}
                    className="kyro-btn kyro-btn-sm kyro-btn-ghost w-full justify-start"
                  >
                    {t("detailView.openPreview", { defaultValue: "Open Preview in New Tab" })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteTrigger}
                  className="kyro-btn kyro-btn-sm kyro-btn-ghost w-full justify-start text-[var(--kyro-error)] hover:bg-[var(--kyro-danger-bg)]"
                >
                  {t("actions.deleteEntry", { defaultValue: "Delete Entry" })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
