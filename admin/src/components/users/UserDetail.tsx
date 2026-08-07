import { useState, useEffect } from "react";
import { apiGet, apiPatch, apiDelete } from "../../lib/api";
import { useUIStore, useAuthStore, toast } from "../../lib/stores";
import { UploadField } from "../fields/UploadField";
import { useTranslation } from "react-i18next";
import { navigate } from '../../lib/navigate';

interface User {
  id: string;
  name?: string;
  email: string;
  role: string;
  avatar?: string;
  tenantId?: string;
  emailVerified?: boolean;
  locked?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  failedLoginAttempts?: number;
}

interface UserDetailProps {
  user: User;
  apiPath: string;
  adminPath: string;
}

const roleOptions = [
  "super_admin",
  "admin",
  "editor",
  "author",
  "customer",
  "guest",
];

export function UserDetail({ user, apiPath, adminPath }: UserDetailProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(user.name || "");
  const [role, setRole] = useState(user.role);
  const [avatar, setAvatar] = useState<string | undefined>(user.avatar);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarMedia, setAvatarMedia] = useState<any>(user.avatar ? { id: user.avatar } : null);
  const [saving, setSaving] = useState(false);
  const { confirm } = useUIStore();
  const [, setDeleting] = useState(false);
  const [locking, setLocking] = useState(false);
  const [isLocked, setIsLocked] = useState(user.locked || false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  useEffect(() => {
    if ((window as any).__kyroAuth?.user?.role) {
      setCurrentUserRole((window as any).__kyroAuth.user.role);
    } else {
      apiGet<any>("/api/auth/me")
        .then((res) => {
          if (res?.user?.role) setCurrentUserRole(res.user.role);
        })
        .catch(() => { });
    }

    const handler = (e: any) => {
      if (e.detail?.user?.role) {
        setCurrentUserRole(e.detail.user.role);
      }
    };
    window.addEventListener("kyro:auth-ready", handler);
    return () => window.removeEventListener("kyro:auth-ready", handler);
  }, []);

  useEffect(() => {
    if (typeof avatar === "string" && /^[0-9a-f-]+$/i.test(avatar)) {
      apiGet<any>(`/api/media/${avatar}`)
        .then((media) => {
          setAvatarUrl(media?.thumbnailUrl || media?.url || null);
          setAvatarMedia({ id: avatar, url: media.url, thumbnailUrl: media.thumbnailUrl, filename: media.filename, originalName: media.originalName, mimeType: media.mimeType });
        })
        .catch(() => { setAvatarUrl(null); setAvatarMedia(null); });
    } else {
      setAvatarUrl(null);
      setAvatarMedia(null);
    }
  }, [avatar]);

  const handleAvatarChange = (val: any) => {
    if (val && typeof val === "object") {
      setAvatar(val.id);
      setAvatarUrl(val.url || val.thumbnailUrl || null);
      setAvatarMedia(val);
    } else {
      setAvatar(undefined);
      setAvatarUrl(null);
      setAvatarMedia(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};

      if (role !== user.role) {
        body.role = role;
      }
      if (name !== user.name) {
        body.name = name.trim() === "" ? null : name.trim();
      }
      if (avatar !== user.avatar) {
        body.avatar = avatar || null;
      }

      if (Object.keys(body).length === 0) {
        navigate(adminPath + "/users");
        return;
      }

      await apiPatch(`/users/${user.id}`, body, { autoToast: false });
      toast.success("User updated");
      const currentMe = (window as any).__kyroAuth?.user || useAuthStore.getState().user;
      if (currentMe && (currentMe.id === user.id || currentMe.email === user.email)) {
        apiGet<any>("/api/auth/me", { autoToast: false }).then((meRes) => {
          const updatedUser = meRes?.user || meRes;
          if (updatedUser) {
            useAuthStore.getState().setUser(updatedUser);
          }
        });
      }
      navigate(adminPath + "/users");
    } catch (e: any) {
      toast.error(e.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleLockToggle = () => {
    confirm({
      title: isLocked ? "Unlock User" : "Lock User",
      message: isLocked
        ? `Unlock ${user.email}? They will be able to log in again.`
        : `Lock ${user.email}? They will not be able to log in.`,
      variant: isLocked ? "default" : "danger",
      confirmLabel: isLocked ? "Unlock" : "Lock",
      onConfirm: async () => {
        setLocking(true);
        try {
          await apiPatch(`/users/${user.id}`, { locked: !isLocked }, { autoToast: false });
          setIsLocked(!isLocked);
          toast.success(isLocked ? "User unlocked" : "User locked");
        } catch (e: any) {
          toast.error(e.message || "Failed to toggle lock");
        } finally {
          setLocking(false);
        }
      }
    });
  };

  const handleDelete = () => {
    confirm({
      title: "Delete User",
      message: `Are you sure you want to delete ${user.email}? This action cannot be undone.`,
      variant: "danger",
      onConfirm: async () => {
        setDeleting(true);
        try {
          await apiDelete(`/users/${user.id}`, { autoToast: false });
          toast.success("User deleted");
          navigate(adminPath + "/users");
        } catch (e: any) {
          toast.error(e.message || "Failed to delete user");
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="flex-1 overflow-y-auto  space-y-8">
      <div className="surface-tile p-6 flex items-center justify-between rounded-lg">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-full bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] flex items-center justify-center font-bold text-xl overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (name || user.email).charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-[var(--kyro-text-primary)]">
              {name || user.email}
            </h1>
            <p className="text-sm text-[var(--kyro-text-secondary)] font-medium mb-2">
              {name ? user.email : `User ID: ${user.id}`}
            </p>
          </div>
        </div>
        {(currentUserRole === "admin" || currentUserRole === "super_admin") && (
          <div className="flex gap-2">
            <button
              onClick={handleLockToggle}
              className="px-4 py-2 border border-[var(--kyro-border)] rounded-xl text-sm font-bold text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
            >
              {isLocked ? "Unlock User" : "Lock User"}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-200 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="surface-tile p-6 rounded-lg">
        <h2 className="text-lg font-bold text-[var(--kyro-text-primary)] tracking-tighter mb-6">
          Details
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-[var(--kyro-text-secondary)]  tracking-wider">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] rounded-lg text-sm font-medium text-[var(--kyro-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)]"
              placeholder={t("fields.enterName", { defaultValue: "Enter name" })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--kyro-text-secondary)]  tracking-wider">
              Email
            </label>
            <p className="mt-1 font-medium text-[var(--kyro-text-primary)]">
              {user.email}
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--kyro-text-secondary)] tracking-wider">
              Role
            </label>
            {(() => {
              const isSuperAdmin = currentUserRole === "super_admin";
              return (
                <div>
                  <select
                    value={role}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] rounded-lg text-sm font-medium text-[var(--kyro-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {!isSuperAdmin && (
                    <p className="text-[11px] text-[var(--kyro-text-secondary)] mt-1 font-medium">
                      Only Super Admin can modify user roles.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--kyro-text-secondary)]  tracking-wider">
              Email Verified
            </label>
            <p className="mt-1">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${user.emailVerified
                  ? "bg-green-500/10 text-green-500"
                  : "bg-yellow-500/10 text-yellow-500"
                  }`}
              >
                {user.emailVerified ? "Verified" : "Not verified"}
              </span>
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--kyro-text-secondary)]  tracking-wider">
              Status
            </label>
            <p className="mt-1">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${isLocked
                  ? "bg-red-500/10 text-red-500"
                  : "bg-green-500/10 text-green-500"
                  }`}
              >
                {isLocked ? "Locked" : "Active"}
              </span>
            </p>
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--kyro-text-secondary)]  tracking-wider">
              Last Login
            </label>
            <p className="mt-1 text-sm text-[var(--kyro-text-secondary)]">
              {user.lastLogin
                ? new Date(user.lastLogin).toLocaleString()
                : "Never"}
            </p>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-[var(--kyro-text-secondary)] tracking-wider">
              Photo
            </label>
            <div className="mt-1 flex items-center gap-2">
              <UploadField
                field={{ label: "Photo", name: "avatar", maxCount: 1, allowedTypes: ["image/*"] }}
                value={avatarMedia}
                onChange={handleAvatarChange}
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#64748b]  tracking-wider">
              Created
            </label>
            <p className="mt-1 text-sm text-[#64748b]">
              {formatDate(user.createdAt)}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--kyro-text-secondary)]  tracking-wider">
              Failed Attempts
            </label>
            <p className="mt-1 text-sm font-medium text-[var(--kyro-text-primary)]">
              {user.failedLoginAttempts || 0}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-[#64748b]  tracking-wider">
              Updated
            </label>
            <p className="mt-1 text-sm text-[#64748b]">
              {formatDate(user.updatedAt)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="kyro-btn kyro-btn-primary px-6 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

    </div>
  );
}
