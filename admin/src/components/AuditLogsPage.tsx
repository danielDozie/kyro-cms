import { CustomSelect } from "./ui/CustomSelect";
import "../styles/developer-workspace.css";
import "../lib/i18n";
import { Fragment, useState, useEffect } from "react";
import { fetchWithAuth } from "../lib/api";
import { Shimmer } from "./ui/Shimmer";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { PageHeader } from "./ui/PageHeader";
import { Pagination } from "./ui/Pagination";
import { SearchInput } from "./ui/SearchInput";

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
  "verify_email",
  "password_change",
  "password_reset",
  "password_reset_request",
  "user_lockout",
  "user_unlock",
  "user_create",
  "user_update",
  "user_delete",
  "document_create",
  "document_update",
  "document_delete",
  "settings_change",
  "role_change",
  "permission_change",
  "api_request",
  "api_key_create",
  "api_key_update",
  "api_key_rotate",
  "api_key_delete",
  "tenant_create",
  "tenant_delete",
];

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

function MetadataRow({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <div className="flex items-start gap-3 py-2 px-4 border-b border-[var(--kyro-border)] last:border-0 bg-[var(--kyro-surface-accent)]">
      <span className="text-[10px] font-medium  tracking-wider text-[var(--kyro-text-muted)] w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-xs font-mono text-[var(--kyro-text-primary)] break-all">{display}</span>
    </div>
  );
}

