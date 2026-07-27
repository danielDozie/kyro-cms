import { Plus, Lock, CheckCircle2, Edit2, Trash2, XCircle, X } from "../ui/icons";
import { useState } from "react";
import { useUIStore } from "../../lib/stores";
import { navigate } from '../../lib/navigate';

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

const roleColors: Record<string, string> = {
  super_admin: "bg-red-50 text-red-600",
  admin: "bg-purple-50 text-purple-600",
  editor: "bg-blue-50 text-blue-600",
  author: "bg-green-50 text-green-600",
  customer: "bg-gray-50 text-gray-600",
  guest: "bg-yellow-50 text-yellow-600",
};

export function UsersList({
  initialUsers,
  initialTotal,
  apiPath,
  adminPath,
}: UsersListProps) {
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
          const res = await fetch(`${apiPath}/users/${user.id}`, {
            method: "DELETE",
            credentials: "include",
          });
          const data = await res.json();
          if (res.ok) {
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            setTotalUsers((prev) => prev - 1);
          } else {
            setErrorMsg(data.error || "Failed to delete user");
          }
        } catch (e) {
          setErrorMsg("Failed to delete user");
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

  return (
    <div className="flex-1 overflow-y-auto  space-y-8">
      <div className="surface-tile p-6 flex items-center justify-between rounded-lg">
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-[var(--kyro-text-primary)]">
            Users
          </h1>
          <p className="text-sm text-[var(--kyro-text-secondary)] mt-1 font-medium">
            Manage user accounts and permissions
            <span className="ml-2 text-[var(--kyro-text-primary)] font-bold">
              · {totalUsers} users
            </span>
          </p>
        </div>
        <a
          href={`${adminPath}/users/new`}
          className="flex items-center text-sm gap-2 px-6 py-2.5 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl transition-all hover:opacity-90 active:scale-95 shadow-lg"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 5v14M5 12h14"
            ></path>
          </svg>
          Add User
        </a>
      </div>

      <div className="surface-tile overflow-hidden rounded-lg">
        {users.length === 0 ? (
          <div className="px-8 py-16 text-center">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <p className="font-medium text-[var(--kyro-text-primary)] text-base">
                No users yet
              </p>
              <p className="text-sm text-[var(--kyro-text-secondary)]">
                Create your first user to get started.
              </p>
              <a
                href={`${adminPath}/users/new`}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-lg font-bold text-sm shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add User
              </a>
            </div>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[var(--kyro-text-secondary)] font-bold text-[10px]  tracking-[0.3em] border-b border-[var(--kyro-border)]">
                <th className="px-8 py-6">Name</th>
                <th className="px-6 py-6">Email</th>
                <th className="px-6 py-6">Role</th>
                <th className="px-6 py-6">Status</th>
                <th className="px-6 py-6">Created</th>
                <th className="px-6 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--kyro-border)]">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() =>
                    navigate(`${adminPath}/users/${user.id}`)
                  }
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] flex items-center justify-center font-bold text-sm">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--kyro-text-primary)]">
                          {user.name || "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-[var(--kyro-text-secondary)]">
                      {user.email}
                    </div>
                    {user.tenantId && (
                      <div className="text-xs text-[var(--kyro-text-muted)] mt-0.5">
                        Tenant: {user.tenantId}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${roleColors[user.role] || "bg-gray-50 text-gray-600"}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {user.locked ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600">
                        <Lock className="w-4 h-4" />
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-sm text-[#64748b]">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={`${adminPath}/users/${user.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[#64748b] hover:bg-gray-100 hover:text-[#0b1222] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Edit2 className="w-4 h-4" />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(user);
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[#64748b] hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {errorMsg && (
        <div className="surface-tile p-4 flex items-center gap-3 border border-red-200">
          <XCircle className="w-4 h-4" />
          <p className="text-sm font-medium text-red-500">{errorMsg}</p>
          <button
            onClick={() => setErrorMsg(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
