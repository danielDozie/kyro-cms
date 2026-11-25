import { CustomSelect } from "./ui/CustomSelect";
import "../styles/health-workspace.css";
import "../lib/i18n";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCcw,
  ExternalLink,
  Image,
} from "./ui/icons";
import { PageHeader } from "./ui/PageHeader";
import { Badge } from "./ui/Badge";
import { Shimmer } from "./ui/Shimmer";
import { adminPath } from "../lib/paths";
import { apiGet } from "../lib/api";
import { useTranslation } from "react-i18next";

interface IssueItem {
  id: string;
  type: "seo" | "accessibility" | "link" | "validation" | "orphaned";
  severity: "critical" | "warning" | "info";
  collection: string;
  documentId: string;
  documentTitle?: string;
  field?: string;
  message: string;
  recommendation?: string;
}

interface CollectionHealthScore {
  slug: string;
  label: string;
  score: number;
  docCount: number;
  issueCount: number;
  hasDocs: boolean;
}

interface ContentHealthReport {
  score: number;
  totalDocuments: number;
  healthyDocuments: number;
  issuesCount: {
    critical: number;
    warning: number;
    info: number;
  };
  issues: IssueItem[];
  collectionScores?: Record<string, CollectionHealthScore>;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}

function StatCard({ label, value, sub, loading }: StatCardProps) {
  return (
    <div className="health-stat relative overflow-hidden rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)] p-3 flex flex-col gap-3 hover:border-[var(--kyro-border-hover,var(--kyro-border))] transition-colors">
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
            {sub && <p className="text-[11px] text-[var(--kyro-text-muted)] mt-1">{sub}</p>}
          </div>
          <p className="text-xs font-medium text-[var(--kyro-text-secondary)] tracking-normal">
            {label}
          </p>
        </>
      )}
    </div>
  );
}

interface CategoryHealthRowProps {
  name: string;
  score: number;
  issueCount: number;
  loading?: boolean;
}

function CategoryHealthRow({ name, score, issueCount, loading }: CategoryHealthRowProps) {
  const isHealthy = issueCount === 0;
  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-[var(--kyro-surface-accent)] transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--kyro-text-primary)]">{name}</p>
          <span className="text-[10px] font-medium text-[var(--kyro-text-muted)] font-mono">
            {score}%
          </span>
        </div>
      </div>
      {loading ? (
        <Shimmer variant="text" className="w-16" />
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={isHealthy ? "success" : issueCount > 2 ? "danger" : "warning"} dot>
            {isHealthy ? "Optimal" : `${issueCount} issue${issueCount === 1 ? "" : "s"}`}
          </Badge>
        </div>
      )}
    </div>
  );
}

