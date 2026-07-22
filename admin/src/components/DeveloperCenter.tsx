import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete, resolveApi } from "../lib/api";
import {
  Terminal,
  Key,
  PlayCircle,
  Copy,
  RefreshCcw,
  Trash2,
  ExternalLink,
  ChevronRight,
  Code2,
  Lock,
  Eye,
  EyeOff,
} from "./ui/icons";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { aura } from "@uiw/codemirror-theme-aura";
import { useUIStore, toast } from "../lib/stores";
import { Modal, ModalContent, ModalActions } from "./ui/Modal";
import { PageHeader } from "./ui/PageHeader";
import { Badge } from "./ui/Badge";
import { useTranslation } from "react-i18next";

// @ts-ignore
const API_BASE = typeof __KYRO_API_PATH__ !== 'undefined' ? __KYRO_API_PATH__ : '/api';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsed?: string;
  createdAt: string;
}

export function DeveloperCenter({ collections }: { collections: Record<string, unknown> }) {
    const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [testEndpoint, setTestEndpoint] = useState("");
  const [playgroundResult, setPlaygroundResult] = useState<unknown>(null);
  const [exploring, setExploring] = useState(false);
  const { confirm, alert } = useUIStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  const loadKeys = async () => {
    try {
      const data = await apiGet("/api/keys");
      setKeys(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleGenerateKey = async () => {
    setNewKeyName("");
    setShowCreateModal(true);
  };

  const confirmGenerateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      await apiPost("/api/keys", { name: newKeyName });
      loadKeys();
      setShowCreateModal(false);
      setNewKeyName("");
      toast.success("API key generated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate API key");
    }
  };

  const handleRevokeKey = (id: string) => {
    confirm({
      title: "Revoke API Key",
      message: "Are you sure you want to revoke this key? Any integrations using it will stop working.",
      variant: "danger",
      onConfirm: async () => {
        try {
          await apiDelete(`/api/keys/${id}`);
          loadKeys();
          toast.success("API key revoked");
        } catch (e) {
          console.error(e);
          toast.error("Failed to revoke API key");
        }
      }
    });
  };

  const handleRunTest = async () => {
    if (!testEndpoint) return;
    setExploring(true);
    try {
      const response = await fetch(resolveApi(`/api/${testEndpoint}`));
      const data = await response.json();
      setPlaygroundResult(data);
    } catch (e) {
      setPlaygroundResult({
        error: "Failed to fetch. Ensure the endpoint exists.",
      });
    } finally {
      setExploring(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      <PageHeader
        title={t("tooltips.developerCenter", { defaultValue: "Developer Center" })}
        description="Provision access keys and explore the headless API ecosystem."
        icon={Code2}
        actions={[
          {
            label: "Generate Key",
            onClick: handleGenerateKey,
            icon: Key,
          },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* API Key List */}
        <section className="xl:col-span-2 space-y-6">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1 h-4 bg-[var(--kyro-primary)] rounded-full" />
            <h2 className="text-sm font-medium tracking-[0.2em] opacity-40 uppercase">Access Credentials</h2>
          </div>

          <div className="space-y-4">
            {keys.length === 0 ? (
              <div className="p-12 text-center rounded-[2rem] border-2 border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/30">
                <Lock className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="text-sm text-[var(--kyro-text-secondary)] opacity-50">No API keys found. Generate one to get started.</p>
              </div>
            ) : (
              keys.map((key) => (
                <div
                  key={key.id}
                  className="group relative overflow-hidden bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-3xl p-6 hover:border-[var(--kyro-primary)]/50 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-[var(--kyro-surface-accent)] rounded-xl group-hover:bg-[var(--kyro-primary)]/10 transition-colors">
                          <Key className="w-5 h-5 text-[var(--kyro-text-secondary)] group-hover:text-[var(--kyro-primary)] transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold group-hover:text-[var(--kyro-primary)] transition-colors truncate">
                          {key.name}
                        </h3>
                      </div>
                      
                      <div className="flex-1 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-2xl px-4 py-3 flex items-center justify-between group/key overflow-hidden">
                        <code className="text-xs font-mono opacity-80 truncate mr-4">
                          {showKey === key.id
                            ? key.key
                            : "••••••••••••••••••••••••••••••••"}
                        </code>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setShowKey(showKey === key.id ? null : key.id)
                            }
                            className="p-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-all text-[var(--kyro-text-secondary)]"
                          >
                            {showKey === key.id ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="p-1.5 hover:bg-[var(--kyro-surface-accent)] rounded-lg transition-all text-[var(--kyro-text-secondary)]"
                            onClick={() => {
                              navigator.clipboard.writeText(key.key);
                              toast.success("API key copied to clipboard");
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 mt-4 text-[10px] font-bold opacity-30 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <span>Issued:</span>
                          <span>{new Date(key.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Status:</span>
                          <span className="text-green-500">Active</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRevokeKey(key.id)}
                      className="p-3.5 bg-red-500/5 text-red-500 rounded-2xl hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/30 self-start md:self-center"
                      title={t("tooltips.revokeKey", { defaultValue: "Revoke Key" })}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Sidebar Info - Modernized */}
        <section className="space-y-6">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--kyro-border)] bg-gradient-to-br from-[var(--kyro-primary)] to-[var(--kyro-primary)]/80 p-8 group shadow-2xl shadow-[var(--kyro-primary)]/20">
            <div className="absolute top-0 right-0 p-8 opacity-[0.1] pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Terminal className="w-48 h-48 rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white text-2xl font-bold tracking-tight mb-3">
                Endpoint Hub
              </h3>
              <p className="text-white/80 text-sm font-medium leading-relaxed mb-8">
                Kyro CMS is built for high-performance content delivery. Use these endpoints to power your headless frontends.
              </p>
              <button
                type="button"
                className="w-full py-4 bg-white text-[var(--kyro-primary)] rounded-[1.2rem] font-bold text-xs uppercase tracking-widest hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                Full API Documentation
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-[var(--kyro-border)] bg-[var(--kyro-surface)]/50 p-8 space-y-6">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Environment Matrix</h4>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Content API</span>
                  <Badge variant="outline" className="text-[8px] font-bold uppercase py-0.5">Production</Badge>
                </div>
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--kyro-primary)]/30 to-transparent rounded-xl blur opacity-0 group-hover:opacity-100 transition-all"></div>
                  <div className="relative bg-[var(--kyro-bg)] p-3.5 rounded-xl border border-[var(--kyro-border)] flex items-center justify-between">
                    <code className="text-[10px] font-mono opacity-60">https://api.kyro.io/v1</code>
                    <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 cursor-pointer transition-opacity" onClick={() => navigator.clipboard.writeText('https://api.kyro.io/v1')} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Draft Explorer</span>
                  <Badge variant="outline" className="text-[8px] font-bold uppercase py-0.5">Staging</Badge>
                </div>
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/30 to-transparent rounded-xl blur opacity-0 group-hover:opacity-100 transition-all"></div>
                  <div className="relative bg-[var(--kyro-bg)] p-3.5 rounded-xl border border-[var(--kyro-border)] flex items-center justify-between">
                    <code className="text-[10px] font-mono opacity-60">https://preview.kyro.io/v1</code>
                    <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 cursor-pointer transition-opacity" onClick={() => navigator.clipboard.writeText('https://preview.kyro.io/v1')} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Playground Explorer - High Fidelity */}
        <section className="xl:col-span-3 rounded-[3rem] border border-[var(--kyro-border)] bg-[var(--kyro-surface)]/50 p-10 space-y-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none">
            <PlayCircle className="w-96 h-96" />
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tighter flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-[var(--kyro-primary)]/10 rounded-2xl flex items-center justify-center">
                  <PlayCircle className="w-7 h-7 text-[var(--kyro-primary)]" />
                </div>
                API <span className="text-[var(--kyro-primary)]">Explorer</span>
              </h2>
              <p className="text-[var(--kyro-text-secondary)] text-sm font-medium opacity-60 leading-relaxed">
                Test your collection endpoints and analyze live response payloads. 
                Enter a collection slug to fetch its latest documents.
              </p>
            </div>
            
            <div className="flex items-center gap-4 flex-1 lg:max-w-2xl bg-[var(--kyro-bg)] p-2 rounded-[2rem] border border-[var(--kyro-border)] shadow-2xl">
              <div className="flex-1 relative flex items-center pl-6">
                <span className="text-[11px] font-bold opacity-30 uppercase tracking-widest mr-2 whitespace-nowrap">
                  GET {API_BASE}/
                </span>
                <input
                  type="text"
                  value={testEndpoint}
                  onChange={(e) => setTestEndpoint(e.target.value)}
                  placeholder="collection-slug"
                  className="w-full py-4 bg-transparent focus:outline-none font-mono text-sm font-bold text-[var(--kyro-primary)]"
                />
              </div>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={exploring || !testEndpoint}
                className="kyro-btn kyro-btn-primary px-8 py-4 rounded-[1.5rem] font-bold text-sm shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-all flex items-center gap-3 shrink-0"
              >
                {exploring ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
                Run Query
              </button>
            </div>
          </div>

          {playgroundResult ? (
            <div className="animate-in fade-in zoom-in-95 duration-500 relative z-10">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-3 bg-[var(--kyro-primary)] rounded-full" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Response Payload</span>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono px-3">200 OK</Badge>
              </div>
              <div className="rounded-[2rem] overflow-hidden border border-[var(--kyro-border)] shadow-2xl bg-[#090b10]">
                <div className="flex items-center gap-2 px-6 py-4 bg-[#11141d] border-b border-[var(--kyro-border)]/50">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                </div>
                <CodeMirror
                  value={JSON.stringify(playgroundResult, null, 2)}
                  height="450px"
                  theme={aura}
                  extensions={[json()]}
                  editable={false}
                  className="text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="h-80 rounded-[3rem] border-2 border-dashed border-[var(--kyro-border)] flex flex-col items-center justify-center bg-[var(--kyro-surface-accent)]/20 transition-all duration-700">
              <div className="w-20 h-20 bg-[var(--kyro-surface)] rounded-3xl flex items-center justify-center shadow-lg border border-[var(--kyro-border)] mb-6 opacity-20">
                <Code2 className="w-10 h-10" />
              </div>
              <p className="font-bold text-sm opacity-30 uppercase tracking-[0.2em]">
                Awaiting request dispatch...
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t("tooltips.generateAccessToken", { defaultValue: "Generate Access Token" })}
        size="lg"
      >
        <ModalContent>
          <div className="space-y-6">
            <p className="text-sm text-[var(--kyro-text-secondary)] opacity-70 leading-relaxed">
              Define a name for this API key to identify its integration context. 
              Keys are encrypted at rest and should be treated with extreme caution.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-40 px-1">Token Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Mobile App SDK, Production Server"
                className="w-full px-6 py-4 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-2xl text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)] shadow-sm transition-all"
                onKeyDown={(e) => e.key === "Enter" && confirmGenerateKey()}
              />
            </div>
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="px-6 py-3 rounded-xl font-bold text-sm border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmGenerateKey}
            className="kyro-btn kyro-btn-primary px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-[var(--kyro-primary)]/20 transition-all"
          >
            Generate Token
          </button>
        </ModalActions>
      </Modal>
    </div>
  );
}
