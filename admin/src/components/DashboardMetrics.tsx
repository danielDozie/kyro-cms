import React, { useEffect, useState } from "react";
import { useIsMounted } from "../hooks/useIsMounted";
import { apiGet } from "../lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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
    <div className="p-5 rounded-lg border border-[var(--kyro-border)] animate-pulse" style={{ background: "var(--kyro-surface-accent)" }}>
      <div className="w-10 h-10 rounded-lg mb-3" style={{ background: "var(--kyro-bg-secondary)" }} />
      <div className="h-7 w-20 rounded mb-2" style={{ background: "var(--kyro-bg-secondary)" }} />
      <div className="h-3 w-28 rounded" style={{ background: "var(--kyro-bg-secondary)" }} />
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  icon,
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
    <div
      className="relative flex flex-col justify-between rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:scale-[1.015]"
      style={{
        background: "var(--kyro-surface)",
        border: "1px solid var(--kyro-border)",
      }}
    >
      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between mb-5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: "var(--kyro-bg-secondary)",
            color: "var(--kyro-text-secondary)",
          }}
        >
          {icon}
        </div>
        {trend && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "var(--kyro-bg-secondary)",
              color: trend.up ? "var(--kyro-text-secondary)" : "var(--kyro-text-muted)",
            }}
          >
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>

      {/* Bottom row: number + label */}
      <div>
        <p
          className="text-[26px] font-extrabold tracking-tight leading-none mb-1"
          style={{ color: "var(--kyro-text-primary)" }}
        >
          {typeof value === "number" ? formatNumber(value) : value}
        </p>
        <p className="text-xs font-semibold" style={{ color: "var(--kyro-text-secondary)" }}>
          {label}
        </p>
        {subtext && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--kyro-text-muted)" }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl shadow-2xl border px-4 py-3 text-sm"
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
      .catch(console.error)
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
  const totalRevenue = data?.totalRevenue || 0;
  const totalOrders = data?.totalOrders || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Build order-count per month from chartData if present
  const enrichedData = hasChartData
    ? data.chartData.map((d: any) => ({
      ...d,
      orders: d.orders ?? Math.round(d.revenue / Math.max(avgOrderValue, 1)),
    }))
    : [];

  // Donut data: order status breakdown
  const STATUS_COLORS: Record<string, string> = {
    pending: "#fbbf24",    // Amber
    processing: "#38bdf8", // Sky
    shipped: "#818cf8",    // Indigo
    delivered: "#34d399",  // Emerald
    completed: "#10b981",  // Emerald Darker
    cancelled: "#f87171",  // Red
  };
  const fallbackColors = ["#818cf8", "#94a3b8", "#fbbf24", "#f87171", "#c084fc", "#38bdf8"];

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

  return (
    <div className="mt-6 space-y-6">

      {/* Main Area Chart */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--kyro-surface-accent)", borderColor: "var(--kyro-border)" }}
      >
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--kyro-text-primary)" }}>
              Revenue Overview
            </h2>
            <p className="text-xs font-medium mt-1" style={{ color: "var(--kyro-text-secondary)" }}>
              Revenue & order volume over time
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#818cf8" }} /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#94a3b8" }} /> Orders</span>
          </div>
        </div>

        <div className="h-72 w-full">
          {!hasChartData ? (
            <div
              className=" flex flex-col items-center justify-center w-full h-full rounded-lg border border-dashed text-sm"
              style={{ background: "var(--kyro-bg-secondary)", borderColor: "var(--kyro-border)", color: "var(--kyro-text-muted)" }}
            >
              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              No chart data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrichedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--kyro-border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--kyro-text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  stroke="var(--kyro-text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(v, currency)}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  stroke="var(--kyro-text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fill="url(#gradRevenue)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#818cf8", stroke: "#fff", strokeWidth: 2 }}
                />
                <Area
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orders"
                  stroke="#94a3b8"
                  strokeWidth={2.5}
                  fill="url(#gradOrders)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#94a3b8", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row: Bar Chart + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Monthly Bar Chart */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--kyro-surface-accent)", borderColor: "var(--kyro-border)" }}
        >
          <h3 className="text-base font-bold mb-1" style={{ color: "var(--kyro-text-primary)" }}>Monthly Revenue Bars</h3>
          <p className="text-xs mb-5" style={{ color: "var(--kyro-text-secondary)" }}>Revenue breakdown by period</p>
          <div className="h-48">
            {!hasChartData ? (
              <div className="flex items-center justify-center h-full text-xs" style={{ color: "var(--kyro-text-muted)" }}>No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrichedData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--kyro-border)" />
                  <XAxis dataKey="date" stroke="var(--kyro-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--kyro-text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, currency)} />
                  <Tooltip content={<CustomTooltip currency={currency} />} />
                  <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Status Donut */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--kyro-surface-accent)", borderColor: "var(--kyro-border)" }}
        >
          <h3 className="text-base font-bold mb-1" style={{ color: "var(--kyro-text-primary)" }}>Order Status</h3>
          <p className="text-xs mb-5" style={{ color: "var(--kyro-text-secondary)" }}>Distribution by status</p>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs" style={{ color: "var(--kyro-text-muted)" }}>No status data</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--kyro-bg-primary)",
                      border: "1px solid var(--kyro-border)",
                      borderRadius: "10px",
                      color: "var(--kyro-text-primary)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(v: string) => <span style={{ color: "var(--kyro-text-secondary)" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Metrics Panel ───────────────────────────────────────────────────────

