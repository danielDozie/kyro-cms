import "../styles/health-workspace.css";
import "../lib/i18n";
import React, { useState, useEffect, useCallback } from "react";
import { apiGet } from "../lib/api";
import {
  RefreshCcw,
  Server,
  Database,
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
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}

function StatCard({ label, value, sub, loading }: StatCardProps) {
  return (
    <div
      className="health-stat relative overflow-hidden rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)] p-3 flex flex-col gap-3 hover:border-[var(--kyro-border-hover,var(--kyro-border))] transition-colors"
    >
      {loading ? (
        <div className="space-y-1.5">
          <Shimmer variant="text" className="w-16" />
          <Shimmer variant="text" className="w-24" />
        </div>
      ) : (
        <>
          <div>
            <p className="text-2xl font-medium text-[var(--kyro-text-primary)] leading-none tracking-tight">
              {value}
            </p>
            {sub && (
              <p className="text-[11px] text-[var(--kyro-text-muted)] mt-1">{sub}</p>
            )}
          </div>
          <p className="text-xs font-medium text-[var(--kyro-text-secondary)] tracking-normal">
            {label}
          </p>
        </>
      )}
    </div>
  );
}

interface ServiceRowProps {
  name: string;
  status: "online" | "offline" | "unknown";
  detail?: string;
  loading?: boolean;
}

function ServiceRow({ name, status, detail, loading }: ServiceRowProps) {
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
    <div className="flex items-center gap-4 py-3.5 px-4 rounded-lg hover:bg-[var(--kyro-surface-accent)] transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--kyro-text-primary)]">{name}</p>
      </div>
      {loading ? (
        <Shimmer variant="text" className="w-16" />
      ) : (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {detail && (
            <span className="text-xs text-[var(--kyro-text-muted)] hidden sm:block">{detail}</span>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiHealth({ system = false }: { system?: boolean } = {}) {
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
    <div className="health-workspace">
      <PageHeader
        title={system ? "System health" : t("tooltips.apiHealth", { defaultValue: "API Health" })}
        actions={
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-border)] border border-[var(--kyro-border)] text-sm font-medium text-[var(--kyro-text-primary)] transition-all active:scale-95 disabled:opacity-60"
          >
            <RefreshCcw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        }
      />

      <div className="space-y-4">
        {/* Overall status banner */}
        <div
          className={`relative overflow-hidden rounded-lg border p-4 flex items-center gap-3 ${healthLoading
            ? "border-[var(--kyro-border)] bg-[var(--kyro-surface)]"
            : isHealthy
              ? "border-emerald-500/20 bg-[var(--kyro-surface)]"
              : "border-red-500/20 bg-[var(--kyro-surface)]"
            }`}
        >
          <div className="flex-1 min-w-0">
            {healthLoading ? (
              <div className="space-y-2">
                <Shimmer variant="text" className="w-40" />
                <Shimmer variant="text" className="w-64" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-medium text-[var(--kyro-text-primary)] tracking-tight">
                    {isHealthy ? "API available" : "API unavailable"}
                  </h2>
                  <Badge variant={isHealthy ? "success" : "danger"} dot>
                    {isHealthy ? "Healthy" : "Degraded"}
                  </Badge>
                </div>
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


            label="API Status"
            value={healthLoading ? "—" : health?.status === "ok" ? "OK" : "Error"}
            sub={health?.timestamp ? timeSince(health.timestamp) : undefined}
            loading={healthLoading}
          />
          <StatCard


            label="CMS Version"
            value={health?.version ? `v${health.version}` : "—"}
            sub="kyro-cms core"
            loading={healthLoading}
          />
          <StatCard


            label="Collections"
            value={health?.collections?.length ?? "—"}
            sub="registered schemas"
            loading={healthLoading}
          />
          <StatCard


            label="Total Records"
            value={metrics ? metrics.totalStoredRecords.toLocaleString() : "—"}
            sub="across all collections"
            loading={metricsLoading}
          />
        </div>

        {/* Two-column detail section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Services */}
          <div className="rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--kyro-border)] flex items-center gap-2">

              <h3 className="text-sm font-medium text-[var(--kyro-text-primary)]">
                Service Status
              </h3>
            </div>
            <div className="p-2 divide-y divide-[var(--kyro-border)]">
              <ServiceRow
                name="REST API"

                status={overallStatus}
                detail={health?.timestamp ? formatTimestamp(health.timestamp) : undefined}

                loading={healthLoading}
              />
              <ServiceRow
                name="Database"

                status={metrics ? "online" : healthLoading || metricsLoading ? "unknown" : "offline"}
                detail={metrics ? `${metrics.totalStoredRecords.toLocaleString()} records` : undefined}

                loading={metricsLoading}
              />
              <ServiceRow
                name="Auth Service"

                status={overallStatus}
                detail={metrics?.totalUsers !== undefined ? `${metrics.totalUsers} users` : undefined}

                loading={healthLoading}
              />
              <ServiceRow
                name="Webhooks"

                status={overallStatus}
                detail={metrics?.totalWebhooks !== undefined ? `${metrics.totalWebhooks} configured` : undefined}

                loading={metricsLoading}
              />
            </div>
          </div>

          {/* System info */}
          <div className="rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--kyro-border)] flex items-center gap-2">

              <h3 className="text-sm font-medium text-[var(--kyro-text-primary)]">
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
          <div className="rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--kyro-border)] flex items-center gap-2">

              <h3 className="text-sm font-medium text-[var(--kyro-text-primary)]">
                Collection Breakdown
              </h3>
              <span className="ml-auto text-xs text-[var(--kyro-text-muted)]">
                Document counts
              </span>
            </div>
            <div className="p-3">
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
        <details className="health-endpoint-details rounded-lg border border-dashed border-[var(--kyro-border)] bg-[var(--kyro-surface)] p-3 flex items-start gap-3">
          <summary>Monitoring endpoint</summary>
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
        </details>
      </div>
    </div>
  );
}
