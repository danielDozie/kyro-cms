import "../lib/i18n";
import React, { useState, useEffect } from "react";
import { LayoutDashboard, FileText, Image as ImageIcon, Users, Plus, ArrowUpRight, Activity, Clock as ClockIcon, ArrowRight } from "./ui/icons";
import { useAuthStore } from "../lib/stores";
import { authCollectionSlugs } from "../lib/config";
import { PageHeader } from "./ui/PageHeader";
import { Shimmer } from "./ui/Shimmer";
import { useTranslation } from "react-i18next";


interface DashboardProps {
  collections: Record<string, unknown>;
  onNavigate: (view: string, collection?: string) => void;
  user: Record<string, unknown> | null;
}

export function Dashboard({ collections, onNavigate, user }: DashboardProps) {
  const { t } = useTranslation();
  const { permissions } = useAuthStore();
  const [stats, setStats] = useState<{
    totalDocs: number;
    totalMedia: number;
    totalUsers: number;
    recentActivity: Array<{ id: number; type: string; user: string; doc: string; collection: string; time: string }>;
  }>({
    totalDocs: 0,
    totalMedia: 0,
    totalUsers: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data fetching for high-fidelity look
    const timer = setTimeout(() => {
      setStats({
        totalDocs: 124,
        totalMedia: 856,
        totalUsers: 12,
        recentActivity: [
          {
            id: 1,
            type: "edit",
            user: "Daniel Dozie",
            doc: "Getting Started with Kyro",
            collection: "posts",
            time: "2m ago",
          },
          {
            id: 2,
            type: "create",
            user: "Jane Smith",
            doc: "New Product Launch",
            collection: "products",
            time: "15m ago",
          },
          {
            id: 3,
            type: "upload",
            user: "Daniel Dozie",
            doc: "hero-banner.jpg",
            collection: "media",
            time: "1h ago",
          },
          {
            id: 4,
            type: "publish",
            user: "System",
            doc: "Weekly Update",
            collection: "posts",
            time: "3h ago",
          },
        ],
      } as { totalDocs: number; totalMedia: number; totalUsers: number; recentActivity: Array<{ id: number; type: string; user: string; doc: string; collection: string; time: string }> });
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const collectionList = Object.entries(collections).filter(
    ([slug]) =>
      !authCollectionSlugs.includes(slug) &&
      permissions?.collections?.[slug]?.read !== false,
  );

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-8 pb-12">
      <PageHeader
        title={t("dashboard.welcome", { defaultValue: "Welcome back, {{name}}", name: (user?.email as string)?.split("@")[0] || "Admin" })}
        description={t("dashboard.description", { defaultValue: "Everything looks great in your command center today." })}
        action={collectionList.length > 0 && permissions?.collections?.[collectionList[0]?.[0]]?.create !== false ? {
          label: t("actions.newDocument", { defaultValue: "New Document" }),
          onClick: () => onNavigate("create", collectionList[0]?.[0]),
          icon: Plus,
        } : undefined}
      />


      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: t("dashboard.totalContent", { defaultValue: "Total Content" }),
            value: stats.totalDocs,
            icon: FileText,
            color: "text-blue-500",
          },
          {
            label: t("dashboard.mediaAssets", { defaultValue: "Media Assets" }),
            value: stats.totalMedia,
            icon: ImageIcon,
            color: "text-purple-500",
          },
          {
            label: t("dashboard.activeUsers", { defaultValue: "Active Users" }),
            value: stats.totalUsers,
            icon: Users,
            color: "text-green-500",
          },
          {
            label: t("dashboard.systemHealth", { defaultValue: "System Health" }),
            value: "100%",
            icon: Activity,
            color: "text-amber-500",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="surface-tile p-6 flex items-center justify-between rounded-lg group hover:border-[var(--kyro-primary)] transition-all duration-500 cursor-default"
          >
            <div>
              <p className="text-[10px] font-bold  tracking-[0.2em] opacity-40 mb-1">
                {stat.label}
              </p>
              <h3 className="text-3xl font-bold tracking-tighter">
                {loading ? <Shimmer variant="text" className="w-16" /> : stat.value}
              </h3>
            </div>
            <div
              className={`p-3 rounded-2xl bg-[var(--kyro-bg-secondary)] group-hover:scale-110 transition-transform duration-500 ${stat.color}`}
            >
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* Main Content Area: Collections & Insights */}
        <div className="space-y-8 min-w-0">
          <section className="surface-tile p-8">
            <h2 className="text-xl font-bold mb-1 tracking-tight flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 opacity-40" />
              {t("dashboard.contentGrowth", { defaultValue: "Content Growth" })}
            </h2>
            <p className="text-[10px] font-bold  tracking-widest opacity-40 mb-8">
              {t("dashboard.contentGrowthDesc", { defaultValue: "Snapshot of document velocity over the last 7 days" })}
            </p>

            {/* SVG Line Chart */}
            <div className="h-48 w-full relative mb-12">
              <svg
                className="w-full h-full"
                viewBox="0 0 1000 200"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="chartGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--kyro-primary)"
                      stopOpacity="0.3"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--kyro-primary)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M0,180 Q100,140 200,160 T400,100 T600,120 T800,40 T1000,60 L1000,200 L0,200 Z"
                  fill="url(#chartGradient)"
                  className="animate-pulse duration-[4s]"
                />
                <path
                  d="M0,180 Q100,140 200,160 T400,100 T600,120 T800,40 T1000,60"
                  fill="none"
                  stroke="var(--kyro-primary)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="filter drop-shadow-[0_0_8px_var(--kyro-primary)]"
                />
              </svg>
              <div className="flex justify-between mt-4 text-[10px] font-bold opacity-30 tracking-widest ">
                <span>{t("days.mon", { defaultValue: "Mon" })}</span>
                <span>{t("days.tue", { defaultValue: "Tue" })}</span>
                <span>{t("days.wed", { defaultValue: "Wed" })}</span>
                <span>{t("days.thu", { defaultValue: "Thu" })}</span>
                <span>{t("days.fri", { defaultValue: "Fri" })}</span>
                <span>{t("days.sat", { defaultValue: "Sat" })}</span>
                <span>{t("days.sun", { defaultValue: "Sun" })}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {collectionList.map(([slug, config]: [string, any]) => (
                <div
                  key={slug}
                  onClick={() => onNavigate("list", slug)}
                  className="p-6 rounded-2xl border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] bg-[var(--kyro-bg-secondary)] hover:bg-[var(--kyro-surface)] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg tracking-tight group-hover:text-[var(--kyro-primary)] transition-colors">
                      {(config.label as string) || slug}
                    </h3>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                  <div className="w-full h-1 bg-[var(--kyro-bg-secondary)] rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-[var(--kyro-primary)]"
                      style={{ width: `${Math.random() * 60 + 20}%` }}
                    />
                  </div>
                  <p className="text-sm text-[var(--kyro-text-secondary)] line-clamp-1">
                    {(config.admin as any)?.description || `Manage ${slug} content.`}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="surface-tile p-6 border border-[var(--kyro-border)] hover:border-[var(--kyro-primary)] transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold tracking-tight group-hover:text-[var(--kyro-primary)] transition-colors flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  {t("dashboard.quickLinks", { defaultValue: "Quick Links" })}
                </h3>
              </div>
              <div className="space-y-3">
                {collectionList
                  .filter(([slug]) => permissions?.collections?.[slug]?.create !== false)
                  .map(([slug]) => (
                    <button type="button"
                      key={slug}
                      onClick={() => onNavigate("new", slug)}
                      className="w-full flex items-center justify-between p-4 bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-xl hover:bg-[var(--kyro-surface-accent)] hover:border-[var(--kyro-primary)] transition-all group/btn"
                    >
                      <span className="text-sm font-medium text-[var(--kyro-text-primary)]">
                        {t("dashboard.newAction", { defaultValue: "New {{item}}", item: (collections[slug] as Record<string, unknown>)?.singularLabel || (collections[slug] as Record<string, unknown>)?.label || slug })}
                      </span>
                      <Plus className="w-4 h-4 text-[var(--kyro-text-secondary)] group-hover/btn:text-[var(--kyro-primary)]" />
                    </button>
                  ))}
                {collectionList.every(([slug]) => permissions?.collections?.[slug]?.create === false) && (
                  <p className="text-sm text-[var(--kyro-text-secondary)] py-2">{t("dashboard.noCollections", { defaultValue: "No collections available for creation." })}</p>
                )}
              </div>
            </section>

            <div className="surface-tile p-8 bg-[#0f172a] text-white border-none shadow-2xl shadow-blue-500/10 overflow-hidden relative group cursor-pointer">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold tracking-tighter mb-2">
                  {t("dashboard.mediaLibrary", { defaultValue: "Media Library" })}
                </h3>
                <p className="opacity-80 text-sm font-medium mb-6">
                  {t("dashboard.mediaLibraryDesc", { defaultValue: "Manage high-fidelity assets with our liquid masonry gallery." })}
                </p>
                <div className="flex items-center gap-2 font-bold text-xs  tracking-widest text-blue-400">
                  {t("dashboard.openAssets", { defaultValue: "Open Assets" })}{" "}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <ImageIcon className="absolute bottom-[-20px] right-[-20px] w-48 h-48 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
            </div>
          </section>
        </div>

        {/* Sidebar Area: Recent Activity */}
        <div className="space-y-6">
          <section className="surface-tile p-8">
            <h2 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-2">
              <ClockIcon className="w-5 h-5 opacity-40" />
              {t("dashboard.recentActivity", { defaultValue: "Recent Activity" })}
            </h2>
            <div className="space-y-6">
              {stats.recentActivity.map((act: any) => (
                <div key={act.id} className="flex gap-4 group">
                  <div className="mt-1">
                    <div className="w-8 h-8 rounded-full bg-[var(--kyro-bg-secondary)] flex items-center justify-center border border-[var(--kyro-border)] group-hover:bg-[var(--kyro-primary)] transition-colors">
                      <span className="text-[10px] font-bold">
                        {act.user[0]}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 border-b border-[var(--kyro-border)] pb-4 group-last:border-none">
                    <p className="text-sm font-medium text-[var(--kyro-text-primary)] leading-snug">
                      <span className="font-bold">{act.user}</span>{" "}
                      {act.type === "create"
                        ? "created"
                        : act.type === "edit"
                          ? "edited"
                          : act.type === "publish"
                            ? "published"
                            : "uploaded"}{" "}
                      <span className="text-[var(--kyro-primary)] italic">
                        "{act.doc}"
                      </span>{" "}
                      in <span className="opacity-60">{act.collection}</span>
                    </p>
                    <span className="text-[10px] font-bold  opacity-40 mt-1 block">
                      {act.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="w-full mt-6 py-3 text-xs font-bold  tracking-widest text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors border-t border-[var(--kyro-border)] pt-6">
              {t("dashboard.viewAuditLogs", { defaultValue: "View Audit Logs" })}
            </button>
          </section>

          <section className="surface-tile p-8">
            <h2 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 opacity-40" />
              {t("dashboard.systemStatus", { defaultValue: "System Status" })}
            </h2>
            <div className="space-y-4">
              {[
                {
                  label: t("dashboard.cloudApi", { defaultValue: "Cloud API" }),
                  status: t("dashboard.statusOptimal", { defaultValue: "Optimal" }),
                  pulse: "bg-green-500",
                },
                {
                  label: t("dashboard.dbNode", { defaultValue: "Database Node" }),
                  status: t("dashboard.statusHealthy", { defaultValue: "Healthy" }),
                  pulse: "bg-green-500",
                },
                { label: t("dashboard.mediaCdn", { defaultValue: "Media CDN" }), status: t("dashboard.statusActive", { defaultValue: "Active" }), pulse: "bg-blue-500" },
                {
                  label: t("dashboard.authService", { defaultValue: "Auth Service" }),
                  status: t("dashboard.statusSecure", { defaultValue: "Secure" }),
                  pulse: "bg-green-500",
                },
              ].map((sys, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-[var(--kyro-bg-secondary)] rounded-2xl border border-[var(--kyro-border)]"
                >
                  <span className="text-xs font-bold text-[var(--kyro-text-secondary)]">
                    {sys.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold  tracking-widest opacity-60">
                      {sys.status}
                    </span>
                    <div
                      className={`w-2 h-2 rounded-full ${sys.pulse} animate-pulse shadow-[0_0_8px] shadow-current`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
