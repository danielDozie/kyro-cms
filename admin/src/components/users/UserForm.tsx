import "../../lib/i18n";
import React, { useState } from "react";
import { apiPost, apiPatch } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { navigate } from '../../lib/navigate';

interface UserFormProps {
  mode: "create" | "edit";
  apiPath: string;
  adminPath: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    role: string;
    tenantId?: string;
    emailVerified?: boolean;
    locked?: boolean;
  };
}

const roleOptions = [
  "super_admin",
  "admin",
  "editor",
  "author",
  "customer",
  "guest",
];

export function UserForm({ mode, apiPath, adminPath, user }: UserFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "customer");
  const [tenantId, setTenantId] = useState(user?.tenantId || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const body: Record<string, string> = { email, role };
    if (name.trim()) body.name = name.trim();
    if (mode === "create") body.password = password;
    if (tenantId.trim()) body.tenantId = tenantId.trim();

    try {
      if (mode === "create") {
        await apiPost("/users", body, { autoToast: false });
      } else {
        await apiPatch(`/users/${user!.id}`, body, { autoToast: false });
      }

      setMessage({
        text: mode === "create" ? "User created successfully!" : "User updated successfully!",
        type: "success",
      });
      if (mode === "create") {
        setEmail("");
        setName("");
        setPassword("");
      }
      setTimeout(() => navigate(adminPath + "/users"), 1000);
    } catch (e: any) {
      setMessage({
        text: e.message || "An error occurred",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto  space-y-8">
      <div className="surface-tile p-6 flex items-center justify-between rounded-lg">
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-[var(--kyro-text-primary)]">
            {mode === "create" ? "Create User" : "Edit User"}
          </h1>
          <p className="text-sm text-[var(--kyro-text-secondary)] mt-1 font-medium">
            {mode === "create"
              ? "Add a new user to the system"
              : `Editing ${user?.email}`}
          </p>
        </div>
        <a
          href={`${adminPath}/users`}
          className="text-sm font-bold text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
        >
          ← Back to users
        </a>
      </div>

      <div className="surface-tile p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[var(--kyro-text-primary)] mb-2"
            >
              Name (optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--kyro-border)] bg-[var(--kyro-input-bg)] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-[var(--kyro-sidebar-active)] text-[var(--kyro-text-primary)]"
              placeholder={t("fields.johnDoe", { defaultValue: "John Doe" })}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--kyro-text-primary)] mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[var(--kyro-border)] bg-[var(--kyro-input-bg)] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-[var(--kyro-sidebar-active)] text-[var(--kyro-text-primary)]"
              placeholder="user@example.com"
            />
          </div>

          {mode === "create" && (
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--kyro-text-primary)] mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                className="w-full px-4 py-3 border border-[var(--kyro-border)] bg-[var(--kyro-input-bg)] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-[var(--kyro-sidebar-active)] text-[var(--kyro-text-primary)]"
                placeholder={t("fields.minimum12Characters", { defaultValue: "Minimum 12 characters" })}
              />
              <p className="text-xs text-[var(--kyro-text-secondary)] mt-1">
                Must contain , lowercase, numbers, and special
                characters
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-[var(--kyro-text-primary)] mb-2"
            >
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--kyro-border)] bg-[var(--kyro-input-bg)] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-[var(--kyro-sidebar-active)] text-[var(--kyro-text-primary)]"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tenantId"
              className="block text-sm font-medium text-[var(--kyro-text-primary)] mb-2"
            >
              Tenant ID (optional)
            </label>
            <input
              type="text"
              id="tenantId"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--kyro-border)] bg-[var(--kyro-input-bg)] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--kyro-sidebar-active)] focus:border-[var(--kyro-sidebar-active)] text-[var(--kyro-text-primary)]"
              placeholder={t("fields.leaveEmptyForGlobal", { defaultValue: "Leave empty for global user" })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--kyro-border)]">
            <a
              href={`${adminPath}/users`}
              className="px-6 py-3 border border-[var(--kyro-border)] rounded-xl text-sm font-bold text-[var(--kyro-text-secondary)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[var(--kyro-sidebar-active)] text-[var(--kyro-sidebar-text-active)] rounded-xl text-sm font-bold hover:bg-opacity-90 transition-colors shadow-lg shadow-black/10 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : mode === "create"
                  ? "Create User"
                  : "Save Changes"}
            </button>
          </div>
        </form>

        {message && (
          <div
            className={`mt-4 p-4 rounded-xl text-sm font-bold ${message.type === "success"
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
              }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
