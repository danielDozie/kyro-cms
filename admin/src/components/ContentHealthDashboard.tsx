import "../lib/i18n";
import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Shield,
  Zap,
  Globe,
  Sparkles,
  ExternalLink,
  FileText,
  Image,
  FolderTree,
  Box,
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
  collectionScores?: Record<string, { score: number; docCount: number; issueCount: number }>;
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
    <div className="relative overflow-hidden rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface)] p-5 flex flex-col gap-3 hover:border-[var(--kyro-border-hover,var(--kyro-border))] transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
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
            {sub && <p className="text-[11px] text-[var(--kyro-text-muted)] mt-1">{sub}</p>}
          </div>
          <p className="text-xs font-medium text-[var(--kyro-text-secondary)] uppercase tracking-wider">
            {label}
          </p>
        </>
      )}
    </div>
  );
}

interface CategoryHealthRowProps {
  name: string;
  description: string;
  score: number;
  issueCount: number;
  icon: React.ReactNode;
  loading?: boolean;
}

function CategoryHealthRow({ name, description, score, issueCount, icon, loading }: CategoryHealthRowProps) {
  const isHealthy = issueCount === 0;
  return (
    <div className="flex items-center gap-4 py-3.5 px-4 rounded-lg hover:bg-[var(--kyro-surface-accent)] transition-colors group my-4">
      <div className="w-9 h-9 rounded-lg bg-[var(--kyro-surface-accent)] group-hover:bg-[var(--kyro-surface)] flex items-center justify-center text-[var(--kyro-text-secondary)] transition-colors flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--kyro-text-primary)]">{name}</p>
          <span className="text-[10px] font-bold text-[var(--kyro-text-muted)] font-mono">
            {score}% score
          </span>
        </div>
        <p className="text-xs text-[var(--kyro-text-muted)] truncate">{description}</p>
      </div>
      {loading ? (
        <Shimmer variant="text" className="w-16" />
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={isHealthy ? "success" : issueCount > 2 ? "danger" : "warning"} dot>
            {isHealthy ? "Optimal" : `${issueCount} issues`}
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
  const [filterType, setFilterType] = useState<string>("all");
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
  const filteredIssues = issues.filter((issue) => {
    if (filterType === "all") return true;
    return issue.type === filterType;
  });

  const seoIssues = issues.filter((i) => i.type === "seo").length;
  const a11yIssues = issues.filter((i) => i.type === "accessibility").length;
  const valIssues = issues.filter((i) => i.type === "validation").length;
  const linkIssues = issues.filter((i) => i.type === "link" || i.type === "orphaned").length;

  const seoScore = totalDocs > 0 ? Math.max(0, Math.round(100 - (seoIssues / totalDocs) * 100)) : 100;
  const a11yScore = totalDocs > 0 ? Math.max(0, Math.round(100 - (a11yIssues / totalDocs) * 100)) : 100;
  const valScore = totalDocs > 0 ? Math.max(0, Math.round(100 - (valIssues / totalDocs) * 100)) : 100;
  const linkScore = totalDocs > 0 ? Math.max(0, Math.round(100 - (linkIssues / totalDocs) * 100)) : 100;

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title={t("tooltips.contentHealth", { defaultValue: "Content Health" })}
        description="Real-time SEO, accessibility, and schema quality diagnostics across all collections"
        actions={
          <button
            onClick={runAudit}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--kyro-surface-accent)] hover:bg-[var(--kyro-border)] border border-[var(--kyro-border)] text-sm font-medium text-[var(--kyro-text-primary)] transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="space-y-6">
        {/* Overall Status Banner */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-6 flex items-center gap-5 ${loading
            ? "border-[var(--kyro-border)] bg-[var(--kyro-surface)]"
            : isOptimal
              ? "border-emerald-500/20 bg-[var(--kyro-surface)]"
              : "border-amber-500/20 bg-[var(--kyro-surface)]"
            }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${loading
              ? "bg-[var(--kyro-surface-accent)]"
              : isOptimal
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-amber-500/10 text-amber-500"
              }`}
          >
            {loading ? (
              <Activity className="w-6 h-6 text-[var(--kyro-text-muted)]" />
            ) : isOptimal ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="space-y-2">
                <Shimmer variant="text" className="w-40" />
                <Shimmer variant="text" className="w-64" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-[var(--kyro-text-primary)] tracking-tight">
                    {totalDocs === 0
                      ? "No Documents Available"
                      : isOptimal
                        ? "Content Quality is High"
                        : "Actionable Gaps Detected"}
                  </h2>
                  <Badge variant={totalDocs === 0 ? "default" : isOptimal ? "success" : "warning"} dot>
                    {totalDocs === 0 ? "Empty Repository" : isOptimal ? "Optimal Quality" : "Needs Review"}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--kyro-text-secondary)] mt-1">
                  {totalDocs === 0
                    ? "Create documents in your collections to run automated content quality audits."
                    : isOptimal
                      ? `Overall repository quality score is ${score}%. ${totalDocs - issues.length} of ${totalDocs} documents comply with SEO and accessibility standards.`
                      : `${issues.length} issue${issues.length === 1 ? "" : "s"} detected across published or draft documents (missing SEO tags, image alt texts, or required fields).`}
                </p>
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
            icon={<Zap className="w-5 h-5" />}
            color="bg-emerald-500/10 text-emerald-500"
            label="Quality Score"
            value={loading ? "—" : `${score}%`}
            sub="aggregate compliance"
            loading={loading}
          />
          <StatCard
            icon={<Box className="w-5 h-5" />}
            color="bg-blue-500/10 text-blue-500"
            label="Scanned Docs"
            value={loading ? "—" : totalDocs}
            sub="across all collections"
            loading={loading}
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-amber-500/10 text-amber-500"
            label="Active Issues"
            value={loading ? "—" : issues.length}
            sub="actionable improvements"
            loading={loading}
          />
          <StatCard
            icon={<Shield className="w-5 h-5" />}
            color="bg-violet-500/10 text-violet-500"
            label="Perfect Docs"
            value={loading ? "—" : Math.max(0, totalDocs - issues.length)}
            sub="100% compliant"
            loading={loading}
          />
        </div>

        {/* Two-Column Detail Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Card: Category Diagnostics */}
          <div className="rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--kyro-border)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--kyro-text-primary)]">
                Category Diagnostics
              </h3>
            </div>
            <div className="p-2 divide-y divide-[var(--kyro-border)]">
              <CategoryHealthRow
                name="SEO & Metadata"
                description="Meta titles, descriptions, and OpenGraph social preview tags"
                score={seoScore}
                issueCount={seoIssues}
                icon={<Globe className="w-4 h-4" />}
                loading={loading}
              />
              <CategoryHealthRow
                name="Image Accessibility"
                description="Descriptive alt-texts and accessibility labels on media assets"
                score={a11yScore}
                issueCount={a11yIssues}
                icon={<Image className="w-4 h-4" />}
                loading={loading}
              />
              <CategoryHealthRow
                name="Schema Validation"
                description="Required fields, data type constraints, and relationships"
                score={valScore}
                issueCount={valIssues}
                icon={<FolderTree className="w-4 h-4" />}
                loading={loading}
              />
              <CategoryHealthRow
                name="Dead Link Detection"
                description="External hyperlinks and internal document cross-references"
                score={linkScore}
                issueCount={linkIssues}
                icon={<FileText className="w-4 h-4" />}
                loading={loading}
              />
            </div>
          </div>

          {/* Right Card: Issue Feed & Actionable Fixes */}
          <div className="rounded-2xl border border-[var(--kyro-border)] bg-[var(--kyro-surface)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--kyro-border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--kyro-text-secondary)]" />
                <h3 className="text-sm font-semibold text-[var(--kyro-text-primary)]">
                  Actionable Issues Feed
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {["all", "seo", "accessibility", "validation"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${filterType === type
                      ? "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)]"
                      : "text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)]"
                      }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="p-8 space-y-3">
                  <Shimmer variant="card" />
                  <Shimmer variant="card" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-[var(--kyro-text-primary)]">
                    No issues found in this category
                  </p>
                  <p className="text-[11px] text-[var(--kyro-text-muted)]">
                    All scanned documents pass quality standards.
                  </p>
                </div>
              ) : (
                filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-lg bg-[var(--kyro-surface-accent)]/50 border border-[var(--kyro-border)] flex items-start justify-between gap-3 hover:border-[var(--kyro-border-hover,var(--kyro-border))] transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${issue.severity === "critical"
                            ? "bg-rose-500/10 text-rose-500"
                            : issue.severity === "warning"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-blue-500/10 text-blue-500"
                            }`}
                        >
                          {issue.type}
                        </span>
                        <p className="text-xs font-semibold text-[var(--kyro-text-primary)] truncate">
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
                        <div className="flex items-center gap-1 text-[10.5px] text-emerald-600 dark:text-emerald-400 mt-1">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span>{issue.recommendation}</span>
                        </div>
                      )}
                    </div>

                    <a
                      href={`${adminPath}/${issue.collection}/${issue.documentId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--kyro-border)] text-xs font-semibold text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface)] transition-all shrink-0 cursor-pointer"
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
