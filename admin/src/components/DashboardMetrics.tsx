import React, { useEffect, useState } from "react";
import { adminPath } from "../lib/paths";
import { apiGet } from "../lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MetricsData {
  totalDocuments: number;
  totalMedia: number;
  totalUsers: number;
  totalWebhooks: number;
  totalApiKeys: number;
  totalStoredRecords: number;
  collectionCounts: Record<string, number>;
  collections: number;
  timestamp: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="dashboard-stat animate-pulse">
      <div className="h-7 w-20 rounded mb-2" style={{ background: "var(--kyro-bg-secondary)" }} />
      <div className="h-3 w-28 rounded" style={{ background: "var(--kyro-bg-secondary)" }} />
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="dashboard-stat-grid">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  value,
  label,
  subtext,
  trend,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subtext?: string;
  trend?: { value: string; up: boolean };
}) {
  return (
    <div className="dashboard-stat">
      <p className="dashboard-stat-label">{label}</p>
      <p className="dashboard-stat-value">{typeof value === "number" ? formatNumber(value) : value}</p>
      {subtext && <p className="dashboard-stat-note">{subtext}</p>}
      {trend && <p className="dashboard-stat-note">{trend.value}</p>}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl  border px-4 py-3 text-sm"
      style={{
        background: "var(--kyro-bg-primary)",
        borderColor: "var(--kyro-border)",
        color: "var(--kyro-text-primary)",
      }}
    >
      <p className="font-bold mb-2 text-xs tracking-widest opacity-60">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="font-semibold">
            {p.name === "revenue"
              ? formatCurrency(p.value, currency)
              : p.name === "orders"
                ? `${p.value} orders`
                : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Revenue / Orders dual chart ──────────────────────────────────────────────

export const RevenueChart: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [series, setSeries] = useState<"revenue" | "orders">("revenue");
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState<"6" | "12" | "all">("12");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setAuth((window as any).__kyroAuth || null);
    }
    const handleAuth = (e: any) => {
      if (e?.detail) setAuth(e.detail);
      else if (typeof window !== "undefined") setAuth((window as any).__kyroAuth || null);
    };
    window.addEventListener("kyro:auth-ready", handleAuth);
    return () => window.removeEventListener("kyro:auth-ready", handleAuth);
  }, []);

  const userRole = auth?.user?.role || "";
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const canReadOrders = isAdmin || auth?.permissions?.collections?.orders?.read === true;

  useEffect(() => {
    if (!mounted) return;
    if (!canReadOrders) {
      setLoading(false);
      return;
    }
    apiGet<any>("/api/analytics", { autoToast: false })
      .then(setData)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [mounted, canReadOrders]);

  if (!mounted || !canReadOrders) return null;

  if (loading)
    return (
      <div className="mt-6 p-6 rounded-lg border animate-pulse" style={{ background: "var(--kyro-surface-accent)", borderColor: "var(--kyro-border)" }}>
        <div className="h-72 rounded-lg" style={{ background: "var(--kyro-bg-secondary)" }} />
      </div>
    );

  const hasChartData = data?.chartData?.length > 0;
  const currency = data?.currencyCode || "USD";
  // Group the existing daily records for a readable monthly overview.
  const monthly = new Map<string, { date: string; revenue: number; orders: number }>();
  for (const record of data?.chartData || []) {
    const month = String(record.date).slice(0, 7);
    const previous = monthly.get(month) || { date: `${month}-01`, revenue: 0, orders: 0 };
    previous.revenue += Number(record.revenue) || 0;
    previous.orders += Number(record.orders) || 0;
    monthly.set(month, previous);
  }
  const enrichedData = [...monthly.values()].sort((a, b) => a.date.localeCompare(b.date));

  const chartData = range === "all" ? enrichedData : enrichedData.slice(-Number(range));
  const periodTotal = chartData.reduce((total, item) => total + item[series], 0);
  const periodLabel = chartData.length ? `${new Date(`${chartData[0].date}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })} – ${new Date(`${chartData[chartData.length - 1].date}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : "No activity yet";

  // Order status breakdown
  const STATUS_COLORS: Record<string, string> = {
    pending: "#fbbf24",    // Amber
    processing: "#38bdf8", // Sky
    shipped: "#a1a1aa",    // Slate
    delivered: "#34d399",  // Emerald
    completed: "#10b981",  // Emerald Darker
    cancelled: "#f87171",  // Red
  };
  const fallbackColors = ["#ff9b6b", "#94a3b8", "#fbbf24", "#f87171", "#c084fc", "#38bdf8"];

  const statusData = data?.ordersByStatus
    ? Object.entries(data.ordersByStatus).map(([name, value]: any, i) => {
      const normalized = name.toLowerCase().trim();
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: STATUS_COLORS[normalized] || fallbackColors[i % fallbackColors.length],
      };
    })
    : [];

  const statusOrder = ["Pending", "Processing", "Shipped", "Delivered", "Completed", "Cancelled"];
  statusData.sort((a, b) => (statusOrder.indexOf(a.name) < 0 ? 99 : statusOrder.indexOf(a.name)) - (statusOrder.indexOf(b.name) < 0 ? 99 : statusOrder.indexOf(b.name)));
  const statusTotal = statusData.reduce((sum, entry) => sum + Number(entry.value), 0);
  return (
    <section className="dashboard-analytics dashboard-analytics-refined" aria-label="Store analytics">
      <div className="dashboard-chart">
        <div className="analytics-heading">
          <div><h2 className="dashboard-section-title">Store performance</h2><p className="dashboard-section-note">{periodLabel}</p></div>
          <div className="analytics-range" aria-label="Chart date range">
            {(["6", "12", "all"] as const).map(value => <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)}>{value === "all" ? "All time" : `${value} months`}</button>)}
          </div>
        </div>
        <div className="analytics-summary">
          <div><p className="analytics-period-total">{series === "revenue" ? formatCurrency(periodTotal, currency) : formatNumber(periodTotal)}</p><p className="dashboard-section-note">{series === "revenue" ? "Revenue in selected period" : "Orders in selected period"}</p></div>
          <div className="dashboard-chart-tabs" aria-label="Chart metric">
            <button type="button" aria-pressed={series === "revenue"} onClick={() => setSeries("revenue")}>Revenue</button>
            <button type="button" aria-pressed={series === "orders"} onClick={() => setSeries("orders")}>Orders</button>
          </div>
        </div>
        <div className="analytics-plot">
          {failed ? <p className="dashboard-empty" role="status">Could not load analytics. Refresh the page to try again.</p> : !hasChartData ? (
            <p className="dashboard-empty">Your sales activity will appear here once orders come in.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--kyro-border)" strokeDasharray="3 4" />
                <XAxis dataKey="date" stroke="var(--kyro-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={32} tickFormatter={(date) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "2-digit" })} />
                <YAxis stroke="var(--kyro-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={56} tickCount={4} allowDecimals={series === "revenue"} tickFormatter={(v) => series === "revenue" ? new Intl.NumberFormat("en", { style: "currency", currency, notation: "compact", maximumFractionDigits: 0 }).format(v) : String(v)} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Area type="monotone" dataKey={series} stroke="var(--kyro-chart)" strokeWidth={2} fill="transparent" dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: "var(--kyro-chart)", stroke: "var(--kyro-surface)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <aside className="dashboard-status" aria-label="Order status">
        <div className="analytics-heading"><h2 className="dashboard-section-title">Order overview</h2><a href={`${adminPath}/orders`} aria-label="View all orders">↗</a></div>
        <p className="order-overview-total">{formatNumber(statusTotal)} <span>total orders</span></p>
        {statusTotal > 0 && <div className="order-distribution" aria-hidden="true">{statusData.map(entry => <span key={entry.name} style={{ flex: Number(entry.value), background: entry.color }} />)}</div>}
        {statusData.length === 0 ? <p className="dashboard-empty">{failed ? "Order status unavailable." : "No orders yet."}</p> : <ul>
          {statusData.map(entry => <li key={entry.name}>
            <span className="dashboard-status-dot" style={{ background: entry.color }} aria-hidden="true" />
            <span>{entry.name}</span><strong>{entry.value}</strong>
          </li>)}
        </ul>}
        <p className="dashboard-section-note order-scope-note">Across all recorded orders</p>
      </aside>
    </section>
  );
};

// ─── Main Metrics Panel ───────────────────────────────────────────────────────

export interface DashboardMetricsProps {
  isEcommerce?: boolean;
  allowedCollections?: string[];
}

import { ClientOnly } from "./ui/ClientOnly";

const DashboardMetricsInner: React.FC<DashboardMetricsProps> = ({ isEcommerce, allowedCollections }) => {
  const [data, setData] = useState<MetricsData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuth((window as any).__kyroAuth || null);
    }
    const handleAuth = (e: any) => {
      if (e?.detail) setAuth(e.detail);
      else if (typeof window !== "undefined") setAuth((window as any).__kyroAuth || null);
    };
    window.addEventListener("kyro:auth-ready", handleAuth);
    return () => window.removeEventListener("kyro:auth-ready", handleAuth);
  }, []);

  const user = auth?.user;
  const permissions = auth?.permissions;
  const userRole = user?.role || "";
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;

  useEffect(() => {
    Promise.all([
      apiGet<MetricsData>("/api/metrics", { autoToast: false }),
      isEcommerce
        ? apiGet<any>("/api/analytics", { autoToast: false }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([metricsRes, analyticsRes]) => {
        setData(metricsRes);
        if (analyticsRes) setAnalyticsData(analyticsRes);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load metrics:", err);
        setError("Unable to load metrics");
      })
      .finally(() => setLoading(false));
  }, [isEcommerce]);

  if (loading) {
    return <SkeletonSection />;
  }

  if (error) {
    return (
      <div className="surface-tile overflow-hidden rounded-lg mb-6">
        <div className="p-6 border-b" style={{ borderColor: "var(--kyro-border)" }}>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--kyro-text-primary)" }}>Metrics</h2>
        </div>
        <div className="p-6">
          <p className="text-sm" style={{ color: "var(--kyro-text-muted)" }}>{error}</p>
        </div>
      </div>
    );
  }

  const currency = analyticsData?.currencyCode || "USD";

  const productCount =
    ((!allowedCollections || allowedCollections.includes("products")) ? (data?.collectionCounts?.["products"] || 0) : 0) +
    ((!allowedCollections || allowedCollections.includes("food-menu")) ? (data?.collectionCounts?.["food-menu"] || 0) : 0) +
    ((!allowedCollections || allowedCollections.includes("menu")) ? (data?.collectionCounts?.["menu"] || 0) : 0);

  const ecommerceCards = [
    {
      id: "revenue",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      value: analyticsData?.totalRevenue !== undefined
        ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(analyticsData.totalRevenue)
        : "$0",
      label: "Total Revenue",
      subtext: "Across all recorded orders",
      visible: (isAdmin || permissions?.collections?.orders?.read === true) && (!allowedCollections || allowedCollections.includes("orders")),
    },
    {
      id: "products",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      gradient: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
      value: productCount,
      label: "Products",
      subtext: "In your catalog",
      visible: (isAdmin || permissions?.collections?.products?.read === true) && (!allowedCollections || allowedCollections.some((c: string) => ["products", "food-menu", "menu"].includes(c))),
    },
    {
      id: "orders",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
      gradient: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
      value: analyticsData?.totalOrders !== undefined ? analyticsData.totalOrders : (data?.collectionCounts?.["orders"] || 0),
      label: "Orders",
      subtext: "Total orders placed",
      visible: (isAdmin || permissions?.collections?.orders?.read === true) && (!allowedCollections || allowedCollections.includes("orders")),
    },
    {
      id: "customers",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
      value: data?.collectionCounts?.["customers"] || 0,
      label: "Customers",
      subtext: "Registered shoppers",
      visible: (isAdmin || permissions?.collections?.customers?.read === true || permissions?.collections?.users?.read === true) && (!allowedCollections || allowedCollections.includes("customers")),
    },
    {
      id: "reviews",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
      gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
      value: data?.collectionCounts?.["reviews"] || 0,
      label: "Reviews",
      subtext: "Customer feedback",
      visible: (isAdmin || permissions?.collections?.reviews?.read === true) && (!allowedCollections || allowedCollections.includes("reviews")),
    },
  ].filter((c) => c.visible);

  // Dynamically extract top active custom collections permitted for user
  const activeCustomCollections = data?.collectionCounts
    ? Object.entries(data.collectionCounts)
      .filter(([slug, count]) => count > 0 && !["users", "audit_logs", "media"].includes(slug))
      .filter(([slug]) => !allowedCollections || allowedCollections.includes(slug))
      .filter(([slug]) => isAdmin || permissions?.collections?.[slug]?.read === true)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    : [];

  const dynamicCollectionCards = activeCustomCollections.map(([slug, count]) => {
    const formattedLabel = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return {
      id: `col-${slug}`,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
      value: count,
      label: formattedLabel,
      subtext: "Active entries",
    };
  });

  const scopedDocumentCount = allowedCollections
    ? Object.entries(data?.collectionCounts || {})
      .filter(([slug]) => allowedCollections.includes(slug))
      .reduce((sum, [, count]) => sum + count, 0)
    : data?.totalDocuments || 0;
  const scopedCollectionsCount = allowedCollections ? allowedCollections.length : (data?.collections || 0);

  const baseCmsCards = [
    {
      id: "documents",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      value: scopedDocumentCount,
      label: "Documents",
      subtext: `Across ${scopedCollectionsCount} collection${scopedCollectionsCount !== 1 ? "s" : ""}`,
      visible: true,
    },
    {
      id: "media",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      gradient: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
      value: data?.totalMedia || 0,
      label: "Media Files",
      subtext: "Images, videos & docs",
      visible: isAdmin || permissions?.collections?.media?.read === true,
    },
  ].filter((c) => c.visible);

  const trailingCmsCards = [
    {
      id: "team",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
      value: data?.totalUsers || 0,
      label: "Team Members",
      subtext: "Active user accounts",
      visible: isAdmin || permissions?.collections?.users?.read === true,
    },
  ].filter((c) => c.visible);

  const cmsCards = [
    ...baseCmsCards,
    ...dynamicCollectionCards,
    ...trailingCmsCards,
  ].slice(0, 5);

  const cards = isEcommerce ? ecommerceCards : cmsCards;

  return (
    <div
      className="dashboard-metrics"
    >
      <div className="dashboard-stat-grid">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : data
            ? cards.map((card, i) => (
              <MetricCard key={i} {...card} />
            ))
            : null}
      </div>
    </div>
  );
};

export const DashboardMetrics: React.FC<DashboardMetricsProps> = (props) => (
  <ClientOnly fallback={<SkeletonSection />}>
    <DashboardMetricsInner {...props} />
  </ClientOnly>
);
