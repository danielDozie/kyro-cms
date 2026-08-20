import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api";
import { useResourceManager } from "../lib/useResourceManager";

import {
  Webhook,
  Plus,
  Trash2,
  Play,
  Pause,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Info,
  ExternalLink,
  Zap,
  Shield,
  Activity,
  XCircle,
} from "./ui/icons";
import { useUIStore, toast } from "../lib/stores";
import { Modal, ModalContent, ModalActions } from "./ui/Modal";
import { Badge } from "./ui/Badge";
import { SkeletonGrid } from "./ui/Shimmer";
import { PageHeader } from "./ui/PageHeader";
import { useTranslation } from "react-i18next";

interface WebhookConfigField {
  name: string;
  label: string;
  required: boolean;
  placeholder: string;
}

interface WebhookActionDef {
  label: string;
  description: string;
  configFields: WebhookConfigField[];
  envVars: string[];
}

interface WebhookActionsResponse {
  actions: Record<string, WebhookActionDef>;
}

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  status: "active" | "paused";
  action?: string;
  config?: Record<string, string>;
  lastTriggered?: string;
  lastError?: string;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: "pending" | "success" | "failed" | "retrying";
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  duration?: number;
  createdAt: string;
}

const ACTION_ICONS: Record<string, string> = {
  generic: "🔗",
  "github-push": "⚙️",
};

