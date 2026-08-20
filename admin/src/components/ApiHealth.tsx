import React, { useState, useEffect, useCallback } from "react";
import { apiGet } from "../lib/api";
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Server,
  Clock,
  Database,
  Shield,
  Zap,
  AlertTriangle,
  Globe,
  Box,
} from "./ui/icons";
import { PageHeader } from "./ui/PageHeader";
import { Badge } from "./ui/Badge";
import { Shimmer } from "./ui/Shimmer";
import { useTranslation } from "react-i18next";

interface HealthData {
  status: string;
  version: string;
  collections: string[];
  timestamp: string;
}

interface MetricsData {
  totalDocuments: number;
  totalMedia?: number;
  totalUsers?: number;
  totalWebhooks?: number;
  totalApiKeys?: number;
  totalStoredRecords: number;
  collectionCounts: Record<string, number>;
  collections: number;
  timestamp: string;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  loading?: boolean;
}

function StatCard({ icon, label, value, sub, color, loading }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface)] p-5 flex flex-col gap-3 hover:border-[var(--kyro-border-hover,var(--kyro-border))] transition-colors"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}
      >
        {icon}
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <Shimmer variant="text" className="w-16" />
          <Shimmer variant="text" className="w-24" />
        </div>
      ) : (
        <>
          <div>
            <p className="text-2xl font-bold text-[var(--kyro-text-primary)] leading-none tracking-tight">
              {value}
            </p>
            {sub && (
              <p className="text-[11px] text-[var(--kyro-text-muted)] mt-1">{sub}</p>
            )}
          </div>
          <p className="text-xs font-medium text-[var(--kyro-text-secondary)] uppercase tracking-wider">
            {label}
          </p>
        </>
      )}
    </div>
  );
}

interface ServiceRowProps {
  name: string;
  description: string;
  status: "online" | "offline" | "unknown";
  detail?: string;
  icon: React.ReactNode;
  loading?: boolean;
}