export function ContentHealthDashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(100);
  const [totalDocs, setTotalDocs] = useState(0);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [collectionScores, setCollectionScores] = useState<Record<string, CollectionHealthScore>>({});
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCollection, setFilterCollection] = useState<string>("all");
  const [diagnosticsView, setDiagnosticsView] = useState<"categories" | "collections">("categories");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const runAudit = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const data = await apiGet<ContentHealthReport>("/api/content-health");
      setScore(typeof data.score === "number" ? data.score : 100);
      setTotalDocs(typeof data.totalDocuments === "number" ? data.totalDocuments : 0);
      setIssues(Array.isArray(data.issues) ? data.issues : []);
      setCollectionScores(data.collectionScores || {});
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("Audit error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  const isOptimal = score >= 90;

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchType = filterType === "all" || issue.type === filterType;
      const matchCol = filterCollection === "all" || issue.collection === filterCollection;
      return matchType && matchCol;
    });
  }, [issues, filterType, filterCollection]);

  const seoIssues = issues.filter((i) => i.type === "seo").length;
  const a11yIssues = issues.filter((i) => i.type === "accessibility").length;
  const valIssues = issues.filter((i) => i.type === "validation").length;
  const linkIssues = issues.filter((i) => i.type === "link" || i.type === "orphaned").length;

  const seoScore = totalDocs > 0 ? Math.max(0, Math.round(100 - (seoIssues / totalDocs) * 100)) : 100;
  const a11yScore = totalDocs > 0 ? Math.max(0, Math.round(100 - (a11yIssues / totalDocs) * 100)) : 100;
  const valScore = totalDocs > 0 ? Math.max(0, Math.round(100 - (valIssues / totalDocs) * 100)) : 100;
  const linkScore = totalDocs > 0 ? Math.max(0, Math.round(100 - (linkIssues / totalDocs) * 100)) : 100;

  const collectionList = Object.values(collectionScores);

  return (
    <div className="health-workspace">
      <PageHeader
        title={t("tooltips.contentHealth", { defaultValue: "Content Health" })}
        actions={
          <button
            onClick={runAudit}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-border)] border border-[var(--kyro-border)] text-sm font-medium text-[var(--kyro-text-primary)] transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="space-y-4">
        {/* Overall Status Banner */}
        <div
          className={`relative overflow-hidden rounded-lg border p-4 flex items-center gap-3 ${loading
            ? "border-[var(--kyro-border)] bg-[var(--kyro-surface)]"
            : totalDocs === 0
              ? "border-blue-500/20 bg-[var(--kyro-surface)]"
              : isOptimal
                ? "border-emerald-500/20 bg-[var(--kyro-surface)]"
                : "border-amber-500/20 bg-[var(--kyro-surface)]"
            }`}
        >
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-2">
                <Shimmer variant="text" className="w-40" />
                <Shimmer variant="text" className="w-64" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-medium text-[var(--kyro-text-primary)] tracking-tight">
                    {totalDocs === 0
                      ? "No content yet"
                      : isOptimal
                        ? "Content checks passed"
                        : "Content needs attention"}
                  </h2>
                  <Badge
                    variant={totalDocs === 0 ? "default" : isOptimal ? "success" : "warning"}
                    dot
                  >
                    {totalDocs === 0
                      ? "No Documents"
                      : isOptimal
                        ? "Optimal Quality"
                        : "Needs Review"}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--kyro-text-muted)] mt-2">
                  Last audited: {lastRefreshed.toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
        </div>

        {/* 4-Stat Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard


            label="Quality Score"
            value={loading ? "—" : totalDocs === 0 ? "N/A" : `${score}%`}
            sub={totalDocs === 0 ? "no documents yet" : "aggregate compliance"}
            loading={loading}
          />
          <StatCard


            label="Scanned Docs"
            value={loading ? "—" : totalDocs}
            sub={`across ${collectionList.length || 0} collections`}
            loading={loading}
          />
          <StatCard


            label="Active Issues"
            value={loading ? "—" : issues.length}
            sub="actionable improvements"
            loading={loading}
          />
          <StatCard


            label="Perfect Docs"
            value={loading ? "—" : Math.max(0, totalDocs - issues.length)}
            sub="100% compliant"
            loading={loading}
          />
        </div>

        {/* Two-Column Diagnostics & Issues Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Card: Category & Collection Diagnostics */}
          <div className="rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--kyro-border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">

                <h3 className="text-sm font-medium text-[var(--kyro-text-primary)]">
                  Diagnostics
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-[var(--kyro-surface-accent)]/50 p-0.5 rounded-lg border border-[var(--kyro-border)]/50">
                <button
                  type="button"
                  onClick={() => setDiagnosticsView("categories")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${diagnosticsView === "categories"
                    ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] "
                    : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                    }`}
                >
                  Categories
                </button>
                <button
                  type="button"
                  onClick={() => setDiagnosticsView("collections")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${diagnosticsView === "collections"
                    ? "bg-[var(--kyro-surface)] text-[var(--kyro-text-primary)] "
                    : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                    }`}
                >
                  Collections ({collectionList.length})
                </button>
              </div>
            </div>

            <div className="p-3 divide-y divide-[var(--kyro-border)] flex-1 overflow-y-auto space-y-1">
              {diagnosticsView === "categories" ? (
                <>
                  <CategoryHealthRow
                    name="SEO & Metadata"

                    score={seoScore}
                    issueCount={seoIssues}

                    loading={loading}
                  />
                  <CategoryHealthRow
                    name="Image Accessibility"

                    score={a11yScore}
                    issueCount={a11yIssues}

                    loading={loading}
                  />
                  <CategoryHealthRow
                    name="Schema Validation"

                    score={valScore}
                    issueCount={valIssues}

                    loading={loading}
                  />
                  <CategoryHealthRow
                    name="Link & URL Integrity"

                    score={linkScore}
                    issueCount={linkIssues}

                    loading={loading}
                  />
                </>
              ) : (
                collectionList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--kyro-text-muted)]">
                    No active collections found in config.
                  </div>
                ) : (
                  collectionList.map((col) => (
                    <div
                      key={col.slug}
                      className="flex items-center justify-between py-3 px-3.5 rounded-lg hover:bg-[var(--kyro-surface-accent)] transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[var(--kyro-text-primary)] truncate">
                              {col.label}
                            </p>
                            <span className="text-[10px] font-medium text-[var(--kyro-text-muted)] font-mono">
                              {col.hasDocs ? `${col.score}%` : "0 docs"}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--kyro-text-muted)]">
                            {col.docCount} document{col.docCount === 1 ? "" : "s"} • {col.issueCount} issue{col.issueCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant={!col.hasDocs ? "default" : col.issueCount === 0 ? "success" : "warning"}
                          dot
                        >
                          {!col.hasDocs ? "Empty" : col.issueCount === 0 ? "Optimal" : `${col.issueCount} issues`}
                        </Badge>
                        <a
                          href={`${adminPath}/${col.slug}`}
                          className="p-1.5 rounded-lg text-[var(--kyro-text-muted)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface)] transition-all"
                          title={`View ${col.label} documents`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>

          {/* Right Card: Issue Feed & Actionable Fixes */}
          <div className="rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden flex flex-col max-h-[600px]">
            <div className="px-4 py-3 border-b border-[var(--kyro-border)] flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">

                  <h3 className="text-sm font-medium text-[var(--kyro-text-primary)]">
                    Issues ({filteredIssues.length})
                  </h3>
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["all", "seo", "accessibility", "validation", "link"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-all cursor-pointer ${filterType === type
                      ? "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] border border-[var(--kyro-border)]"
                      : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                      }`}
                  >
                    {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}

                {collectionList.length > 0 && (
                  <CustomSelect
                    value={filterCollection}
                    onChange={(e) => setFilterCollection(e.target.value)}
                    className="ml-auto text-[10.5px] font-medium bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] border border-[var(--kyro-border)] rounded-md px-2 py-0.5 outline-none cursor-pointer"
                  >
                    <option value="all">All Collections</option>
                    {collectionList.map((col) => (
                      <option key={col.slug} value={col.slug}>
                        {col.label}
                      </option>
                    ))}
                  </CustomSelect>
                )}
              </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="p-8 space-y-3">
                  <Shimmer variant="card" />
                  <Shimmer variant="card" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="py-16 text-center space-y-2">

                  <p className="text-sm font-medium text-[var(--kyro-text-primary)]">
                    No issues found
                  </p>
                  <p className="text-xs text-[var(--kyro-text-muted)] max-w-xs mx-auto">
                    {totalDocs === 0
                      ? "Create documents in your collections to run automated audits."
                      : "No issues match the selected category."}
                  </p>
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-lg bg-[var(--kyro-surface-accent)]/50 border border-[var(--kyro-border)] flex items-start justify-between gap-3 hover:border-[var(--kyro-border-hover,var(--kyro-border))] transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[11px] font-medium tracking-normal px-1.5 py-0.5 rounded ${issue.severity === "critical"
                            ? "bg-rose-500/10 text-rose-500"
                            : issue.severity === "warning"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-blue-500/10 text-blue-500"
                            }`}
                        >
                          {issue.type}
                        </span>
                        <p className="text-xs font-medium text-[var(--kyro-text-primary)] truncate">
                          {issue.message}
                        </p>
                      </div>
                      <p className="text-[11px] text-[var(--kyro-text-secondary)]">
                        <span className="font-mono text-[var(--kyro-text-primary)]">{issue.collection}</span> /{" "}
                        <span className="font-medium text-[var(--kyro-text-primary)]">
                          {issue.documentTitle || issue.documentId}
                        </span>
                      </p>
                      {issue.recommendation && (
                        <details className="health-issue-advice">
                          <summary>Suggested fix</summary>
                          <p>{issue.recommendation}</p>
                        </details>
                      )}
                    </div>

                    <a
                      href={`${adminPath}/${issue.collection}/${issue.documentId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--kyro-border)] text-xs font-medium text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface)] transition-all shrink-0 cursor-pointer"
                    >
                      <span>Fix</span>
                      <ExternalLink className="w-3 h-3 text-[var(--kyro-text-muted)]" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