export function AuditLogsPage() {
  const [result, setResult] = useState<AuditLogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const hasFilters = Boolean(userId.trim() || action || successFilter);
  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    const request = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (userId.trim()) params.set("userId", userId.trim());
    if (action) params.set("action", action);
    if (successFilter) params.set("success", successFilter);

    setLoading(true);
    setError(false);
    // Wait briefly for the full ID before querying while the user types.
    const timer = window.setTimeout(
      async () => {
        try {
          const response = await fetchWithAuth(`/api/auth/audit-logs?${params}`, {
            signal: request.signal,
            cache: "no-store",
          });
          if (!response.ok) throw new Error("Unable to load the activity log");
          const data: AuditLogsResponse = await response.json();
          if (!Array.isArray(data.docs)) throw new Error("Invalid activity log response");
          if (!request.signal.aborted) setResult(data);
        } catch {
          if (!request.signal.aborted) setError(true);
        } finally {
          if (!request.signal.aborted) setLoading(false);
        }
      },
      userId.trim() ? 250 : 0,
    );

    return () => {
      window.clearTimeout(timer);
      request.abort();
    };
  }, [page, userId, action, successFilter, revision]);

  return (
    <div className="collection-workspace space-y-4">
      <PageHeader
        title="Activity log"
        actions={
          <Button size="sm" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2" aria-label="Activity filters" role="group">
        <SearchInput
          value={userId}
          placeholder="Filter by user ID"
          className="min-w-44"
          onChange={(value) => {
            setUserId(value);
            setPage(1);
          }}
        />
        <CustomSelect
          aria-label="Action"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          className="kyro-form-input w-auto px-3"
        >
          <option value="">All actions</option>
          {ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {formatAction(type)}
            </option>
          ))}
        </CustomSelect>
        <CustomSelect
          aria-label="Status"
          value={successFilter}
          onChange={(event) => {
            setSuccessFilter(event.target.value);
            setPage(1);
          }}
          className="kyro-form-input w-auto px-3"
        >
          <option value="">All statuses</option>
          <option value="true">Successful</option>
          <option value="false">Failed</option>
        </CustomSelect>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUserId("");
              setAction("");
              setSuccessFilter("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="collection-table overflow-x-auto" aria-busy={loading}>
        {loading ? (
          <div role="status" aria-label="Loading activity log" className="space-y-2 p-4">
            <Shimmer variant="table-row" count={5} />
          </div>
        ) : error ? (
          <div role="alert" className="dashboard-empty">
            <p>Couldn’t load the activity log.</p>
            <Button size="sm" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : !result?.docs.length ? (
          <div className="dashboard-empty">
            <p>{hasFilters ? "No events match these filters." : "No activity recorded yet."}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] whitespace-nowrap">
                  <th scope="col" className="px-3">
                    Action
                  </th>
                  <th scope="col" className="px-3">
                    User
                  </th>
                  <th scope="col" className="px-3">
                    Resource
                  </th>
                  <th scope="col" className="px-3">
                    Status
                  </th>
                  <th scope="col" className="px-3">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--kyro-border)]">
                {result.docs.map((log) => (
                  <Fragment key={log.id}><tr className="hover:bg-[var(--kyro-surface-accent)]">
                    <td className="px-3">
                      <button
                        type="button"
                        aria-expanded={selectedLog?.id === log.id}
                        aria-controls={`audit-detail-${log.id}`}
                        onClick={() => setSelectedLog(current => current?.id === log.id ? null : log)}
                        className="collection-document-link whitespace-nowrap text-left font-medium"
                      >
                        {formatAction(log.action)}
                      </button>
                    </td>
                    <td className="px-3">
                      <div className="max-w-56 truncate" title={log.userEmail || log.userId}>
                        {log.userEmail || log.userId || "System"}
                      </div>
                      {log.role && <div className="text-xs text-[var(--kyro-text-muted)]">{log.role}</div>}
                    </td>
                    <td className="px-3">
                      {log.resource}
                      {log.resourceId && (
                        <div className="text-xs font-mono text-[var(--kyro-text-muted)]" title={log.resourceId}>
                          {log.resourceId.slice(-8)}
                        </div>
                      )}
                    </td>
                    <td className="px-3">
                      <Badge variant={log.success ? "success" : "danger"} dot>
                        {log.success ? "Successful" : "Failed"}
                      </Badge>
                    </td>
                    <td className="px-3 text-xs whitespace-nowrap text-[var(--kyro-text-secondary)]">
                      {formatTimestamp(log.timestamp)}
                    </td>
                  </tr>
                  {selectedLog?.id === log.id && <tr id={`audit-detail-${log.id}`}><td colSpan={5} className="audit-inline-detail">
                    <AuditEventDetails selectedLog={log} />
                  </td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              totalDocs={result.totalDocs}
              limit={result.limit}
              onPageChange={setPage}
            />
          </>
        )}
      </div>


    </div>
  );
}

function AuditEventDetails({ selectedLog }: { selectedLog: AuditLog }) {
 return (
          <div className="space-y-0">
            <MetadataRow label="Event ID" value={selectedLog.id} />
            <MetadataRow label="Timestamp" value={formatTimestamp(selectedLog.timestamp)} />
            <MetadataRow label="User Email" value={selectedLog.userEmail} />
            <MetadataRow label="User ID" value={selectedLog.userId} />
            <MetadataRow label="Role" value={selectedLog.role} />
            <MetadataRow label="Resource" value={selectedLog.resource} />
            <MetadataRow label="Resource ID" value={selectedLog.resourceId} />
            <MetadataRow label="IP Address" value={selectedLog.ipAddress} />

            {/* Error message */}
            {selectedLog.error && (
              <div className="mt-4 -mx-6 px-6 py-4 bg-red-500/5 border-y border-red-500/10">
                <div className="text-[10px] font-medium  tracking-wider text-red-400 mb-2">Error</div>
                <div className="text-sm font-mono text-red-300">{selectedLog.error}</div>
              </div>
            )}

            {/* Changes */}
            {selectedLog.changes && selectedLog.changes.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-medium  tracking-wider text-[var(--kyro-text-muted)] mb-3">
                  Changes ({selectedLog.changes.length})
                </div>
                <div className="rounded-xl border border-[var(--kyro-border)] overflow-hidden">
                  {selectedLog.changes.map((change, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 px-4 py-3 text-xs font-mono border-b border-[var(--kyro-border)] last:border-0 hover:bg-[var(--kyro-surface-accent)] transition-colors"
                    >
                      <span className="text-[10px] font-medium  tracking-wider text-[var(--kyro-text-muted)] w-24 shrink-0 pt-0.5">
                        {change.field}
                      </span>
                      <span className="text-red-400 line-through flex-1 truncate">
                        {change.old === undefined || change.old === null ? "(empty)" : JSON.stringify(change.old)}
                      </span>
                      <span className="text-[var(--kyro-text-muted)] shrink-0">→</span>
                      <span className="text-green-400 flex-1 truncate">
                        {change.new === undefined || change.new === null ? "(empty)" : JSON.stringify(change.new)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-medium  tracking-wider text-[var(--kyro-text-muted)] mb-3">Metadata</div>
                <div className="border border-[var(--kyro-border)] overflow-hidden">
                  {Object.entries(selectedLog.metadata).map(([key, value]) => (
                    <MetadataRow key={key} label={key.replace(/([A-Z])/g, " $1").trim()} value={value as string} />
                  ))}
                </div>
              </div>
            )}

            {/* User Agent */}
            {selectedLog.userAgent && (
              <div className="mt-4">
                <div className="text-[10px] font-medium  tracking-wider text-[var(--kyro-text-muted)] mb-2">
                  User Agent
                </div>
                <div className="text-xs font-mono text-[var(--kyro-text-secondary)] bg-[var(--kyro-bg-secondary)] rounded-lg px-3 py-2 border border-[var(--kyro-border)]">
                  {selectedLog.userAgent}
                </div>
              </div>
            )}
          </div>
 );
}
