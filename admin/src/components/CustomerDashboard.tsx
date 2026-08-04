import React, { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { adminPath, apiPath } from "../lib/paths";
import { DashboardQuickSections } from "./DashboardQuickSections";

interface OrderDoc {
  id: string;
  status?: string;
  total?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface CustomerDashboardProps {
  collections: Record<string, any>;
  userName?: string;
  userAvatar?: string;
  userId?: string;
}

function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function SkeletonCard() {
  return (
    <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden animate-pulse">
      <div className="h-3 w-20 rounded bg-[var(--kyro-bg-secondary)] mb-3" />
      <div className="h-6 w-16 rounded bg-[var(--kyro-bg-secondary)] mb-1" />
      <div className="h-3 w-24 rounded bg-[var(--kyro-bg-secondary)]" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-[var(--kyro-bg-secondary)]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded bg-[var(--kyro-bg-secondary)]" />
        <div className="h-2 w-20 rounded bg-[var(--kyro-bg-secondary)]" />
      </div>
      <div className="h-5 w-16 rounded bg-[var(--kyro-bg-secondary)]" />
    </div>
  );
}

export function CustomerDashboard({ collections, userName, userAvatar }: CustomerDashboardProps) {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const hasOrders = !!collections["orders"];
  const displayName = userName || "User";
  const firstName = displayName.split(" ")[0];

  useEffect(() => {
    if (hasOrders) {
      apiGet<any>(`${apiPath}/orders?limit=5&sort=-createdAt`, { autoToast: false })
        .then((res) => {
          setOrders(res.docs || []);
          setOrderCount(res.totalDocs || 0);
        })
        .catch(() => {
          setOrders([]);
          setOrderCount(0);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [hasOrders]);

  const totalSpent = orders.reduce((sum, o) => sum + (typeof o.total === "number" ? o.total : 0), 0);
  const pendingOrders = orders.filter((o) => ["pending", "processing"].includes((o.status || "").toLowerCase())).length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="surface-tile rounded-lg border border-[var(--kyro-border)] flex items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
            {userAvatar ? (
              <img src={userAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-[var(--kyro-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--kyro-text-primary)]">Welcome back, {firstName}</h1>
            <p className="text-xs text-[var(--kyro-text-secondary)] mt-0.5">Account overview and recent activity</p>
          </div>
        </div>
        <a
          href={`${adminPath}/profile`}
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-xs font-medium text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface)] transition-colors"
        >
          My Profile
        </a>
      </div>

      {/* Stats Grid */}
      {hasOrders && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
                <p className="text-xs font-medium text-[var(--kyro-text-secondary)] mb-1">Total Orders</p>
                <p className="text-2xl font-bold tracking-tight text-[var(--kyro-text-primary)]">{orderCount}</p>
              </div>

              <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
                <p className="text-xs font-medium text-[var(--kyro-text-secondary)] mb-1">Total Spent</p>
                <p className="text-2xl font-bold tracking-tight text-[var(--kyro-text-primary)]">{formatCurrency(totalSpent)}</p>
              </div>

              <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
                <p className="text-xs font-medium text-[var(--kyro-text-secondary)] mb-1">Pending Orders</p>
                <p className="text-2xl font-bold tracking-tight text-[var(--kyro-text-primary)]">{pendingOrders}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Recent Orders */}
      {hasOrders && (
        <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--kyro-border)]">
            <div>
              <h2 className="text-sm font-semibold text-[var(--kyro-text-primary)]">Recent Orders</h2>
              <p className="text-xs text-[var(--kyro-text-secondary)] mt-0.5">Latest order history</p>
            </div>
            <a
              href={`${adminPath}/orders`}
              className="text-xs font-medium text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
            >
              View All →
            </a>
          </div>

          {loading ? (
            <div className="divide-y divide-[var(--kyro-border)]">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--kyro-text-muted)]">No orders found</div>
          ) : (
            <div className="divide-y divide-[var(--kyro-border)]">
              {orders.map((order) => (
                <a
                  key={order.id}
                  href={`${adminPath}/orders/${order.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-[var(--kyro-surface-accent)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] flex items-center justify-center text-[var(--kyro-text-secondary)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--kyro-text-primary)]">Order #{order.id?.slice(-6) || order.id}</p>
                      <p className="text-[10px] text-[var(--kyro-text-muted)]">{order.createdAt ? timeAgo(order.createdAt) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {typeof order.total === "number" && (
                      <span className="text-xs font-semibold text-[var(--kyro-text-primary)]">{formatCurrency(order.total)}</span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] capitalize">
                      {order.status || "pending"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RBAC Quick Actions & Explore Content */}
      <DashboardQuickSections collections={collections} serverUserRole="customer" />
    </div>
  );
}
