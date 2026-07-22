import { pluginViews } from "../lib/virtual-kyro-plugins";
import React, { useState, useEffect, Suspense } from "react";
import {
  Blocks,
  Settings,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  Search,
  Plus,
  X,
  AlertTriangle,
} from "./ui/icons";
import { Modal, ModalContent, ModalActions } from "./ui/Modal";
import { PageHeader } from "./ui/PageHeader";
import { Badge } from "./ui/Badge";
import { useTranslation } from "react-i18next";
import { navigate } from "../lib/navigate";


interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  status: "active" | "disabled" | "error" | "update_available";
}

interface ToggleError {
  error: string;
  requiresAction?: boolean;
  activeProvider?: string;
}

export function PluginsManager() {
  const { t } = useTranslation();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const PluginSettingsView = showConfigModal ? pluginViews[showConfigModal] : null;

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/plugins");
      if (res.ok) {
        const data = await res.json();
        setPlugins(data);
      }
    } catch (e) {
      console.error("Failed to fetch plugins:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeCount = plugins.filter((p) => p.enabled).length;
  const updateCount = plugins.filter(
    (p) => p.status === "update_available",
  ).length;

  if (loading) {
    return (
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
        <PageHeader
          title={t("tooltips.plugins", { defaultValue: "Plugins" })}
          description="Extend Kyro CMS with modular features and integrations."
          icon={Blocks}
        />
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--kyro-text-secondary)] opacity-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      <PageHeader
        title={t("tooltips.plugins", { defaultValue: "Plugins" })}
        description="Extend Kyro CMS with modular features and integrations."
        icon={Blocks}
        actions={[
          {
            label: "Marketplace",
            onClick: () => (navigate("/admin/marketplace")),
            icon: Plus,
          },
        ]}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-8 surface-tile p-8">
        {/* Info Banner */}
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-blue-500 mb-1">Developer-First Approach</h4>
            <p className="text-xs text-blue-500/80 leading-relaxed">
              Plugins inject core structural components like schemas, collections, and APIs.
              To ensure version-controlled integrity, plugins are entirely managed via code in your <code className="bg-blue-500/20 px-1.5 py-0.5 rounded-md text-[10px] font-mono">kyro.config.ts</code> file.
              This page serves as a read-only directory of the currently installed ecosystem.
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--kyro-bg-secondary)]/50 border border-[var(--kyro-border)] flex items-center gap-3 group hover:border-[var(--kyro-primary)]/30 transition-all">
            <div className="p-2.5 bg-green-500/10 rounded-xl group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest mb-0.5">Active</div>
              <div className="text-sm font-bold tracking-tight">{activeCount} Plugins Enabled</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--kyro-bg-secondary)]/50 border border-[var(--kyro-border)] flex items-center gap-3 group hover:border-[var(--kyro-primary)]/30 transition-all">
            <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:scale-105 transition-transform">
              <RefreshCw className={`w-4 h-4 text-amber-500 ${updateCount > 0 ? "animate-spin-slow" : ""}`} />
            </div>
            <div>
              <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest mb-0.5">Maintenance</div>
              <div className="text-sm font-bold tracking-tight">{updateCount} Updates Ready</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--kyro-bg-secondary)]/50 border border-[var(--kyro-border)] flex items-center gap-3 group hover:border-[var(--kyro-primary)]/30 transition-all">
            <div className="p-2.5 bg-[var(--kyro-primary)]/10 rounded-xl group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 text-[var(--kyro-primary)]" />
            </div>
            <div>
              <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest mb-0.5">Security</div>
              <div className="text-sm font-bold tracking-tight">Verified Ecosystem</div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--kyro-border)]/50">
          <div className="relative group max-w-sm w-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--kyro-primary)]/10 to-transparent rounded-xl blur opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--kyro-text-secondary)] opacity-40" />
              <input
                type="text"
                placeholder={t("fields.searchPlugins", { defaultValue: "Search plugins..." })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-xl text-xs focus:outline-none focus:border-[var(--kyro-primary)]/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <div className="w-0.5 h-3 bg-[var(--kyro-primary)] rounded-full" />
            <h2 className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase">Installed Extensions</h2>
          </div>
        </div>

        {/* Plugin Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlugins.length > 0 ? (
            filteredPlugins.map((plugin) => (
              <div
                key={plugin.id}
                className={`group relative overflow-hidden bg-[var(--kyro-bg-secondary)]/30 border border-[var(--kyro-border)] rounded-2xl p-5 hover:border-[var(--kyro-primary)]/50 transition-all duration-300 ${!plugin.enabled ? "grayscale opacity-60" : ""}`}
              >
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[var(--kyro-surface)] rounded-xl group-hover:bg-[var(--kyro-primary)]/10 transition-colors shadow-sm">
                        <Blocks className="w-5 h-5 text-[var(--kyro-text-secondary)] group-hover:text-[var(--kyro-primary)] transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-none mb-1.5">{plugin.name}</h3>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1 h-1 rounded-full ${plugin.enabled ? "bg-green-500" : "bg-red-500"}`} />
                          <span className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">
                            {plugin.enabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {plugin.status === "update_available" && (
                      <Badge variant="warning" className="text-[7px] font-bold px-1.5 py-0.5 animate-pulse">Update</Badge>
                    )}
                  </div>

                  <p className="text-xs text-[var(--kyro-text-secondary)] opacity-70 leading-relaxed min-h-[32px] line-clamp-2">
                    {plugin.description || "No description available."}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--kyro-border)]/50">
                    <div className="flex items-center gap-3 text-[9px] font-bold opacity-40 uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        v{plugin.version}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {pluginViews[plugin.id] && (
                        <button
                          type="button"
                          onClick={() => setShowConfigModal(plugin.id)}
                          className="p-2 bg-[var(--kyro-surface)] border border-[var(--kyro-border)] rounded-lg hover:border-[var(--kyro-primary)] transition-all disabled:opacity-30 shadow-sm"
                          disabled={!plugin.enabled}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-12 text-center rounded-3xl border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/30">
              <Blocks className="w-10 h-10 mx-auto mb-3 text-[var(--kyro-text-secondary)] opacity-20" />
              <h3 className="text-lg font-bold mb-1">No results</h3>
              <p className="text-xs text-[var(--kyro-text-secondary)] opacity-50">Try adjusting your search query.</p>
            </div>
          )}
        </div>
      </div>

      {/* Config Modal */}
      <Modal
        open={!!showConfigModal}
        onClose={() => setShowConfigModal(null)}
        title={t("tooltips.pluginConfiguration", { defaultValue: "Plugin Configuration" })}
        size="lg"
      >
        <ModalContent>
          {PluginSettingsView ? (
            <Suspense fallback={
              <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-8 h-8 text-[var(--kyro-primary)] animate-spin opacity-50" />
                <p className="text-sm text-[var(--kyro-text-secondary)]">Loading plugin settings...</p>
              </div>
            }>
              <PluginSettingsView />
            </Suspense>
          ) : (
            <div className="p-12 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-[var(--kyro-surface-accent)] rounded-3xl flex items-center justify-center border border-[var(--kyro-border)] shadow-xl">
                <Settings className="w-10 h-10 text-[var(--kyro-primary)] opacity-40 animate-spin-slow" />
              </div>
              <div>
                <h4 className="text-xl font-bold mb-1">Custom Configuration</h4>
                <p className="text-sm text-[var(--kyro-text-secondary)] opacity-50 italic">Settings for this plugin are managed by its own custom views and components.</p>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowConfigModal(null)}
            className="kyro-btn kyro-btn-primary w-full py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[var(--kyro-primary)]/20"
          >
            Close
          </button>
        </ModalActions>
      </Modal>
    </div>
  );
}
