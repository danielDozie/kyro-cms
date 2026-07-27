import React, { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { adminPath, apiPath } from "../lib/paths";
import { DashboardQuickSections } from "./DashboardQuickSections";

interface ContentDoc {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  _status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface AuthorDashboardProps {
  collections: Record<string, any>;
  userName?: string;
  userAvatar?: string;
  userId?: string;
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
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-[var(--kyro-bg-secondary)]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 rounded bg-[var(--kyro-bg-secondary)]" />
        <div className="h-2 w-24 rounded bg-[var(--kyro-bg-secondary)]" />
      </div>
      <div className="h-5 w-16 rounded bg-[var(--kyro-bg-secondary)]" />
    </div>
  );
}

export function AuthorDashboard({ collections, userName, userAvatar }: AuthorDashboardProps) {
  const [recentDocs, setRecentDocs] = useState<(ContentDoc & { _collection: string })[]>([]);
  const [docCounts, setDocCounts] = useState<{ total: number; drafts: number; published: number }>({
    total: 0,
    drafts: 0,
    published: 0,
  });
  const [mediaCount, setMediaCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const displayName = userName || "Author";
  const firstName = displayName.split(" ")[0];

  const contentCollections = Object.entries(collections).filter(
    ([slug]) => !["users", "audit_logs", "media", "orders", "customers"].includes(slug)
  );

  const creatableCollections = contentCollections.slice(0, 4);

  useEffect(() => {
    const fetches: Promise<any>[] = [];
    const allDocs: (ContentDoc & { _collection: string })[] = [];

    for (const [slug] of contentCollections.slice(0, 6)) {
      fetches.push(
        apiGet<any>(`${apiPath}/${slug}?limit=3&sort=-updatedAt`, { autoToast: false })
          .then((res) => {
            const docs = (res.docs || []).map((d: ContentDoc) => ({ ...d, _collection: slug }));
            allDocs.push(...docs);
          })
          .catch(() => { })
      );
    }

    fetches.push(
      apiGet<any>(`${apiPath}/media?limit=0`, { autoToast: false })
        .then((res) => setMediaCount(res.totalDocs || 0))
        .catch(() => { })
    );

    Promise.all(fetches)
      .then(() => {
        allDocs.sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setRecentDocs(allDocs.slice(0, 8));
        setDocCounts({
          total: allDocs.length,
          drafts: allDocs.filter((d) => (d._status || d.status || "").toLowerCase() === "draft").length,
          published: allDocs.filter((d) => (d._status || d.status || "").toLowerCase() === "published").length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="surface-tile p-6 rounded-xl border border-[var(--kyro-border)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
            {userAvatar ? (
              <img src={userAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-[var(--kyro-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--kyro-text-primary)]">Welcome back, {firstName}</h1>
            <p className="text-xs text-[var(--kyro-text-secondary)] mt-0.5">Author workspace and recent drafts</p>
          </div>
        </div>
        {creatableCollections.length > 0 && (
          <a
            href={`${adminPath}/${creatableCollections[0][0]}/new`}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-sidebar-active)] text-xs font-semibold text-[var(--kyro-sidebar-text-active)] hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
            </svg>
            New Document
          </a>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
              <p className="text-xs font-medium text-[var(--kyro-text-secondary)] mb-1">Total Items</p>
              <p className="text-2xl font-bold tracking-tight text-[var(--kyro-text-primary)]">{docCounts.total}</p>
            </div>

            <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
              <p className="text-xs font-medium text-[var(--kyro-text-secondary)] mb-1">Published</p>
              <p className="text-2xl font-bold tracking-tight text-[var(--kyro-text-primary)]">{docCounts.published}</p>
            </div>

            <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
              <p className="text-xs font-medium text-[var(--kyro-text-secondary)] mb-1">Drafts</p>
              <p className="text-2xl font-bold tracking-tight text-[var(--kyro-text-primary)]">{docCounts.drafts}</p>
            </div>

            <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
              <p className="text-xs font-medium text-[var(--kyro-text-secondary)] mb-1">Media Assets</p>
              <p className="text-2xl font-bold tracking-tight text-[var(--kyro-text-primary)]">{mediaCount}</p>
            </div>
          </>
        )}
      </div>

      {/* Recent Content */}
      <div className="surface-tile rounded-lg border border-[var(--kyro-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--kyro-border)]">
          <h2 className="text-sm font-semibold text-[var(--kyro-text-primary)]">Recent Documents</h2>
          <p className="text-xs text-[var(--kyro-text-secondary)] mt-0.5">Your recently edited content</p>
        </div>

        {loading ? (
          <div className="divide-y divide-[var(--kyro-border)]">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="py-10 text-center text-xs text-[var(--kyro-text-muted)]">No content created yet</div>
        ) : (
          <div className="divide-y divide-[var(--kyro-border)]">
            {recentDocs.map((doc) => {
              const docStatus = (doc._status || doc.status || "draft").toLowerCase();
              const title = doc.title || doc.name || "Untitled";

              return (
                <a
                  key={`${doc._collection}-${doc.id}`}
                  href={`${adminPath}/${doc._collection}/${doc.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-[var(--kyro-surface-accent)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] flex items-center justify-center text-[var(--kyro-text-secondary)] flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--kyro-text-primary)] truncate">{title}</p>
                      <p className="text-[10px] text-[var(--kyro-text-muted)] capitalize">
                        {doc._collection} • {doc.updatedAt ? timeAgo(doc.updatedAt) : "—"}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] capitalize">
                    {docStatus}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* RBAC Quick Actions & Explore Content */}
      <DashboardQuickSections collections={collections} serverUserRole="author" />
    </div>
  );
}
