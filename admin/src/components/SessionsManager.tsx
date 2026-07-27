import React, { useState, useEffect } from "react";
import { apiGet, apiDelete } from "../lib/api";
import { Shield, Monitor, Trash2, Clock, AlertTriangle, Info, LogOut, Globe, Activity, RefreshCcw, Smartphone, Laptop } from "./ui/icons";
import { PageHeader } from "./ui/PageHeader";
import { toast } from "../lib/stores";
import { Badge } from "./ui/Badge";
import { useTranslation } from "react-i18next";

interface Session {
  id: string;
  sessionName: string;
  currentSession: boolean;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
    browser?: string;
    device?: string;
  };
  createdAt: number;
  lastActivityAt: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SessionsManager() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    apiGet<{ sessions: Session[] }>("/api/auth/sessions")
      .then((r) => {
        setSessions(Array.isArray(r.sessions) ? r.sessions : []);
        setError("");
      })
      .catch(() => setError("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      await apiDelete(`/api/auth/sessions/${id}`);
      setSessions((p) => p.filter((s) => s.id !== id));
      toast.success("Session revoked");
    } catch {
      setError("Failed to revoke session");
      toast.error("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAll = async () => {
    setRevokingAll(true);
    try {
      await apiDelete("/api/auth/sessions");
      setSessions((p) => p.filter((s) => s.currentSession));
      toast.success("All other sessions revoked");
    } catch {
      setError("Failed to revoke sessions");
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
    }
  };

  const otherCount = sessions.filter((s) => !s.currentSession).length;

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      <PageHeader
        title={t("tooltips.activeSessions", { defaultValue: "Active Sessions" })}
        description="Monitor and manage your cryptographic access across all devices."
        icon={Monitor}
        actions={otherCount > 0 ? [
          {
            label: `Revoke ${otherCount} Sessions`,
            onClick: () => { if (confirm(`Revoke all ${otherCount} other sessions?`)) revokeAll(); },
            icon: LogOut,
            variant: "outline",
            className: "text-red-500 hover:text-red-600 hover:bg-red-500/5 border-red-500/20"
          }
        ] : undefined}
      />

      <div className="flex flex-col gap-8 surface-tile p-8 rounded-lg">
        {/* Security & Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-4">
            <div className="p-2.5 bg-amber-500/10 rounded-xl shrink-0">
              <Shield className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-0.5">Security Protocol</h4>
              <p className="text-[11px] text-amber-900/60 leading-relaxed font-medium">
                Active sessions authorize access to your identity. Revoke any unfamiliar devices immediately.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-[var(--kyro-bg-secondary)]/50 border border-[var(--kyro-border)] flex items-center gap-4">
            <div className="p-2.5 bg-[var(--kyro-primary)]/5 rounded-xl">
              <Activity className="w-4 h-4 text-[var(--kyro-primary)]" />
            </div>
            <div>
              <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest mb-0.5">Total Load</div>
              <div className="text-sm font-bold tracking-tight">{sessions.length} Active Nodes</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 flex items-center gap-4 rounded-xl animate-pulse">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-widest">{error}</span>
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--kyro-border)]/50">
            <div className="flex items-center gap-2 px-1">
              <div className="w-0.5 h-3 bg-[var(--kyro-primary)] rounded-full" />
              <h2 className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase">Authenticated Hosts</h2>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center rounded-3xl border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/30">
              <RefreshCcw className="w-8 h-8 mx-auto mb-3 text-[var(--kyro-primary)] animate-spin-slow opacity-40" />
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Analyzing session matrix...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/30">
              <Monitor className="w-10 h-10 mx-auto mb-3 text-[var(--kyro-text-secondary)] opacity-20" />
              <h3 className="text-lg font-bold mb-1">No active sessions</h3>
              <p className="text-xs text-[var(--kyro-text-secondary)] opacity-50">Identity manifest is currently clear.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group relative overflow-hidden bg-[var(--kyro-bg-secondary)]/30 border border-[var(--kyro-border)] rounded-2xl p-5 hover:border-[var(--kyro-primary)]/50 transition-all duration-300 ${s.currentSession ? "ring-1 ring-[var(--kyro-primary)]/20 bg-[var(--kyro-primary)]/[0.02]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`kyro-btn-primary p-2.5 rounded-xl transition-colors shadow-sm ${s.currentSession ? "" : "bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] border border-[var(--kyro-border)]"}`}>
                        {s.deviceInfo?.platform?.toLowerCase().includes("android") || s.deviceInfo?.platform?.toLowerCase().includes("ios")
                          ? <Smartphone className="w-4 h-4" />
                          : <Laptop className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-sm leading-none">
                            {s.sessionName || s.deviceInfo?.device || "Authorized Host"}
                          </h3>
                          {s.currentSession && (
                            <Badge variant="success" className="text-[7px] font-bold uppercase tracking-tighter px-1 py-0 animate-pulse">Live</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[9px] font-bold opacity-30 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" />
                            {s.deviceInfo?.ip || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!s.currentSession && (
                      <button
                        type="button"
                        onClick={() => { if (confirm("Revoke this session?")) revoke(s.id); }}
                        disabled={revokingId === s.id}
                        className="p-2 bg-red-500/5 text-red-500/30 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                      >
                        {revokingId === s.id
                          ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                          : <LogOut className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--kyro-border)]/50 grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold uppercase opacity-30 tracking-tighter">Environment</span>
                      <div className="text-[10px] font-bold truncate opacity-70">
                        {s.deviceInfo?.browser || "System Browser"}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold uppercase opacity-30 tracking-tighter">Last Seen</span>
                      <div className="text-[10px] font-bold opacity-70">{timeAgo(s.lastActivityAt)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}