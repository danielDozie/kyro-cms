import "../lib/i18n";
import { Search } from "./ui/icons";
import React, { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../lib/api";
import { Modal } from "./ui/Modal";
import { Shimmer } from "./ui/Shimmer";
import { useTranslation } from "react-i18next";

interface AuditLog {
  id: string;
  timestamp: string | Date;
  action: string;
  userId?: string;
  userEmail?: string;
  role?: string;
  resource: string;
  resourceId?: string;
  changes?: { field: string; old: unknown; new: unknown }[];
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface AuditLogsResponse {
  docs: AuditLog[];
  totalDocs: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_TYPES = [
  "login",
  "logout",
  "login_failed",
  "register",
  "password_change",
  "password_reset",
  "user_create",
  "user_update",
  "user_delete",
  "document_create",
  "document_update",
  "document_delete",
  "settings_change",
  "role_change",
];

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  login: {
    bg: "bg-green-500/10",
    text: "text-green-500",
  },
  logout: {
    bg: "bg-[var(--kyro-surface-accent)]",
    text: "text-[var(--kyro-text-secondary)]",
  },
  login_failed: {
    bg: "bg-red-500/10",
    text: "text-red-500",
  },
  register: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
  },
  password_change: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
  },
  password_reset: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
  },
  user_create: {
    bg: "bg-green-500/10",
    text: "text-green-500",
  },
  user_update: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
  },
  user_delete: {
    bg: "bg-red-500/10",
    text: "text-red-500",
  },
  document_create: {
    bg: "bg-green-500/10",
    text: "text-green-500",
  },
  document_update: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
  },
  document_delete: {
    bg: "bg-red-500/10",
    text: "text-red-500",
  },
  settings_change: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
  },
  role_change: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-500",
  },
};

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(ts: string | Date): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getInitials(email: string): string {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

function getAvatarColor(_email: string): string {
  return "bg-[var(--kyro-surface-accent)]";
}

function getActionStyle(action: string) {
  return (
    ACTION_COLORS[action] || {
      bg: "bg-[var(--kyro-surface-accent)]",
      text: "text-[var(--kyro-text-secondary)]",
    }
  );
}

function MetadataRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  const display =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <div className="flex items-start gap-3 py-2 px-4 border-b border-[var(--kyro-border)] last:border-0 bg-[var(--kyro-surface-accent)]">
      <span className="text-[10px] font-bold  tracking-wider text-[var(--kyro-text-muted)] w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-xs font-mono text-[var(--kyro-text-primary)] break-all">
        {display}
      </span>
    </div>
  );
}

