import "../styles/health-workspace.css";
import "../lib/i18n";
import React, { useState, useEffect } from "react";
import { apiGet, apiDelete } from "../lib/api";
import { PageHeader } from "./ui/PageHeader";
import { toast } from "../lib/stores";
import { Badge } from "./ui/Badge";
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
    <div className="health-workspace sessions-workspace">
      <PageHeader
        title={t("tooltips.activeSessions", { defaultValue: "Active Sessions" })}
        actions={
          !loading && otherCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Revoke all ${otherCount} other active sessions? You will stay logged in on this device.`)) {
                  revokeAll();
                }
              }}
              disabled={revokingAll || revokingId !== null}
              className="px-4 py-2 text-xs font-medium rounded-md border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 "
            >
              <span>{revokingAll ? "Revoking..." : `Revoke ${otherCount} Other Sessions`}</span>
            </button>
          ) : undefined
        }
      />

      <div className="health-metric-strip">
        <div><span>Active sessions</span><strong>{loading ? "—" : sessions.length}</strong></div>
        <div><span>Other sessions</span><strong>{loading ? "—" : otherCount}</strong></div>
        <div><span>This device</span><strong>{currentSession?.sessionName || currentSession?.deviceInfo?.browser || "Unknown"}</strong></div>
      </div>
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
          <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-xs font-medium text-red-600/70 hover:text-red-600"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Sessions Section */}
      <div className="surface-tile p-4 md:p-8 rounded-lg border border-[var(--kyro-border)] space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--kyro-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4 bg-[var(--kyro-primary)] rounded-full" />
            <h2 className="text-xs font-medium tracking-normal text-[var(--kyro-text-primary)]">
              Signed-in devices
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--kyro-text-secondary)] opacity-50">
            {sessions.length} recorded
          </span>
        </div>

        {loading ? (
          <SkeletonGrid count={3} />
        ) : sessions.length === 0 ? (
          <div className="p-16 text-center rounded-lg border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/10">
            <h3 className="text-base font-medium text-[var(--kyro-text-primary)] mb-1">No active sessions</h3>
            <p className="text-xs text-[var(--kyro-text-secondary)] opacity-60">No connected devices found.</p>
          </div>
        ) : (
          <div className="session-list">
            {[...sessions].sort((a, b) => Number(b.currentSession) - Number(a.currentSession)).map(session => (
              <article className="session-row" key={session.id}>
                <div>
                  <div className="session-identity">
                    <h3>{session.sessionName || session.deviceInfo?.device || session.deviceInfo?.browser || "Unknown device"}</h3>
                    {session.currentSession && <Badge variant="success">This device</Badge>}
                  </div>
                  <p>{session.deviceInfo?.platform || session.deviceInfo?.browser || "Unknown platform"} · Active {timeAgo(session.lastActivityAt || session.createdAt)}</p>
                  <details><summary>Connection details</summary>
                    <dl><dt>IP address</dt><dd>{session.deviceInfo?.ip || "Unavailable"}</dd>
                    <dt>Started</dt><dd>{new Date(session.createdAt).toLocaleString()}</dd>
                    <dt>Browser</dt><dd>{session.deviceInfo?.userAgent || "Unavailable"}</dd></dl>
                  </details>
                </div>
                {!session.currentSession && <button type="button" className="health-danger-action"
                  disabled={revokingAll || revokingId !== null}
                  onClick={() => { if (confirm("End this session? The device will need to sign in again.")) revoke(session.id); }}>
                  {revokingId === session.id ? "Ending…" : "End session"}
                </button>}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