export function WebhookManager() {
    const { t } = useTranslation();
  const {
    items: webhooks,
    loading,
    create,
    remove,
    update,
    isCreateModalOpen: showCreateModal,
    setIsCreateModalOpen: setShowCreateModal,
  } = useResourceManager<WebhookItem>({
    endpoint: "/api/webhooks",
  });

  const { confirm } = useUIStore();
  const [showTestModal, setShowTestModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [actions, setActions] = useState<Record<string, WebhookActionDef>>({});
  const [loadingActions, setLoadingActions] = useState(true);
  const [step, setStep] = useState<"action" | "config">("action");
  const [selectedAction, setSelectedAction] = useState<string>("generic");
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: [] as string[],
    secret: "",
    action: "generic" as string,
    config: {} as Record<string, string>,
  });
  const [createError, setCreateError] = useState("");

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<WebhookDelivery[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      const data = await apiGet<WebhookActionsResponse>("/api/webhooks/actions");
      setActions(data.actions);
    } catch (e) {
      console.error("Failed to load webhook actions:", e);
    } finally {
      setLoadingActions(false);
    }
  };

  const resetCreateModal = () => {
    setStep("action");
    setSelectedAction("generic");
    setFormData({
      name: "",
      url: "",
      events: ["collection.create", "collection.update", "collection.delete"],
      secret: "",
      action: "generic",
      config: {},
    });
    setCreateError("");
  };

  const handleActionSelect = (actionKey: string) => {
    setSelectedAction(actionKey);
    setFormData((prev) => ({
      ...prev,
      action: actionKey,
      config: {},
    }));
    setStep("config");
  };

  const handleConfigChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      config: { ...prev.config, [fieldName]: value },
    }));
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setCreateError("Name is required");
      return;
    }

    if (selectedAction === "generic" && !formData.url.trim()) {
      setCreateError("URL is required for custom webhooks");
      return;
    }

    const actionDef = actions[selectedAction];
    if (actionDef) {
      for (const field of actionDef.configFields) {
        if (field.required && !formData.config[field.name]?.trim()) {
          setCreateError(`${field.label} is required`);
          return;
        }
      }
    }

    try {
      await create(formData);
      resetCreateModal();
      toast.success(`Webhook created: ${formData.name}`);
    } catch (e: any) {
      const errorMsg = e.message || "Failed to create webhook";
      setCreateError(errorMsg);
      toast.error(errorMsg);
    }
  };


  const handleTest = async (id: string) => {
    setTestId(id);
    setTestResult(null);
    setShowTestModal(true);
    try {
      const data = await apiPost<any>(`/api/webhooks/${id}/test`);
      setTestResult({
        success: true,
        message: data.message || "Webhook triggered successfully",
      });
      toast.success("Test delivered successfully");
    } catch (e) {
      setTestResult({ success: false, message: "Failed to trigger webhook" });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "paused" : "active";
      await update(id, {
        status: newStatus,
      });
      toast.success(newStatus === "active" ? "Webhook activated" : "Webhook paused");
    } catch (e) {
      console.error(e);
      toast.error("Failed to toggle webhook status");
    }
  };

  const handleViewHistory = async (id: string) => {
    setSelectedWebhookId(id);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const data = await apiGet<{ docs: WebhookDelivery[] }>(`/api/webhooks/${id}/history`);
      setDeliveryHistory(data.docs || []);
    } catch (e) {
      console.error("Failed to load history:", e);
      toast.error("Failed to load delivery history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const eventOptions = [
    {
      label: "Create",
      value: "create",
      description: "When a new document is created",
    },
    {
      label: "Update",
      value: "update",
      description: "When a document is updated",
    },
    {
      label: "Delete",
      value: "delete",
      description: "When a document is deleted",
    },
    { label: "Auth", value: "auth", description: "User login/logout events" },
  ];

  const getActionLabel = (action?: string) => {
    const actionDef = actions[action || "generic"];
    return actionDef?.label || "Custom URL";
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      <PageHeader
        title={t("tooltips.webhooks", { defaultValue: "Webhooks" })}
        description="Get notified when your content changes."
        actions={[
          {
            label: "New webhook",
            onClick: () => {
              resetCreateModal();
              setShowCreateModal(true);
            },
          },
          {
            label: "Guide",
            onClick: () => setShowHelpModal(true),
            variant: "outline"
          }
        ]}
      />

      {/* Info Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface)] p-6">
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-[var(--kyro-text-secondary)] opacity-70 max-w-2xl leading-relaxed">
              Receive instant HTTP notifications when events happen in your CMS.
              Choose a platform preset or point to any custom endpoint.
            </p>
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[var(--kyro-primary)] rounded-full" />
            <h2 className="text-sm font-medium text-[var(--kyro-text-secondary)]">Endpoints</h2>
          </div>
          <div className="text-xs text-[var(--kyro-text-secondary)] opacity-50">
            {webhooks.length} hook{webhooks.length !== 1 && "s"}
          </div>
        </div>

        {loading ? (
          <SkeletonGrid count={2} />
        ) : webhooks.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface)]/50">
            <div className="w-16 h-16 mx-auto mb-5 bg-[var(--kyro-primary)]/10 rounded-2xl flex items-center justify-center">
              <Webhook className="w-8 h-8 text-[var(--kyro-primary)]" />
            </div>
            <h3 className="text-lg font-bold mb-2">No webhooks yet</h3>
            <p className="text-sm text-[var(--kyro-text-secondary)] opacity-60 mb-6 max-w-sm mx-auto">
              Create a webhook to get notified when your content changes.
            </p>
            <button
              type="button"
              onClick={() => {
                resetCreateModal();
                setShowCreateModal(true);
              }}
              className="kyro-btn kyro-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create webhook
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="group relative overflow-hidden bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-2xl p-5 hover:border-[var(--kyro-primary)]/30 transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-[var(--kyro-surface-accent)] rounded-lg">
                        <Webhook className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{webhook.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${webhook.status === "active" ? "bg-green-500" : "bg-amber-500"}`} />
                          <span className={`text-[10px] font-medium ${webhook.status === "active" ? "text-green-500" : "text-amber-500"}`}>
                            {webhook.status}
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1.5 opacity-50">
                            {getActionLabel(webhook.action)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-1">
                        <span className="text-[10px] text-[var(--kyro-text-secondary)] opacity-50">Destination</span>
                        <div className="font-mono text-xs text-[var(--kyro-text-secondary)] opacity-60 truncate max-w-[200px]" title={webhook.url}>
                          {webhook.url || `${getActionLabel(webhook.action)} webhook`}
                        </div>
                      </div>
                      <div className="space-y-1 sm:border-l border-t sm:border-t-0 border-[var(--kyro-border)] pt-3 sm:pt-0 sm:pl-4">
                        <span className="text-[10px] text-[var(--kyro-text-secondary)] opacity-50">Events</span>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.slice(0, 3).map((event) => (
                            <Badge key={event} variant="outline" className="text-[9px] px-1.5 opacity-50">
                              {event}
                            </Badge>
                          ))}
                          {webhook.events.length > 3 && (
                            <span className="text-[9px] text-[var(--kyro-text-secondary)] opacity-30">+{webhook.events.length - 3}</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 sm:border-l border-t sm:border-t-0 border-[var(--kyro-border)] pt-3 sm:pt-0 sm:pl-4">
                        <span className="text-[10px] text-[var(--kyro-text-secondary)] opacity-50">Activity</span>
                        <div className="text-[10px] text-[var(--kyro-text-secondary)] opacity-60 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {webhook.lastTriggered
                            ? `Last triggered ${new Date(webhook.lastTriggered).toLocaleDateString()}`
                            : "Never triggered"}
                        </div>
                        {webhook.lastError && (
                          <div className="text-[10px] text-red-500/80 flex items-center gap-1.5 mt-1">
                            <XCircle className="w-3 h-3" />
                            <span className="truncate max-w-[150px]" title={webhook.lastError}>
                              {webhook.lastError}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      type="button"
                      onClick={() => handleViewHistory(webhook.id)}
                      className="p-2 rounded-lg border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] transition-colors flex items-center gap-1.5"
                      title={t("tooltips.viewDeliveryHistory", { defaultValue: "View delivery history" })}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium hidden sm:inline">History</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTest(webhook.id)}
                      className="p-2 rounded-lg border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] transition-colors flex items-center gap-1.5"
                      title={t("tooltips.sendTestRequest", { defaultValue: "Send test request" })}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">Test</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleStatus(webhook.id, webhook.status)}
                      className={`p-2 rounded-lg border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] transition-colors ${webhook.status === "active" ? "text-amber-500/60 hover:text-amber-500" : "text-green-500/60 hover:text-green-500"}`}
                      title={webhook.status === "active" ? "Pause" : "Activate"}
                    >
                      {webhook.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(webhook.id, "Webhook")}
                      className="p-2 rounded-lg border border-[var(--kyro-border)] hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
                      title={t("tooltips.delete", { defaultValue: "Delete" })}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500/50 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Modal - Step 1: Select Action */}
      <Modal
        open={showCreateModal && step === "action"}
        onClose={() => setShowCreateModal(false)}
        title={t("tooltips.newWebhook", { defaultValue: "New webhook" })}
      >
        <ModalContent>
          <div className="space-y-4">
            {loadingActions ? (
              <div className="flex items-center justify-center p-12 opacity-50">
                <RefreshCw className="w-5 h-5 animate-spin text-[var(--kyro-primary)]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(actions).map(([key, action]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => handleActionSelect(key)}
                    className="flex flex-col items-start p-4 rounded-md border border-[var(--kyro-border)] bg-[var(--kyro-surface)] hover:border-[var(--kyro-primary)]/40 transition-all text-left group"
                  >
                    <div className="text-lg mb-2">{ACTION_ICONS[key] || "🔗"}</div>
                    <h3 className="text-sm font-medium mb-0.5 group-hover:text-[var(--kyro-primary)] transition-colors">
                      {action.label}
                    </h3>
                    <p className="text-[11px] text-[var(--kyro-text-secondary)] opacity-50 leading-relaxed">
                      {action.description}
                    </p>
                    {action.envVars.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {action.envVars.map((envVar) => (
                          <span key={envVar} className="text-[9px] font-mono bg-[var(--kyro-surface-accent)] px-1.5 py-0.5 rounded opacity-40">
                            {envVar}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ModalContent>
      </Modal>

      {/* Create Modal - Step 2: Configure */}
      <Modal
        open={showCreateModal && step === "config"}
        onClose={() => setShowCreateModal(false)}
        title={actions[selectedAction]?.label || "Webhook"}
      >
        <ModalContent>
          <div className="space-y-5">
            <div className="flex flex-col gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-[var(--kyro-text-secondary)]">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Deploy on content update"
                    className="w-full px-3 py-2.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
                  />
                </div>

                {selectedAction === "generic" && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-[var(--kyro-text-secondary)]">URL</label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://your-server.com/webhook"
                      className="w-full px-3 py-2.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
                    />
                  </div>
                )}

                {selectedAction !== "generic" && actions[selectedAction]?.configFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-medium mb-1.5 text-[var(--kyro-text-secondary)]">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.config[field.name] || ""}
                      onChange={(e) => handleConfigChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
                    />
                  </div>
                ))}

                {selectedAction === "generic" && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-[var(--kyro-text-secondary)]">Signing secret</label>
                    <input
                      type="text"
                      value={formData.secret}
                      onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                      placeholder={t("fields.optional", { defaultValue: "Optional" })}
                      className="w-full px-3 py-2.5 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-lg text-sm text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
                    />
                  </div>
                )}
              </div>

              {selectedAction !== "generic" && actions[selectedAction]?.envVars.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-medium text-amber-600">Environment variables required</span>
                  </div>
                  <p className="text-[11px] text-amber-600/60 mb-2">
                    Add these to your <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded text-[10px]">.env</code> file:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {actions[selectedAction].envVars.map((envVar) => (
                      <code key={envVar} className="text-[10px] font-mono bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">
                        {envVar}=...
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-medium text-[var(--kyro-text-secondary)]">Events</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eventOptions.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => {
                        const events = formData.events.includes(opt.value)
                          ? formData.events.filter((e) => e !== opt.value)
                          : [...formData.events, opt.value];
                        setFormData({ ...formData, events });
                      }}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left text-sm ${formData.events.includes(opt.value)
                        ? "bg-[var(--kyro-primary)]/5 border-[var(--kyro-primary)]/30 text-[var(--kyro-primary)]"
                        : "border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/20"
                        }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${formData.events.includes(opt.value) ? "bg-[var(--kyro-primary)] border-[var(--kyro-primary)]" : "border-[var(--kyro-border)]"}`}>
                        {formData.events.includes(opt.value) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{opt.label}</div>
                        <div className="text-[10px] opacity-40">{opt.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {createError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                {createError}
              </div>
            )}
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setStep("action")}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="kyro-btn kyro-btn-primary px-4 py-2 rounded-lg text-sm font-medium"
          >
            Create webhook
          </button>
        </ModalActions>
      </Modal>

      {/* Test Webhook Modal */}
      <Modal
        open={showTestModal}
        onClose={() => setShowTestModal(false)}
        title={t("tooltips.testWebhook", { defaultValue: "Test webhook" })}
      >
        <ModalContent>
          <div className="p-6 rounded-xl bg-[var(--kyro-surface)] border border-[var(--kyro-border)] text-center">
            {testResult ? (
              <div className="space-y-4">
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${testResult.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                  {testResult.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">{testResult.success ? "Delivered" : "Failed"}</h4>
                  <p className="text-xs text-[var(--kyro-text-secondary)] opacity-60">
                    {testResult.message}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <RefreshCw className="w-8 h-8 text-[var(--kyro-primary)] animate-spin mx-auto opacity-40" />
                <div>
                  <h4 className="text-sm font-semibold mb-1">Sending test payload</h4>
                  <p className="text-xs text-[var(--kyro-text-secondary)] opacity-50">Dispatching...</p>
                </div>
              </div>
            )}
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowTestModal(false)}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface)] transition-colors"
          >
            Close
          </button>
        </ModalActions>
      </Modal>

      {/* Help Modal */}
      <Modal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title={t("tooltips.howWebhooksWork", { defaultValue: "How webhooks work" })}
      >
        <ModalContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-md bg-[var(--kyro-surface)] border border-[var(--kyro-border)]">
                <h4 className="text-sm font-medium mb-1.5 flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--kyro-primary)]" />
                  Request format
                </h4>
                <p className="text-xs text-[var(--kyro-text-secondary)] leading-relaxed opacity-70">
                  When an event triggers, Kyro sends a <span className="font-medium">POST</span> request
                  to your endpoint with a JSON payload containing document metadata and operation details.
                </p>
              </div>
              <div className="p-4 rounded-md bg-[var(--kyro-surface)] border border-[var(--kyro-border)]">
                <h4 className="text-sm font-medium mb-1.5 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[var(--kyro-primary)]" />
                  Signature verification
                </h4>
                <p className="text-xs text-[var(--kyro-text-secondary)] leading-relaxed opacity-70">
                  If a secret is set, each request includes an <span className="font-mono text-[10px] bg-[var(--kyro-surface-accent)] px-1 py-0.5 rounded">X-Webhook-Signature</span> header
                  with an HMAC-SHA256 signature. Verify it in production.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[var(--kyro-text-secondary)] opacity-50">Example payload</h4>
              <div className="bg-[var(--kyro-bg)] rounded-md border border-[var(--kyro-border)] p-4 font-mono text-xs overflow-hidden">
                <div className="space-y-0.5 text-[var(--kyro-text-secondary)]">
                  <div>{"{"}</div>
                  <div className="pl-3"><span className="text-[var(--kyro-primary)]">"event"</span>: <span className="text-green-500">"collection.create"</span>,</div>
                  <div className="pl-3"><span className="text-[var(--kyro-primary)]">"collection"</span>: <span className="text-green-500">"posts"</span>,</div>
                  <div className="pl-3"><span className="text-[var(--kyro-primary)]">"timestamp"</span>: <span className="text-green-500">"2026-06-28T12:00:00Z"</span></div>
                  <div>{"}"}</div>
                </div>
              </div>
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowHelpModal(false)}
            className="kyro-btn kyro-btn-primary w-full py-2.5 rounded-lg text-sm font-medium"
          >
            Got it
          </button>
        </ModalActions>
      </Modal>

      {/* History Modal */}
      <Modal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={t("tooltips.deliveryHistory", { defaultValue: "Delivery History" })}
      >
        <ModalContent>
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center p-12 opacity-50">
                <RefreshCw className="w-5 h-5 animate-spin text-[var(--kyro-primary)]" />
              </div>
            ) : deliveryHistory.length === 0 ? (
              <div className="text-center p-8 text-[var(--kyro-text-secondary)] opacity-60 text-sm">
                No delivery history available for this webhook.
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {deliveryHistory.map((delivery) => (
                  <div key={delivery.id} className="p-4 rounded-md border border-[var(--kyro-border)] bg-[var(--kyro-surface)] text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {delivery.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="font-medium">{delivery.event}</span>
                      </div>
                      <span className="text-[10px] text-[var(--kyro-text-secondary)] opacity-50">
                        {new Date(delivery.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-[var(--kyro-text-secondary)] mb-3">
                      <div>
                        <span className="opacity-50">Status: </span>
                        <span className={`font-medium ${delivery.status === "success" ? "text-green-500" : "text-red-500"}`}>
                          {delivery.responseStatus || delivery.status}
                        </span>
                      </div>
                      <div>
                        <span className="opacity-50">Duration: </span>
                        {delivery.duration ? `${delivery.duration}ms` : "-"}
                      </div>
                    </div>

                    {delivery.error && (
                      <div className="text-xs text-red-500 bg-red-500/5 p-2 rounded border border-red-500/10 font-mono break-all mb-2">
                        {delivery.error}
                      </div>
                    )}

                    {delivery.responseBody && (
                      <div className="text-[10px] font-mono bg-[var(--kyro-bg)] p-2 rounded border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] opacity-70 max-h-24 overflow-y-auto break-all">
                        {delivery.responseBody}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface)] transition-colors"
          >
            Close
          </button>
        </ModalActions>
      </Modal>
    </div>
  );
}
