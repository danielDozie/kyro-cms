import React, { useState } from "react";
import { useResourceManager } from "../lib/useResourceManager";
import {
  Key, Plus, Trash2, Clock, CheckCircle2,
  Shield, Info, Terminal, Code, AlertTriangle,
} from "./ui/icons";
import { PageHeader } from "./ui/PageHeader";
import { Badge } from "./ui/Badge";
import { Modal, ModalContent, ModalActions } from "./ui/Modal";
import { useTranslation } from "react-i18next";

interface ApiKeyItem {
  id: string;
  name: string;
  key?: string;
  keyPrefix: string;
  permissions?: string[];
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
}

export function ApiKeysManager() {
  const { t } = useTranslation();
  const { items: keys, loading, create, remove, isCreateModalOpen, setIsCreateModalOpen } =
    useResourceManager<ApiKeyItem>(
      React.useMemo(() => ({
        endpoint: "/api/keys",
        transformLoad: (data) => (data as ApiKeyItem[]).map((k) => ({
          ...k,
          keyPrefix: k.keyPrefix || k.key?.substring(0, 8) || "",
        })),
      }), [])
    );

  const [newKey, setNewKey] = useState<ApiKeyItem | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["*"]);
  const [newKeyExpires, setNewKeyExpires] = useState("");
  const [createError, setCreateError] = useState("");

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) { setCreateError("Name is required"); return; }
    try {
      const data: Record<string, unknown> = { name: newKeyName, permissions: newKeyPermissions };
      if (newKeyExpires) data.expiresAt = new Date(newKeyExpires).toISOString();
      const created = await create(data);
      setNewKey(created);
      setNewKeyName("");
      setNewKeyPermissions(["*"]);
      setNewKeyExpires("");
      setCreateError("");
    } catch { setCreateError("Failed to create API key"); }
  };

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Header */}
      <PageHeader
        title={t("tooltips.apiKeys", { defaultValue: "API Keys" })}
        description="Programmatic tokens for secure system integration and REST API access."
        icon={Key}
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="px-4 py-2.5 bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] rounded-xl font-bold text-xs border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface)] hover:text-[var(--kyro-text-primary)] transition-colors flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              <span>Integration Guide</span>
            </button>
            <button
              type="button"
              onClick={() => { setNewKeyName(""); setCreateError(""); setIsCreateModalOpen(true); }}
              className="px-5 py-2.5 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl font-bold text-xs hover:opacity-95 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Access Key</span>
            </button>
          </div>
        }
      />

      {/* Code Snippets */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* cURL Example */}
        <div className="surface-tile p-5 rounded-2xl border border-[var(--kyro-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <Terminal className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-[var(--kyro-text-primary)] tracking-wide">Shell / cURL</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--kyro-text-secondary)] opacity-60">HTTP REST</span>
          </div>

          <pre className="p-4 bg-[var(--kyro-bg)] rounded-lg border border-[var(--kyro-border)] font-mono text-xs leading-relaxed overflow-x-auto text-[var(--kyro-text-primary)]">
            <div className="flex gap-3">
              <span className="opacity-30 select-none">1</span>
              <span><span className="text-blue-500 font-bold">curl</span> -X GET \</span>
            </div>
            <div className="flex gap-3">
              <span className="opacity-30 select-none">2</span>
              <span>  https://api.yoursite.com/v1/posts \</span>
            </div>
            <div className="flex gap-3">
              <span className="opacity-30 select-none">3</span>
              <span>  -H <span className="text-emerald-500 font-medium">"Authorization: ApiKey kyro_xxx"</span></span>
            </div>
          </pre>
        </div>

        {/* JS SDK Example */}
        <div className="surface-tile p-5 rounded-2xl border border-[var(--kyro-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                <Code className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-xs font-bold text-[var(--kyro-text-primary)] tracking-wide">JavaScript / Node</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--kyro-text-secondary)] opacity-60">Fetch API</span>
          </div>

          <pre className="p-4 bg-[var(--kyro-bg)] rounded-lg border border-[var(--kyro-border)] font-mono text-xs leading-relaxed overflow-x-auto text-[var(--kyro-text-primary)]">
            <div className="flex gap-3">
              <span className="opacity-30 select-none">1</span>
              <span><span className="text-indigo-400 font-medium">const</span> res = <span className="text-indigo-400 font-medium">await</span> <span className="text-blue-400">fetch</span>(url, {"{"}</span>
            </div>
            <div className="flex gap-3">
              <span className="opacity-30 select-none">2</span>
              <span>  headers: {"{"} <span className="text-emerald-500 font-medium">'Authorization'</span>: <span className="text-emerald-500 font-medium">'ApiKey xxx'</span> {"}"}</span>
            </div>
            <div className="flex gap-3">
              <span className="opacity-30 select-none">3</span>
              <span>{"}"});</span>
            </div>
          </pre>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-6">
        {/* Security Notice */}
        <div className="surface-tile p-5 rounded-2xl border border-[var(--kyro-border)]">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-amber-500/10 rounded-xl shrink-0">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--kyro-text-primary)]">Security Best Practices</h4>
                <p className="text-xs text-[var(--kyro-text-secondary)] mt-0.5">
                  API keys grant direct access to your CMS data. Treat them securely as secrets.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-[var(--kyro-text-secondary)] font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Never commit keys to version control repositories</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Rotate key credentials every 90 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Use environment variables for production keys</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Revoke unused or compromised keys immediately</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newly Created Key Alert */}
        {newKey && (
          <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-[var(--kyro-text-primary)]">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-emerald-500">API Key Generated Successfully</h3>
                  <Badge variant="success" className="text-[10px] font-bold">New</Badge>
                </div>
                <p className="text-xs text-[var(--kyro-text-secondary)]">
                  Copy this key now. It will <strong className="text-emerald-500">never be displayed again</strong>.
                </p>
                <div className="p-3 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl font-mono text-xs break-all select-all font-semibold">
                  {newKey.key}
                </div>
                <button
                  type="button"
                  onClick={() => setNewKey(null)}
                  className="text-xs font-bold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Keys Section */}
        <div className="surface-tile p-6 rounded-2xl border border-[var(--kyro-border)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--kyro-text-primary)] tracking-wide">Active Credentials</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)]">
                {keys.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-medium text-[var(--kyro-text-secondary)]">
              Loading API keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/30 space-y-3">
              <Key className="w-8 h-8 text-[var(--kyro-text-secondary)] mx-auto opacity-50" />
              <div>
                <h3 className="text-sm font-bold text-[var(--kyro-text-primary)]">No API Keys Generated</h3>
                <p className="text-xs text-[var(--kyro-text-secondary)] mt-1 max-w-sm mx-auto">
                  Create an API key to allow external services to connect to your Kyro CMS instance safely.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] text-xs font-bold rounded-xl hover:opacity-95 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>Create API Key</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--kyro-border)]">
              {keys.map((key) => (
                <div key={key.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-[var(--kyro-surface-accent)] rounded-lg shrink-0">
                      <Key className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--kyro-text-primary)] truncate">{key.name}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--kyro-text-secondary)] mt-0.5">
                        <span className="font-mono opacity-70">{key.keyPrefix}••••••••••••••••</span>
                        <span>·</span>
                        <span>
                          {key.permissions?.includes("*") ? "Full Access" : key.permissions?.slice(0, 2).join(", ")}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : "Never used"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(key.id, "API Key")}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                    title={t("tooltips.revokeAccess", { defaultValue: "Revoke Access" })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Key Modal */}
      <Modal size="lg" open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t("tooltips.createNewApiKey", { defaultValue: "Create New API Key" })}>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-[var(--kyro-text-secondary)]">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => { setNewKeyName(e.target.value); setCreateError(""); }}
                placeholder="e.g., Production Frontend, Mobile App, Webhook Client"
                className="w-full px-3.5 py-2.5 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl text-xs font-medium text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-sidebar-active)]"
                onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
              />
              {createError && <p className="mt-1 text-xs text-red-500">{createError}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-[var(--kyro-text-secondary)]">Expires (Optional)</label>
              <input
                type="datetime-local"
                value={newKeyExpires}
                onChange={(e) => setNewKeyExpires(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl text-xs font-medium text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-sidebar-active)]"
              />
              <p className="mt-1 text-[10px] text-[var(--kyro-text-secondary)]">
                Leave blank for non-expiring credentials.
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-600 font-medium">
                The generated key string will only be displayed once upon creation.
              </p>
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateKey}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] hover:opacity-90 transition-colors"
          >
            Generate Key
          </button>
        </ModalActions>
      </Modal>

      {/* Integration Guide Modal */}
      <Modal size="lg" open={showHelpModal} onClose={() => setShowHelpModal(false)} title={t("tooltips.howApiKeysWork", { defaultValue: "How API Keys Work" })}>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-[var(--kyro-text-primary)] mb-1">Authorization Header Format</h4>
              <p className="text-xs text-[var(--kyro-text-secondary)] mb-2">
                Pass your API key in the standard Authorization header with the <code className="font-mono bg-[var(--kyro-surface-accent)] px-1 py-0.5 rounded text-[11px]">ApiKey</code> prefix:
              </p>
              <div className="bg-[var(--kyro-bg)] rounded-xl p-3 border border-[var(--kyro-border)] font-mono text-xs text-[var(--kyro-text-primary)]">
                Authorization: ApiKey kyro_xxxxxxxxxxxxxxxx
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[var(--kyro-text-primary)] mb-1">Key Security Principles</h4>
              <ul className="text-xs text-[var(--kyro-text-secondary)] space-y-1.5 list-disc list-inside">
                <li>Keep keys private and store them in server environment variables</li>
                <li>Never expose keys in client-side front-end code bases</li>
                <li>Use separate keys for distinct microservices or environments</li>
              </ul>
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowHelpModal(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] hover:opacity-90 transition-colors"
          >
            Got It
          </button>
        </ModalActions>
      </Modal>
    </div>
  );
}