function ServiceRow({ name, description, status, detail, icon, loading }: ServiceRowProps) {
  const statusConfig = {
    online: {
      dot: "bg-emerald-500",
      badge: "success" as const,
      label: "Online",
    },
    offline: {
      dot: "bg-red-500",
      badge: "danger" as const,
      label: "Offline",
    },
    unknown: {
      dot: "bg-yellow-500",
      badge: "warning" as const,
      label: "Unknown",
    },
  };
  const cfg = statusConfig[status];

  return (
    <div className="flex items-center gap-4 py-3.5 px-4 rounded-xl hover:bg-[var(--kyro-surface-accent)] transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-[var(--kyro-surface-accent)] group-hover:bg-[var(--kyro-surface)] flex items-center justify-center text-[var(--kyro-text-secondary)] transition-colors flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--kyro-text-primary)]">{name}</p>
        <p className="text-xs text-[var(--kyro-text-muted)] truncate">{description}</p>
      </div>
      {loading ? (
        <Shimmer variant="text" className="w-16" />
      ) : (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {detail && (
            <span className="text-xs text-[var(--kyro-text-muted)] hidden sm:block">{detail}</span>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiHealth() {
    const { t } = useTranslation();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await apiGet<HealthData>("/api/health");
      setHealth(data);
      setHealthError(false);
    } catch {
      setHealthError(true);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await apiGet<MetricsData>("/api/metrics", { autoToast: false });
      setMetrics(data);
    } catch {
      // metrics may not be available for non-admins — silently ignore
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setHealthLoading(true);
    setMetricsLoading(true);
    await Promise.all([fetchHealth(), fetchMetrics()]);
    setLastRefreshed(new Date());
    setRefreshing(false);
  }, [fetchHealth, fetchMetrics]);

  useEffect(() => {
    fetchHealth();
    fetchMetrics();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchHealth();
      fetchMetrics();
      setLastRefreshed(new Date());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = !healthError && health?.status === "ok";
  const overallStatus: "online" | "offline" | "unknown" = healthLoading
    ? "unknown"
    : isHealthy
      ? "online"
      : "offline";

  const collectionEntries = Object.entries(metrics?.collectionCounts ?? {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title={t("tooltips.apiHealth", { defaultValue: "API Health" })}
        description="Real-time status and diagnostics for the Kyro CMS API"
        actions={
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-border)] border border-[var(--kyro-border)] text-sm font-medium text-[var(--kyro-text-primary)] transition-all active:scale-95 disabled:opacity-60"
          >
            <RefreshCcw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        }
      />

      <div className="space-y-6">
        {/* Overall status banner */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-6 flex items-center gap-5 ${healthLoading
              ? "border-[var(--kyro-border)] bg-[var(--kyro-surface)]"
              : isHealthy
                ? "border-emerald-500/20 bg-[var(--kyro-surface)]"
                : "border-red-500/20 bg-[var(--kyro-surface)]"
            }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${healthLoading
                ? "bg-[var(--kyro-surface-accent)]"
                : isHealthy
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-500"
              }`}
          >
            {healthLoading ? (
              <Activity className="w-6 h-6 text-[var(--kyro-text-muted)]" />
            ) : isHealthy ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <XCircle className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {healthLoading ? (
              <div className="space-y-2">
                <Shimmer variant="text" className="w-40" />
                <Shimmer variant="text" className="w-64" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-[var(--kyro-text-primary)] tracking-tight">
                    {isHealthy ? "All Systems Operational" : "Service Disruption Detected"}
                  </h2>
                  <Badge variant={isHealthy ? "success" : "danger"} dot>
                    {isHealthy ? "Healthy" : "Degraded"}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--kyro-text-secondary)] mt-1">
                  {isHealthy
                    ? `Kyro CMS v${health?.version} is running normally. API is reachable and responding correctly.`
                    : "The API is not responding correctly. Check your server logs for more information."}
                </p>
                <p className="text-[11px] text-[var(--kyro-text-muted)] mt-2">
                  Last checked: {lastRefreshed.toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            color="bg-emerald-500/10 text-emerald-500"
            label="API Status"
            value={healthLoading ? "—" : health?.status === "ok" ? "OK" : "Error"}
            sub={health?.timestamp ? timeSince(health.timestamp) : undefined}
            loading={healthLoading}
          />
          <StatCard
            icon={<Server className="w-5 h-5" />}
            color="bg-blue-500/10 text-blue-500"
            label="CMS Version"
            value={health?.version ? `v${health.version}` : "—"}
            sub="kyro-cms core"
            loading={healthLoading}
          />
          <StatCard
            icon={<Box className="w-5 h-5" />}
            color="bg-violet-500/10 text-violet-500"
            label="Collections"
            value={health?.collections?.length ?? "—"}
            sub="registered schemas"
            loading={healthLoading}
          />
          <StatCard
            icon={<Database className="w-5 h-5" />}
            color="bg-orange-500/10 text-orange-500"
            label="Total Records"
            value={metrics ? metrics.totalStoredRecords.toLocaleString() : "—"}
            sub="across all collections"
            loading={metricsLoading}
          />
        </div>

        {/* Two-column detail section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Services */}
          <div className="rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--kyro-border)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--kyro-text-primary)]">
                Service Status
              </h3>
            </div>
            <div className="p-2 divide-y divide-[var(--kyro-border)]">
              <ServiceRow
                name="REST API"
                description="Core HTTP endpoints for all collection operations"
                status={overallStatus}
                detail={health?.timestamp ? formatTimestamp(health.timestamp) : undefined}
                icon={<Globe className="w-4 h-4" />}
                loading={healthLoading}
              />
              <ServiceRow
                name="Database"
                description="Primary data store connection"
                status={metrics ? "online" : healthLoading || metricsLoading ? "unknown" : "offline"}
                detail={metrics ? `${metrics.totalStoredRecords.toLocaleString()} records` : undefined}
                icon={<Database className="w-4 h-4" />}
                loading={metricsLoading}
              />
              <ServiceRow
                name="Auth Service"
                description="Authentication and session management"
                status={overallStatus}
                detail={metrics?.totalUsers !== undefined ? `${metrics.totalUsers} users` : undefined}
                icon={<Shield className="w-4 h-4" />}
                loading={healthLoading}
              />
              <ServiceRow
                name="Webhooks"
                description="Event delivery and outbound notifications"
                status={overallStatus}
                detail={metrics?.totalWebhooks !== undefined ? `${metrics.totalWebhooks} configured` : undefined}
                icon={<Zap className="w-4 h-4" />}
                loading={metricsLoading}
              />
            </div>
          </div>

          {/* System info */}
          <div className="rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--kyro-border)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--kyro-text-primary)]">
                System Info
              </h3>
            </div>
            <div className="p-4 space-y-1">
              {healthLoading ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Shimmer variant="text" className="w-28" />
                      <Shimmer variant="text" className="w-36" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {[
                    {
                      label: "Version",
                      value: health?.version ? `v${health.version}` : "—",
                    },
                    {
                      label: "Server Time",
                      value: health?.timestamp ? formatTimestamp(health.timestamp) : "—",
                    },
                    {
                      label: "Collections",
                      value: health?.collections?.length ?? "—",
                    },
                    {
                      label: "API Keys",
                      value: metrics?.totalApiKeys !== undefined ? metrics.totalApiKeys : "—",
                    },
                    {
                      label: "Media Files",
                      value: metrics?.totalMedia !== undefined ? metrics.totalMedia.toLocaleString() : "—",
                    },
                    {
                      label: "Total Users",
                      value: metrics?.totalUsers !== undefined ? metrics.totalUsers : "—",
                    },
                    {
                      label: "Webhooks",
                      value: metrics?.totalWebhooks !== undefined ? metrics.totalWebhooks : "—",
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-2.5 border-b border-[var(--kyro-border)] last:border-0"
                    >
                      <span className="text-sm text-[var(--kyro-text-secondary)]">{label}</span>
                      <span className="text-sm font-medium text-[var(--kyro-text-primary)]">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Collection breakdown */}
        {(metricsLoading || collectionEntries.length > 0) && (
          <div className="rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--kyro-border)] flex items-center gap-2">
              <Box className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--kyro-text-primary)]">
                Collection Breakdown
              </h3>
              <span className="ml-auto text-xs text-[var(--kyro-text-muted)]">
                Document counts
              </span>
            </div>
            <div className="p-5">
              {metricsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Shimmer variant="text" className="w-28" />
                      <div className="flex-1">
                        <Shimmer variant="text" className="w-full" />
                      </div>
                      <Shimmer variant="text" className="w-10" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {collectionEntries.map(([slug, count]) => {
                    const maxCount = collectionEntries[0]?.[1] || 1;
                    const pct = Math.max(4, (count / maxCount) * 100);
                    return (
                      <div key={slug} className="flex items-center gap-3">
                        <span className="text-sm text-[var(--kyro-text-secondary)] w-36 shrink-0 truncate capitalize">
                          {slug.replace(/-/g, " ")}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--kyro-surface-accent)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--kyro-primary)] opacity-70 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-[var(--kyro-text-primary)] w-12 text-right shrink-0">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Raw endpoint callout */}
        <div className="rounded-2xl border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface)] p-5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[var(--kyro-text-muted)] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--kyro-text-primary)]">
              Raw Health Endpoint
            </p>
            <p className="text-xs text-[var(--kyro-text-muted)] mt-0.5">
              The raw JSON response is available at{" "}
              <a
                href="/api/health"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
              >
                /api/health
              </a>{" "}
              — useful for external monitoring tools and uptime checks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
