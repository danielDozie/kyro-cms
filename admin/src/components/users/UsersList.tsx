import { CustomSelect } from "../ui/CustomSelect";
import { Plus, Edit2, Trash2, XCircle, X } from "../ui/icons";
import { PageHeader } from "../ui/PageHeader";
import { SearchInput } from "../ui/SearchInput";
import { Badge } from "../ui/Badge";
import { useState } from "react";
import { useUIStore } from "../../lib/stores";
import { apiDelete } from "../../lib/api";

interface User {
  id: string;
  name?: string;
  email: string;
  role: string;
  tenantId?: string;
  locked?: boolean;
  emailVerified?: boolean;
  lastLogin?: string;
  createdAt?: string;
  failedLoginAttempts?: number;
}

interface UsersListProps {
  initialUsers: User[];
  initialTotal: number;
  apiPath: string;
  adminPath: string;
}

export function UsersList({
  initialUsers,
  initialTotal,
  apiPath,
  adminPath,
}: UsersListProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [onlyLocked, setOnlyLocked] = useState(false);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [totalUsers, setTotalUsers] = useState(initialTotal);
  const { confirm } = useUIStore();
  const [, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeleteClick = (user: User) => {
    confirm({
      title: "Delete User",
      message: `Are you sure you want to delete ${user.email}? This action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setDeleting(true);
        setErrorMsg(null);
        try {
          await apiDelete(`/users/${user.id}`, { autoToast: false });
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          setTotalUsers((prev) => prev - 1);
        } catch (e: any) {
          setErrorMsg(e.message || "Failed to delete user");
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const visibleUsers = users.filter(user =>
    `${user.name || ""} ${user.email}`.toLowerCase().includes(search.toLowerCase()) &&
    (roleFilter === "all" || user.role === roleFilter) && (!onlyLocked || !!user.locked)
  );
  return <div className="people-workspace collection-workspace space-y-5">
    <PageHeader title="People" description="Accounts, roles, and workspace access." metadata={[<span key="count">{totalUsers} {totalUsers === 1 ? "account" : "accounts"}</span>]} action={{ label: "Add person", href: `${adminPath}/users/new`, icon: Plus }} />
    <div className="people-toolbar">
      <SearchInput value={search} onChange={setSearch} placeholder="Search people by name or email" />
      <CustomSelect aria-label="Filter by role" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="all">All roles</option>{[...new Set(users.map(user => user.role))].map(role => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</CustomSelect>
      <label><input type="checkbox" checked={onlyLocked} onChange={event => setOnlyLocked(event.target.checked)} /> Locked accounts</label>
    </div>
    <div className="collection-table overflow-x-auto">
      <table className="people-table w-full text-left text-sm">
        <caption className="sr-only">People with access to this workspace</caption>
        <thead><tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Joined</th><th scope="col" className="text-right">Actions</th></tr></thead>
        <tbody>{visibleUsers.map(user => <tr key={user.id}>
          <td><a className="people-identity" href={`${adminPath}/users/${user.id}`}><span className="people-avatar" aria-hidden="true">{(user.name || user.email).charAt(0).toUpperCase()}</span><span><strong>{user.name || user.email}</strong><small>{user.email}</small>{user.tenantId && <small>Tenant: {user.tenantId}</small>}</span></a></td>
          <td><span className="people-role">{user.role.replaceAll("_", " ")}</span></td>
          <td><Badge variant={user.locked ? "danger" : "success"} dot>{user.locked ? "Locked" : "Active"}</Badge></td>
          <td className="text-[var(--kyro-text-secondary)]">{formatDate(user.createdAt)}</td>
          <td><div className="flex justify-end gap-1"><a href={`${adminPath}/users/${user.id}`} className="kyro-btn kyro-btn-sm kyro-btn-ghost kyro-btn-icon" aria-label={`Edit ${user.name || user.email}`}><Edit2 className="w-4 h-4" /></a><button type="button" onClick={() => handleDeleteClick(user)} className="kyro-btn kyro-btn-sm kyro-btn-ghost kyro-btn-icon text-[var(--kyro-danger)]" aria-label={`Delete ${user.name || user.email}`}><Trash2 className="w-4 h-4" /></button></div></td>
        </tr>)}</tbody>
      </table>
      {visibleUsers.length === 0 && <div className="dashboard-empty"><p>{users.length ? "No people match these filters." : "No accounts are available."}</p>{users.length > 0 && <button type="button" className="kyro-btn kyro-btn-sm kyro-btn-secondary mt-3" onClick={() => { setSearch(""); setRoleFilter("all"); setOnlyLocked(false); }}>Clear filters</button>}</div>}
    </div>
    <p className="text-xs text-[var(--kyro-text-secondary)]">Showing {visibleUsers.length} of {users.length} loaded accounts{totalUsers > users.length ? ` (${totalUsers} total)` : ""}.</p>
    {errorMsg && <div className="flex items-center gap-3 p-3 border border-[var(--kyro-danger)] rounded-md" role="alert"><XCircle className="w-4 h-4" /><p className="text-sm text-[var(--kyro-danger)]">{errorMsg}</p><button type="button" onClick={() => setErrorMsg(null)} className="ml-auto kyro-btn kyro-btn-sm kyro-btn-ghost kyro-btn-icon" aria-label="Dismiss error"><X className="w-4 h-4" /></button></div>}
  </div>;
}