export interface DashboardMetricsProps {
  isEcommerce?: boolean;
}

import { ClientOnly } from "./ui/ClientOnly";

const DashboardMetricsInner: React.FC<DashboardMetricsProps> = ({ isEcommerce }) => {
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
    (data?.collectionCounts?.["products"] || 0) +
    (data?.collectionCounts?.["food-menu"] || 0) +
    (data?.collectionCounts?.["menu"] || 0);

  const ecommerceCards = [
    {
      id: "revenue",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      value: analyticsData?.totalRevenue !== undefined
        ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(analyticsData.totalRevenue)
        : "$0",
      label: "Total Revenue",
      subtext: "From system orders",
      visible: isAdmin || permissions?.collections?.orders?.read === true,
    },
    {
      id: "products",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      gradient: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
      value: productCount,
      label: "Products",
      subtext: "Active inventory",
      visible: isAdmin || permissions?.collections?.products?.read === true,
    },
    {
      id: "orders",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
      gradient: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
      value: analyticsData?.totalOrders !== undefined ? analyticsData.totalOrders : (data?.collectionCounts?.["orders"] || 0),
      label: "Orders",
      subtext: "Total orders placed",
      visible: isAdmin || permissions?.collections?.orders?.read === true,
    },
    {
      id: "customers",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
      value: data?.collectionCounts?.["customers"] || 0,
      label: "Customers",
      subtext: "Registered shoppers",
      visible: isAdmin || permissions?.collections?.customers?.read === true || permissions?.collections?.users?.read === true,
    },
    {
      id: "reviews",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
      gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
      value: data?.collectionCounts?.["reviews"] || 0,
      label: "Reviews",
      subtext: "Customer feedback",
      visible: isAdmin || permissions?.collections?.reviews?.read === true,
    },
  ].filter((c) => c.visible);

  // Dynamically extract top active custom collections permitted for user
  const activeCustomCollections = data?.collectionCounts
    ? Object.entries(data.collectionCounts)
      .filter(([slug, count]) => count > 0 && !["users", "audit_logs", "media"].includes(slug))
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

  const baseCmsCards = [
    {
      id: "documents",
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      value: data?.totalDocuments || 0,
      label: "Documents",
      subtext: `Across ${data?.collections || 0} collection${data?.collections !== 1 ? "s" : ""}`,
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
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--kyro-surface-accent)", borderColor: "var(--kyro-border)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 border-b flex items-center justify-between"
        style={{ borderColor: "var(--kyro-border)" }}
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--kyro-text-primary)" }}>
            {isEcommerce ? "Commerce Overview" : "Metrics"}
          </h2>
          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--kyro-text-secondary)" }}>
            Real-time content, performance & system health
          </p>
        </div>
        {data && (
          <span className="text-[10px] font-mono px-2 py-1 rounded-lg" style={{ background: "var(--kyro-bg-secondary)", color: "var(--kyro-text-muted)" }}>
            {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-6">
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
