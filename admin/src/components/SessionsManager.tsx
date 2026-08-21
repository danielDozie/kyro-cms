import "../lib/i18n";
import React, { useState, useEffect } from "react";
import { apiGet, apiDelete } from "../lib/api";
import { PageHeader } from "./ui/PageHeader";
import { toast } from "../lib/stores";
import { Badge, StatusDot } from "./ui/Badge";
import { SkeletonGrid } from "./ui/Shimmer";
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
    let active = true;
    apiGet<{ sessions: Session[] }>("/api/auth/sessions")
      .then((r) => {
        if (!active) return;
        setSessions(Array.isArray(r.sessions) ? r.sessions : []);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError("Failed to load active sessions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      await apiDelete(`/api/auth/sessions/${id}`);
      setSessions((p) => p.filter((s) => s.id !== id));
      toast.success("Session revoked successfully");
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
  const currentSession = sessions.find((s) => s.currentSession);

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      <PageHeader
        title={t("tooltips.activeSessions", { defaultValue: "Active Sessions" })}
        description="Monitor authorized browser instances, connected devices, and active cryptographic tokens."
        actions={
          otherCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Revoke all ${otherCount} other active sessions? You will stay logged in on this device.`)) {
                  revokeAll();
                }
              }}
              disabled={revokingAll}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              <span>{revokingAll ? "Revoking..." : `Revoke ${otherCount} Other Sessions`}</span>
            </button>
          ) : undefined
        }
      />

      {/* KPI & Security Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Total Active Sessions */}
        <div className="surface-tile p-6 rounded-2xl border border-[var(--kyro-border)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--kyro-text-secondary)] opacity-60">
              Total Connections
            </span>
            <StatusDot status="live" />
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-[var(--kyro-text-primary)]">
              {loading ? "..." : sessions.length}
            </div>
            <p className="text-xs text-[var(--kyro-text-secondary)] mt-1 font-medium">
              {sessions.length === 1 ? "1 active session on this device" : `${sessions.length} devices authenticated`}
            </p>
          </div>
        </div>

        {/* Metric 2: Current Host Info */}
        <div className="surface-tile p-6 rounded-2xl border border-[var(--kyro-border)] flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--kyro-text-secondary)] opacity-60 mb-4">
            Current Device
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--kyro-text-primary)] truncate">
              {currentSession?.sessionName || currentSession?.deviceInfo?.device || currentSession?.deviceInfo?.browser || "This Browser"}
            </div>
            <div className="text-xs font-mono text-[var(--kyro-text-secondary)] opacity-70 mt-1">
              IP: {currentSession?.deviceInfo?.ip || "Localhost / Proxy"}
            </div>
          </div>
        </div>

        {/* Metric 3: Security Status */}
        <div className="surface-tile p-6 rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/30 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--kyro-text-secondary)] opacity-60 mb-4">
            Session Security
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--kyro-text-primary)]">
              JWT & HttpOnly Protection
            </div>
            <p className="text-xs text-[var(--kyro-text-secondary)] opacity-70 mt-1">
              Sessions are cryptographically verified and expire on inactivity.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-xs font-bold text-red-600/70 hover:text-red-600"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Sessions Section */}
      <div className="surface-tile p-6 md:p-8 rounded-3xl border border-[var(--kyro-border)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--kyro-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4 bg-[var(--kyro-primary)] rounded-full" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--kyro-text-primary)]">
              Authenticated Devices & Browsers
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--kyro-text-secondary)] opacity-50">
            {sessions.length} recorded
          </span>
        </div>

        {loading ? (
          <SkeletonGrid count={3} />
        ) : sessions.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/10">
            <h3 className="text-base font-bold text-[var(--kyro-text-primary)] mb-1">No active sessions</h3>
            <p className="text-xs text-[var(--kyro-text-secondary)] opacity-60">No connected devices found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
                  s.currentSession
                    ? "bg-[var(--kyro-surface)] border-[var(--kyro-primary)]/40 shadow-xs ring-1 ring-[var(--kyro-primary)]/20"
                    : "bg-[var(--kyro-surface-accent)]/30 border-[var(--kyro-border)] hover:border-[var(--kyro-primary)]/30 hover:bg-[var(--kyro-surface)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="font-bold text-sm text-[var(--kyro-text-primary)] truncate">
                        {s.sessionName || s.deviceInfo?.device || s.deviceInfo?.browser || "Authorized Device"}
                      </h3>
                      {s.currentSession && (
                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--kyro-text-secondary)] opacity-80 truncate">
                      {s.deviceInfo?.ip || "IP Protected"}
                    </div>
                  </div>

                  {!s.currentSession && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Revoke session for ${s.sessionName || s.deviceInfo?.device || "this device"}?`)) {
                          revoke(s.id);
                        }
                      }}
                      disabled={revokingId === s.id}
                      className="px-2.5 py-1 text-[11px] font-semibold text-red-500 bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 rounded-lg transition-all disabled:opacity-50 shrink-0"
                    >
                      {revokingId === s.id ? "Revoking..." : "Revoke"}
                    </button>
                  )}
                </div>

                <div className="pt-3.5 border-t border-[var(--kyro-border)] grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--kyro-text-secondary)] opacity-50 block">
                      Environment
                    </span>
                    <span className="text-[11px] font-medium text-[var(--kyro-text-primary)] truncate block">
                      {s.deviceInfo?.platform || s.deviceInfo?.browser || "Standard Client"}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--kyro-text-secondary)] opacity-50 block">
                      Last Active
                    </span>
                    <span className="text-[11px] font-medium text-[var(--kyro-text-primary)] block">
                      {timeAgo(s.lastActivityAt || s.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}