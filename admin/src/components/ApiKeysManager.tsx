import React, { useState } from "react";
import { apiPost } from "../lib/api";
import { useResourceManager } from "../lib/useResourceManager";
import { useUIStore, toast } from "../lib/stores";
import {
  Key, Plus, Trash2, Clock, CheckCircle2,
  Shield, Zap, AlertTriangle, Info, Terminal,
  Code,
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
  const { items: keys, loading, create, update, remove, isCreateModalOpen, setIsCreateModalOpen } =
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
  const { confirm: kyroConfirm } = useUIStore();

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
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">

      <PageHeader
        title={t("tooltips.apiKeys", { defaultValue: "API Keys" })}
        description="Programmatic tokens for secure infrastructure integration."
        icon={Key}
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="px-4 py-2 bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] rounded-xl font-bold text-xs border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface)] transition-all flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              <span>Integration Guide</span>
            </button>
            <button
              type="button"
              onClick={() => { setNewKeyName(""); setCreateError(""); setIsCreateModalOpen(true); }}
              className="px-6 py-2.5 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl font-bold text-sm shadow-xl shadow-[var(--kyro-primary)]/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Access Key</span>
            </button>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Terminal Card 1 */}
        <div className="group relative overflow-hidden bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-[2rem] p-1 hover:border-[var(--kyro-primary)]/30 transition-all duration-500">
          <div className="p-6 bg-[var(--kyro-surface)] rounded-[1.8rem] h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Terminal className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Shell / CURL</h3>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
            </div>

            <div className="relative group/code">
              <pre className="p-5 bg-[var(--kyro-bg)] rounded-2xl border border-[var(--kyro-border)] font-mono text-[10px] leading-relaxed overflow-x-auto">
                <div className="flex gap-4">
                  <span className="opacity-20 select-none w-4">1</span>
                  <span><span className="text-[var(--kyro-primary)]">curl</span> -X GET \</span>
                </div>
                <div className="flex gap-4">
                  <span className="opacity-20 select-none w-4">2</span>
                  <span>  https://api.yoursite.com/v1/posts \</span>
                </div>
                <div className="flex gap-4">
                  <span className="opacity-20 select-none w-4">3</span>
                  <span>  -H <span className="text-green-500">"Authorization: ApiKey kyro_xxx"</span></span>
                </div>
              </pre>
            </div>
          </div>
        </div>

        {/* Terminal Card 2 */}
        <div className="group relative overflow-hidden bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-[2rem] p-1 hover:border-[var(--kyro-primary)]/30 transition-all duration-500">
          <div className="p-6 bg-[var(--kyro-surface)] rounded-[1.8rem] h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Code className="w-4 h-4 text-indigo-500" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">JavaScript SDK</h3>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
            </div>

            <div className="relative group/code">
              <pre className="p-5 bg-[var(--kyro-bg)] rounded-2xl border border-[var(--kyro-border)] font-mono text-[10px] leading-relaxed overflow-x-auto">
                <div className="flex gap-4">
                  <span className="opacity-20 select-none w-4">1</span>
                  <span><span className="text-indigo-400">const</span> res = <span className="text-indigo-400">await</span> <span className="text-blue-400">fetch</span>(url, {"{"}</span>
                </div>
                <div className="flex gap-4">
                  <span className="opacity-20 select-none w-4">2</span>
                  <span>  headers: {"{"} </span>
                </div>
                <div className="flex gap-4">
                  <span className="opacity-20 select-none w-4">3</span>
                  <span>    <span className="text-green-500">'Authorization'</span>: <span className="text-green-500">'ApiKey xxx'</span></span>
                </div>
                <div className="flex gap-4">
                  <span className="opacity-20 select-none w-4">4</span>
                  <span>  {"}"}</span>
                </div>
                <div className="flex gap-4">
                  <span className="opacity-20 select-none w-4">5</span>
                  <span>{"}"});</span>
                </div>
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="flex surface-tile flex-col gap-8">
        {/* Warning/Best Practices Banner */}
        <div className="relative overflow-hidden p-6 rounded-3xl border border-[var(--kyro-border)] bg-gradient-to-br from-[var(--kyro-surface-accent)] to-transparent group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Shield className="w-32 h-32 rotate-12" />
          </div>

          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-amber-500/10 rounded-2xl">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-[var(--kyro-text-primary)] mb-1">Security Best Practices</h4>
              <p className="text-sm text-[var(--kyro-text-secondary)] opacity-60 mb-4 max-w-2xl">
                API keys grant full access to your resources. Treat them with the same level of security as your passwords.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                {[
                  "Never commit keys to version control",
                  "Rotate keys every 90 days",
                  "Use specific permissions (least privilege)",
                  "Store keys in secure environment variables"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-medium text-[var(--kyro-text-secondary)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Success Banner for New Keys */}
        {newKey && (
          <div className="relative overflow-hidden p-8 rounded-3xl border border-green-500/30 bg-green-500/5 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-green-500/10 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-green-500">API Key Generated</h3>
                  <Badge variant="success" className="text-[10px] font-bold">New</Badge>
                </div>
                <p className="text-sm text-[var(--kyro-text-secondary)] mb-6">
                  This is the <span className="text-green-500 font-bold uppercase tracking-tight">only time</span> the full key will be shown. Please store it securely.
                </p>

                <div className="flex-1 flex items-center gap-3 p-4 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-2xl font-mono text-sm break-all group relative">
                  <span className="opacity-80 select-all">{newKey.key}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setNewKey(null)}
                  className="mt-6 text-xs font-bold uppercase tracking-widest text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
                >
                  Dismiss Message
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[var(--kyro-primary)] rounded-full" />
              <h2 className="text-sm font-medium tracking-[0.2em] opacity-40">Active Credentials</h2>
            </div>
            <div className="text-[10px] font-bold opacity-40">
              {keys.length} KEY{keys.length !== 1 && "S"}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-20 surface-tile rounded-3xl opacity-50 italic">
              Synchronizing with vault...
            </div>
          ) : keys.length === 0 ? (
            <div className="p-16 text-center rounded-[3rem] border-2 border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/30">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-tr from-[var(--kyro-surface)] to-[var(--kyro-surface-accent)] rounded-3xl flex items-center justify-center shadow-xl border border-[var(--kyro-border)]">
                <Key className="w-10 h-10 text-[var(--kyro-primary)]" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Initialize Your Access</h3>
              <p className="text-sm text-[var(--kyro-text-secondary)] opacity-60 mb-8 max-w-sm mx-auto">
                No API credentials found. Generate a key to begin interacting with the Kyro CMS programmatic interface.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="kyro-btn kyro-btn-primary inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold hover:scale-[1.05] transition-all shadow-xl shadow-[var(--kyro-primary)]/10"
              >
                <Plus className="w-5 h-5" />
                Generate API Key
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="group relative overflow-hidden bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-2xl p-3 hover:border-[var(--kyro-primary)]/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-1.5 bg-[var(--kyro-surface-accent)] rounded-lg group-hover:bg-[var(--kyro-primary)]/10 transition-colors shrink-0">
                        <Key className="w-3.5 h-3.5 text-[var(--kyro-text-secondary)] group-hover:text-[var(--kyro-primary)] transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold truncate group-hover:text-[var(--kyro-primary)] transition-colors">{key.name}</h3>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--kyro-text-secondary)]">
                          <span className="font-mono opacity-60">{key.keyPrefix}••••••••••••••••</span>
                          <span className="opacity-30">·</span>
                          <span className="flex items-center gap-1">
                            {key.permissions?.includes("*") ? (
                              "Full Access"
                            ) : (
                              key.permissions?.slice(0, 2).join(", ")
                            )}
                            {key.permissions && key.permissions.length > 2 && <span className="opacity-40">+{key.permissions.length - 2}</span>}
                          </span>
                          <span className="opacity-30">·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : "Never"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(key.id, "API Key")}
                      className="p-2 bg-red-500/5 border border-red-500/10 rounded-lg hover:bg-red-500/10 hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      title={t("tooltips.revokeAccess", { defaultValue: "Revoke Access" })}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500/50 group-hover/delete:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create Modal */}
      <Modal size="lg" open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t("tooltips.createNewApiKey", { defaultValue: "Create New API Key" })}>
        <ModalContent>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[var(--kyro-text-secondary)]">Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => { setNewKeyName(e.target.value); setCreateError(""); }}
                placeholder="e.g., Production App, Staging, Mobile App"
                className="w-full px-4 py-3 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
                onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
              />
              {createError && <p className="mt-1.5 text-xs text-red-500">{createError}</p>}
            </div>



            <div>
              <label className="block text-xs font-bold mb-1.5 text-[var(--kyro-text-secondary)]">Expires (optional)</label>
              <input
                type="datetime-local"
                value={newKeyExpires}
                onChange={(e) => setNewKeyExpires(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
              />
              <p className="mt-1 text-[10px] text-[var(--kyro-text-muted)]">
                Leave empty for no expiration. Time is in UTC.
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-600 font-medium">
                The key will be shown only once after creation — copy it immediately.
              </p>
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(false)}
            className="px-4 py-2 rounded-lg font-medium text-sm border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateKey}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] hover:opacity-90 transition-colors"
          >
            Generate Key
          </button>
        </ModalActions>
      </Modal>

      {/* Help Modal */}
      <Modal size="lg" open={showHelpModal} onClose={() => setShowHelpModal(false)} title={t("tooltips.howApiKeysWork", { defaultValue: "How API Keys Work" })}>
        <ModalContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold mb-2">What is an API key?</h4>
              <p className="text-sm text-[var(--kyro-text-secondary)]">
                An API key is a unique token that authenticates your requests to the API. Think of it as a password that's specifically for programmatic access.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-2">How to use it</h4>
              <p className="text-sm text-[var(--kyro-text-secondary)] mb-3">
                Add your API key to the Authorization header of your HTTP requests:
              </p>
              <div className="bg-[var(--kyro-bg)] rounded-lg p-4 font-mono text-sm space-y-2">
                <div>
                  <span className="text-[var(--kyro-text-secondary)]">Authorization:</span>{" "}
                  <span className="text-[var(--kyro-primary)]">ApiKey </span>
                  <span className="text-green-500">kyro_xxxxxxxxxxxx</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-2">Best practices</h4>
              <ul className="text-sm text-[var(--kyro-text-secondary)] space-y-2 list-disc list-inside">
                <li>Never share your API key publicly</li>
                <li>Store it securely (environment variables, secrets manager)</li>
                <li>Create separate keys for different applications</li>
                <li>Revoke keys that are no longer in use</li>
              </ul>
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowHelpModal(false)}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] hover:opacity-90 transition-colors"
          >
            Got it
          </button>
        </ModalActions>
      </Modal>
    </div>
  );
}