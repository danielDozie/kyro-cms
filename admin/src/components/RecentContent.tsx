import { CustomSelect } from "./ui/CustomSelect";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { adminPath } from "../lib/paths";
import { useAuthStore } from "../lib/stores";

interface ContentCollection { label: string; titleField?: string }
interface ContentDocument {
  id: string | number;
  title: string;
  collection: string;
  label: string;
  status?: string;
  updatedAt?: string;
  slug?: string;
}
interface Props {
  collections: Record<string, ContentCollection>;
  serverUserRole?: string;
  serverPermissions?: { collections?: Record<string, { read?: boolean }> };
}

export function RecentContent({ collections, serverUserRole, serverPermissions }: Props) {
  const { user, permissions } = useAuthStore();
  const role = user?.role || serverUserRole;
  const access = permissions || serverPermissions;
  const [documents, setDocuments] = useState<ContentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("all");
  const [attempt, setAttempt] = useState(0);
  const [scope, setScope] = useState(Object.keys(collections).some(slug => ["pages", "posts"].includes(slug)) ? "website" : "all");
  const slugs = useMemo(() => Object.keys(collections).filter(slug =>
    role === "admin" || role === "super_admin" || access?.collections?.[slug]?.read === true
  ), [collections, role, access]);

  useEffect(() => {
    if (!role) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    Promise.allSettled(slugs.map(async slug => {
      const result = await apiGet<{ docs?: Record<string, unknown>[] }>(`/api/${encodeURIComponent(slug)}?limit=6&sort=-updatedAt`, { autoToast: false });
      return (result.docs || []).map(doc => ({
        id: doc.id as string | number,
        title: String(doc[collections[slug].titleField || "title"] || doc.title || doc.name || doc.id),
        collection: slug,
        label: collections[slug].label,
        status: typeof (doc._status || doc.status) === "string" ? String(doc._status || doc.status) : undefined,
        updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : undefined,
        slug: typeof doc.slug === "string" ? doc.slug : undefined,
      }));
    })).then(results => {
      if (!active) return;
      setFailed(results.some(result => result.status === "rejected"));
      setDocuments(results.flatMap(result => result.status === "fulfilled" ? result.value : [])
        .sort((a, b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0)));
      setLoading(false);
    });
    return () => { active = false; };
  }, [slugs, collections, role, attempt]);

  const hasWebsite = slugs.some(slug => ["pages", "posts"].includes(slug));
  const effectiveScope = scope === "website" && !hasWebsite ? "all" : scope;
  const scoped = documents.filter(doc => effectiveScope === "all" || (effectiveScope === "website" ? ["pages", "posts"].includes(doc.collection) : doc.collection === effectiveScope));
  const visible = scoped.filter(doc => filter === "all" || doc.status?.toLowerCase() === filter).slice(0, 6);
  const hasDates = visible.some(doc => doc.updatedAt && Number.isFinite(Date.parse(doc.updatedAt)));
  const targetSlug = slugs.includes(effectiveScope) ? effectiveScope : hasWebsite ? (slugs.includes("pages") ? "pages" : "posts") : slugs[0];
  const updatedLabel = (date: string) => {
    const days = Math.floor((Date.now() - Date.parse(date)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days > 1 && days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };
  return <section className="dashboard-recent recent-content-refined" aria-labelledby="recent-content-heading" aria-busy={loading}>
    <div className="recent-content-heading">
      <div><h2 id="recent-content-heading" className="dashboard-section-title">Recent content</h2><p className="dashboard-section-note">{effectiveScope === "website" ? "Your pages, posts, and work in progress." : "The latest updates across your collections."}</p></div>
      <CustomSelect aria-label="Content collection" value={effectiveScope} onChange={event => { setScope(event.target.value); setFilter("all"); }}>
        {hasWebsite && <option value="website">Pages &amp; posts</option>}
        <option value="all">All collections</option>
        {slugs.map(slug => <option key={slug} value={slug}>{collections[slug].label}</option>)}
      </CustomSelect>
    </div>
    <div className="recent-content-filters">
      <div className="dashboard-content-tabs" aria-label="Filter recent content">
        {[["all", "All updates"], ["draft", "Drafts"], ["published", "Published"]].map(([value, label]) =>
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{scoped.filter(doc => value === "all" || doc.status?.toLowerCase() === value).length}</span></button>
        )}
      </div>
      {targetSlug && <a className="recent-content-view-all" href={`${adminPath}/${targetSlug}`}>Browse {collections[targetSlug].label.toLowerCase()} <span aria-hidden="true">→</span></a>}
    </div>
    {failed && <p className="dashboard-section-note" role="status">Some content could not be loaded. <button type="button" className="underline" onClick={() => setAttempt(n => n + 1)}>Try again</button></p>}
    {loading ? <div className="space-y-4 py-6" role="status"><span className="sr-only">Loading recent content</span>{[0, 1, 2].map(n => <div key={n} className="h-10 rounded bg-[var(--kyro-surface-accent)] animate-pulse" />)}</div> : visible.length === 0 ?
      <div className="recent-content-empty"><span className="recent-document-icon" aria-hidden="true">＋</span><div><h3>{filter === "draft" ? "No drafts to pick up" : filter === "published" ? "Nothing published here yet" : "Make room for your first idea"}</h3><p>{filter === "draft" ? "Drafts from your latest updates will appear here." : "Open a collection to create and manage content."}</p></div>{targetSlug && <a href={`${adminPath}/${targetSlug}`} className="kyro-btn kyro-btn-md kyro-btn-secondary">Open collection</a>}</div> :
      <div className="dashboard-table-scroll"><table className="dashboard-table recent-content-table">
        <caption className="sr-only">Recent updates from the selected collections. Up to six records per collection are loaded.</caption>
        <thead><tr><th scope="col">Content</th><th scope="col">Status</th>{hasDates && <th scope="col">Last updated</th>}<th scope="col"><span className="sr-only">Open document</span></th></tr></thead>
        <tbody>{visible.map(doc => {
          const href = `${adminPath}/${encodeURIComponent(doc.collection)}/${encodeURIComponent(String(doc.id))}`;
          return <tr key={`${doc.collection}/${doc.id}`}>
            <td><a className="recent-document" href={href}><span className="recent-document-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></span><span><strong>{doc.title}</strong><small>{doc.label}{doc.slug ? ` · /${doc.slug}` : ""}</small></span></a></td>
            <td>{doc.status ? <span className={`recent-status recent-status-${doc.status.toLowerCase()}`}><span aria-hidden="true" className="dashboard-status-dot" />{doc.status}</span> : <span className="recent-status">No status</span>}</td>
            {hasDates && <td>{doc.updatedAt && Number.isFinite(Date.parse(doc.updatedAt)) ? <time dateTime={doc.updatedAt} title={new Date(doc.updatedAt).toLocaleString()}>{updatedLabel(doc.updatedAt)}</time> : <span className="recent-date-missing">—</span>}</td>}
            <td><a className="recent-document-open" href={href} aria-label={`Open ${doc.title}`}><span aria-hidden="true">↗</span></a></td>
          </tr>;
        })}</tbody>
      </table></div>}
    {!loading && scoped.length > 0 && <p className="recent-content-footnote">Showing {visible.length} recent updates. Open a collection to see all content.</p>}
  </section>;
}
