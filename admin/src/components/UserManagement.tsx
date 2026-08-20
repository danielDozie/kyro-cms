import React, { useState, useEffect } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api";
import {
  Users,
  UserPlus,
  Shield,
  Lock,
  Unlock,
  Clock,
  Search,
  Trash2,
  AlertTriangle,
} from "./ui/icons";
import { useUIStore, toast } from "../lib/stores";
import { Modal, ModalContent, ModalActions } from "./ui/Modal";
import { Badge } from "./ui/Badge";
import { PageHeader } from "./ui/PageHeader";
import { useTranslation } from "react-i18next";

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  avatar?: string;
  locked?: boolean;
  lastLogin?: string;
  tenantId?: string;
  createdAt: string;
}

export function UserManagement() {
    const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const { confirm, alert } = useUIStore();
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    return (typeof window !== "undefined" && (window as any).__kyroAuth?.user?.role) || "";
  });

  useEffect(() => {
    loadUsers();

    if ((window as any).__kyroAuth?.user?.role) {
      setCurrentUserRole((window as any).__kyroAuth.user.role);
    } else {
      apiGet<any>("/api/auth/me")
        .then((res) => {
          if (res?.user?.role) setCurrentUserRole(res.user.role);
        })
        .catch(() => {});
    }

    const handler = (e: any) => {
      if (e.detail?.user?.role) {
        setCurrentUserRole(e.detail.user.role);
      }
    };
    window.addEventListener("kyro:auth-ready", handler);
    return () => window.removeEventListener("kyro:auth-ready", handler);
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await apiGet<any>("/api/users");
      setUsers(result.docs || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = (user: User) => {
    const isLocking = !user.locked;
    confirm({
      title: isLocking ? "Lock User Account?" : "Unlock User Account?",
      message: isLocking
        ? `Are you sure you want to lock ${user.email}? They will be immediately logged out and unable to return.`
        : `Restore system access for ${user.email}?`,
      variant: isLocking ? "danger" : "success",
      onConfirm: async () => {
        try {
          await apiPatch(`/api/users/${user.id}`, { locked: isLocking });
          setUsers((prev) =>
            prev.map((u) => (u.id === user.id ? { ...u, locked: isLocking } : u)),
          );
          toast.success(isLocking ? `Account locked: ${user.email}` : `Account restored: ${user.email}`);
        } catch (error) {
          console.error("Failed to toggle user lock:", error);
          toast.error("Failed to update account status");
        }
      },
    });
  };

  const handleDelete = (user: User) => {
    confirm({
      title: "Destroy User Account",
      message: `You are about to permanently delete ${user.email}. This will remove all their data and cannot be undone.`,
      variant: "danger",
      confirmLabel: "Destroy Account",
      onConfirm: async () => {
        try {
          await apiDelete(`/api/users/${user.id}`);
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          toast.success(`Identity purged: ${user.email}`);
        } catch (error) {
          console.error("Failed to delete user:", error);
          toast.error("Failed to delete user");
        }
      },
    });
  };

  const handleCreateUser = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      setCreateError("Email and password are required");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      await apiPost("/api/users", {
        name: createForm.name.trim() || undefined,
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      });
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "", password: "", role: "customer" });
      toast.success("User created successfully");
      loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const roleOptions = ["super_admin", "admin", "editor", "author", "customer", "guest"];

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-8 pb-12">
      {/* Header */}
      <PageHeader
        title={t("tooltips.identityAccess", { defaultValue: "Identity & Access" })}
        description="Manage the core administrative team and security permissions."
        action={{
          label: "New User",
          onClick: () => {
            setCreateForm({ name: "", email: "", password: "", role: "customer" });
            setCreateError("");
            setShowCreateModal(true);
          },
        }}
      />

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kyro-text-secondary)] opacity-40 group-focus-within:opacity-100 transition-opacity" />
          <input
            type="text"
            placeholder={t("fields.searchByIdentityOr", { defaultValue: "Search by identity or email..." })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] transition-all text-xs font-bold"
          />
        </div>
        <div className="flex items-center gap-1 bg-[var(--kyro-surface-accent)] p-1 rounded-xl border border-[var(--kyro-border)]">
          <button className="px-4 py-1.5 text-[10px] font-bold tracking-widest bg-[var(--kyro-surface)] shadow-sm rounded-lg border border-[var(--kyro-border)]">ALL</button>
          <button className="px-4 py-1.5 text-[10px] font-bold tracking-widest opacity-40 hover:opacity-100 transition-all">ADMINS</button>
          <button className="px-4 py-1.5 text-[10px] font-bold tracking-widest opacity-40 hover:opacity-100 transition-all">LOCKED</button>
        </div>
      </div>

      {/* User Table */}
      <div className="surface-tile overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[var(--kyro-text-secondary)] font-bold text-[9px]  tracking-[0.2em] uppercase border-b border-[var(--kyro-border)] whitespace-nowrap">
              <th className="px-6 py-4 w-64">Member Identity</th>
              <th className="px-6 py-4">Administrative Role</th>
              <th className="px-6 py-4">Security Status</th>
              <th className="px-6 py-4">Last Activity</th>
              <th className="px-6 py-4 w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--kyro-border)]">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-5 bg-[var(--kyro-surface-accent)]/30" />
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <p className="text-xs font-bold opacity-30 tracking-widest uppercase italic">No identity matches found</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-[var(--kyro-surface-accent)]/50 transition-colors group ${user.locked ? "opacity-50 grayscale" : ""}`}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarCell user={user} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                           <div className="text-xs font-bold text-[var(--kyro-text-primary)] truncate">{user.name || user.email.split("@")[0]}</div>
                           {user.tenantId && (
                             <Badge variant="outline" className="text-[7px] px-1 py-0 border-none bg-[var(--kyro-surface-accent)] opacity-50">
                               {user.tenantId}
                             </Badge>
                           )}
                        </div>
                        <div className="text-[10px] text-[var(--kyro-text-secondary)] opacity-50 truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                       <Shield className="w-3.5 h-3.5 opacity-30" />
                       <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant={user.locked ? "danger" : "success"} dot className="text-[8px] font-bold uppercase tracking-widest">
                      {user.locked ? "Restricted" : "Authorized"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--kyro-text-secondary)] opacity-50 uppercase tabular-nums">
                      <Clock className="w-3 h-3" />
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleToggleLock(user)}
                        className={`p-1.5 rounded-lg border transition-all ${user.locked ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"}`}
                        title={user.locked ? "Restore Access" : "Restrict Access"}
                      >
                        {user.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                        title={t("tooltips.deleteUser", { defaultValue: "Delete User" })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t("tooltips.createUser", { defaultValue: "Create User" })}
        size="lg"
      >
        <ModalContent>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[var(--kyro-text-secondary)] uppercase tracking-wider">Name (optional)</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder={t("fields.johnDoe", { defaultValue: "John Doe" })}
                className="w-full px-4 py-3 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[var(--kyro-text-secondary)] uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@example.com"
                required
                className="w-full px-4 py-3 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[var(--kyro-text-secondary)] uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder={t("fields.minimum12Characters", { defaultValue: "Minimum 12 characters" })}
                required
                minLength={12}
                className="w-full px-4 py-3 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-[var(--kyro-text-secondary)] uppercase tracking-wider">Role</label>
              {(() => {
                const isSuperAdmin = currentUserRole === "super_admin";
                return (
                  <div>
                    <select
                      value={createForm.role}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--kyro-bg)] border border-[var(--kyro-border)] rounded-xl text-[var(--kyro-text-primary)] focus:outline-none focus:border-[var(--kyro-primary)] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {!isSuperAdmin && (
                      <p className="text-[11px] text-[var(--kyro-text-secondary)] mt-1 font-medium">
                        Only Super Admin can assign administrative roles.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                {createError}
              </div>
            )}
          </div>
        </ModalContent>
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="px-6 py-2.5 rounded-xl font-bold text-sm border border-[var(--kyro-border)] text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateUser}
            disabled={creating}
            className="kyro-btn kyro-btn-primary px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[var(--kyro-primary)]/10 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create User"}
          </button>
        </ModalActions>
      </Modal>


    </div>
  );
}

function AvatarCell({ user }: { user: User }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const avatar = user.avatar;
    if (typeof avatar === "string" && /^[0-9a-f-]+$/i.test(avatar)) {
      apiGet<any>(`/api/media/${avatar}`)
        .then((media) => setUrl(media?.thumbnailUrl || media?.url || null))
        .catch(() => setUrl(null));
    }
  }, [user.avatar]);

  if (url) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--kyro-border)] flex-shrink-0">
        <img src={url} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-lg bg-[var(--kyro-surface-accent)] border border-[var(--kyro-border)] flex items-center justify-center text-xs font-bold text-[var(--kyro-primary)] flex-shrink-0">
      {user.name ? user.name[0] : user.email[0].toUpperCase()}
    </div>
  );
}