export function AuditLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [successFilter, setSuccessFilter] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(limit),
        });
        if (search) params.set("userId", search);
        if (action) params.set("action", action);
        if (successFilter) params.set("success", successFilter);

        const res = await fetchWithAuth(`/api/auth/audit-logs?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data: AuditLogsResponse = await res.json();
        setLogs(data.docs);
        setTotal(data.totalDocs);
        setTotalPages(data.totalPages);
        setPage(pageNum);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [search, action, successFilter, limit],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [search, action, successFilter]);

  const stats = {
    total,
    successful: logs.filter((l) => l.success).length,
    failed: logs.filter((l) => !l.success).length,
    uniqueUsers: new Set(logs.map((l) => l.userEmail).filter(Boolean)).size,
  };

  return (
    <div className="flex-1 overflow-y-auto  space-y-6">
      {/* Header */}
      <div className="surface-tile p-6 flex items-center justify-between rounded-lg gap-8 rounded-lg">
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-[var(--kyro-text-primary)]">
            Audit Logs
          </h1>
          <p className="text-sm text-[var(--kyro-text-secondary)] mt-1 font-medium">
            Security audit trail
            <span className="ml-2 text-[var(--kyro-text-primary)] font-bold">
              · {total.toLocaleString()} entries
            </span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] border border-[var(--kyro-border)]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Filters */}
      <div className="surface-tile p-4 rounded-lg flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 rounded-lg">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder={t("fields.searchByUserEmail", { defaultValue: "Search by user email..." })}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-xl text-sm font-medium text-[var(--kyro-text-primary)] placeholder-[var(--kyro-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)] focus:border-transparent transition-all"
          />
        </div>

        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-xl text-sm font-bold text-[var(--kyro-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)] cursor-pointer"
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>
              {formatAction(a)}
            </option>
          ))}
        </select>

        <select
          value={successFilter}
          onChange={(e) => {
            setSuccessFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-[var(--kyro-bg-secondary)] border border-[var(--kyro-border)] rounded-xl text-sm font-bold text-[var(--kyro-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-primary)] cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="true">Successful</option>
          <option value="false">Failed</option>
        </select>

        {(search || action || successFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setAction("");
              setSuccessFilter("");
            }}
            className="px-4 py-2.5 text-sm font-bold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Stats Row */}
      {!loading && total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Events",
              value: total.toLocaleString(),
              color: "text-[var(--kyro-text-primary)]",
            },
            {
              label: "Successful",
              value: stats.successful,
              color: "text-green-500",
            },
            { label: "Failed", value: stats.failed, color: "text-red-500" },
            {
              label: "Unique Users",
              value: stats.uniqueUsers,
              color: "text-[var(--kyro-text-primary)]",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="surface-tile p-4 rounded-lg">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-[10px] font-bold text-[var(--kyro-text-secondary)] tracking-wider mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="surface-tile overflow-x-auto rounded-lg">
        {loading ? (
          <div className="space-y-2 p-4">
            <Shimmer variant="table-row" count={5} />
          </div>
        ) : logs.length === 0 ? (
          <div className="px-8 py-20 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--kyro-surface-accent)] flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--kyro-text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="font-medium text-[var(--kyro-text-primary)] text-base">
                No audit logs found
              </p>
              <p className="text-sm text-[var(--kyro-text-secondary)]">
                {search || action || successFilter
                  ? "Try adjusting your filters."
                  : "Logs will appear here as users interact with the system."}
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[var(--kyro-text-secondary)] font-bold text-[10px]  tracking-[0.2em] border-b border-[var(--kyro-border)] whitespace-nowrap">
                <th className="px-6 py-5 w-8"></th>
                <th className="px-6 py-5">Action</th>
                <th className="px-6 py-5">User</th>
                <th className="px-6 py-5">Resource</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--kyro-border)]">
              {logs.map((log) => {
                const style = getActionStyle(log.action);
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer hover:bg-[var(--kyro-surface-accent)] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`w-2 h-2 rounded-full block ${log.success ? "bg-green-500" : "bg-red-500"}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${style.bg} ${style.text}`}
                      >
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.userEmail ? (
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg ${getAvatarColor(log.userEmail)} text-[var(--kyro-text-primary)] text-[10px] font-bold flex items-center justify-center shrink-0`}
                          >
                            {getInitials(log.userEmail)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[var(--kyro-text-primary)] leading-none">
                              {log.userEmail.split("@")[0]}
                            </div>
                            {log.role && (
                              <div className="text-[10px] font-bold text-[var(--kyro-text-muted)] mt-0.5  tracking-wider">
                                {log.role}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--kyro-text-muted)]">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[var(--kyro-text-primary)]">
                        {log.resource}
                      </div>
                      {log.resourceId && (
                        <div className="text-[10px] font-mono text-[var(--kyro-text-muted)] mt-0.5">
                          {log.resourceId.slice(-8)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/10 text-green-500">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-500">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Fail
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[var(--kyro-text-secondary)] font-medium whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="surface-tile rounded-lg p-5 flex items-center justify-between">
          <p className="text-sm text-[var(--kyro-text-secondary)] font-medium">
            Page {page} of {totalPages}
            <span className="ml-2 text-[var(--kyro-text-muted)]">
              ({(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
              {total.toLocaleString()})
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${page <= 1
                ? "opacity-30 pointer-events-none text-[var(--kyro-text-muted)]"
                : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface)] border border-[var(--kyro-border)]"
                }`}
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => fetchLogs(p)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${p === page
                    ? "bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)]"
                    : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface)] border border-[var(--kyro-border)]"
                    }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${page >= totalPages
                ? "opacity-30 pointer-events-none text-[var(--kyro-text-muted)]"
                : "bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface)] border border-[var(--kyro-border)]"
                }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={t("tooltips.auditLogDetails", { defaultValue: "Audit Log Details" })}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-0">
            {/* Status banner */}
            <div
              className={`px-4 py-4 mb-6 rounded-lg flex items-center gap-3 ${selectedLog.success
                ? "bg-green-500/5 border-b border-green-500/10"
                : "bg-red-500/5 border-b border-red-500/10"
                }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedLog.success ? "bg-green-500" : "bg-red-500"}`}
              />
              <div>
                <div
                  className={`text-sm font-bold ${selectedLog.success ? "text-green-500" : "text-red-500"}`}
                >
                  {selectedLog.success ? "Successful" : "Failed"}
                </div>
                <div className="text-xs font-medium text-[var(--kyro-text-secondary)]">
                  {formatAction(selectedLog.action)} on {selectedLog.resource}
                </div>
              </div>
            </div>

            {/* Fields */}
            <MetadataRow label="Event ID" value={selectedLog.id} />
            <MetadataRow
              label="Timestamp"
              value={formatTimestamp(selectedLog.timestamp)}
            />
            <MetadataRow label="User Email" value={selectedLog.userEmail} />
            <MetadataRow label="User ID" value={selectedLog.userId} />
            <MetadataRow label="Role" value={selectedLog.role} />
            <MetadataRow label="Resource" value={selectedLog.resource} />
            <MetadataRow label="Resource ID" value={selectedLog.resourceId} />
            <MetadataRow label="IP Address" value={selectedLog.ipAddress} />

            {/* Error message */}
            {selectedLog.error && (
              <div className="mt-4 -mx-6 px-6 py-4 bg-red-500/5 border-y border-red-500/10">
                <div className="text-[10px] font-bold  tracking-wider text-red-400 mb-2">
                  Error
                </div>
                <div className="text-sm font-mono text-red-300">
                  {selectedLog.error}
                </div>
              </div>
            )}

            {/* Changes */}
            {selectedLog.changes && selectedLog.changes.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-bold  tracking-wider text-[var(--kyro-text-muted)] mb-3">
                  Changes ({selectedLog.changes.length})
                </div>
                <div className="rounded-xl border border-[var(--kyro-border)] overflow-hidden">
                  {selectedLog.changes.map((change, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 px-4 py-3 text-xs font-mono border-b border-[var(--kyro-border)] last:border-0 hover:bg-[var(--kyro-surface-accent)] transition-colors"
                    >
                      <span className="text-[10px] font-bold  tracking-wider text-[var(--kyro-text-muted)] w-24 shrink-0 pt-0.5">
                        {change.field}
                      </span>
                      <span className="text-red-400 line-through flex-1 truncate">
                        {change.old === undefined || change.old === null
                          ? "(empty)"
                          : JSON.stringify(change.old)}
                      </span>
                      <span className="text-[var(--kyro-text-muted)] shrink-0">
                        →
                      </span>
                      <span className="text-green-400 flex-1 truncate">
                        {change.new === undefined || change.new === null
                          ? "(empty)"
                          : JSON.stringify(change.new)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {selectedLog.metadata &&
              Object.keys(selectedLog.metadata).length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-bold  tracking-wider text-[var(--kyro-text-muted)] mb-3">
                    Metadata
                  </div>
                  <div className="border border-[var(--kyro-border)] overflow-hidden">
                    {Object.entries(selectedLog.metadata).map(
                      ([key, value], i) => (
                        <MetadataRow
                          key={key}
                          label={key.replace(/([A-Z])/g, " $1").trim()}
                          value={value as string}
                        />
                      ),
                    )}
                  </div>
                </div>
              )}

            {/* User Agent */}
            {selectedLog.userAgent && (
              <div className="mt-4">
                <div className="text-[10px] font-bold  tracking-wider text-[var(--kyro-text-muted)] mb-2">
                  User Agent
                </div>
                <div className="text-xs font-mono text-[var(--kyro-text-secondary)] bg-[var(--kyro-bg-secondary)] rounded-lg px-3 py-2 border border-[var(--kyro-border)]">
                  {selectedLog.userAgent}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
