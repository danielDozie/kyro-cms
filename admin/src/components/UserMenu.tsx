import "../lib/i18n";
import React, { useState, useEffect } from "react";
import { Dropdown, DropdownItem, DropdownSeparator } from "./ui/Dropdown";
import { User, Shield, Key, Webhook, Clock, FileText, ExternalLink, HelpCircle, LogOut, Terminal, Zap } from "./ui/icons";
import { useAuthStore } from "../lib/stores";
import { apiGet } from "../lib/api";
import { resolveMedia } from "../lib/paths";
import { useTranslation } from "react-i18next";
import { navigate } from '../lib/navigate';

interface UserMenuProps {
  adminPath: string;
}

export function UserMenu({ adminPath }: UserMenuProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [apiAccess, setApiAccess] = useState<{ graphqlEnabled?: boolean } | null>(null);

  useEffect(() => {
    const rawAvatar = (currentUser as any)?.avatar || (currentUser as any)?.photo || (currentUser as any)?.picture || (currentUser as any)?.image;
    
    if (!rawAvatar) {
      setAvatarUrl(null);
      return;
    }

    if (typeof rawAvatar === "object" && rawAvatar !== null) {
      const url = rawAvatar.thumbnailUrl || rawAvatar.url || rawAvatar.filename;
      if (url) {
        setAvatarUrl(resolveMedia(url));
        return;
      }
    }

    if (typeof rawAvatar === "string") {
      if (rawAvatar.startsWith("http") || rawAvatar.startsWith("data:") || rawAvatar.startsWith("blob:") || rawAvatar.startsWith("/")) {
        setAvatarUrl(resolveMedia(rawAvatar));
      } else if (/^[0-9a-f-]+$/i.test(rawAvatar)) {
        apiGet<any>(`/api/media/${rawAvatar}`)
          .then((media) => {
            const fetchedUrl = media?.thumbnailUrl || media?.url || media?.filename;
            setAvatarUrl(fetchedUrl ? resolveMedia(fetchedUrl) : null);
          })
          .catch(() => setAvatarUrl(null));
      } else {
        setAvatarUrl(resolveMedia(rawAvatar));
      }
    }
  }, [currentUser]);

  useEffect(() => {
    apiGet<any>("/api/auth/me")
      .then((res: any) => {
        const u = res?.user || (res?.id ? res : null);
        if (u) {
          useAuthStore.getState().setUser(u);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiGet<any>("/api/globals/access-settings")
      .then((res: any) => {
        const data = res?.data || res;
        setApiAccess(data?.apiAccess || {});
      })
      .catch(() => setApiAccess({}));
  }, []);

  const userRole = currentUser?.role || "";
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  const authPermissions = typeof window !== "undefined" ? (window as any).__kyroAuth?.permissions : null;
  const canReadAudit = isAdmin || authPermissions?.collections?.audit_logs?.read === true;

  const showDeveloperSection = isAdmin || canReadAudit;

  return (
    <Dropdown
      align="right"
      trigger={
        <div
          className="flex items-center justify-center w-7 h-7 text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface)] rounded-xl transition-all shadow-sm active:scale-95 overflow-hidden"
          title={currentUser?.email || t("userMenu.account", { defaultValue: "Account" })}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full rounded-xl object-cover"
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <User className="w-4 h-4" strokeWidth={2.5} />
          )}
        </div>
      }
    >
      <div className="px-4 py-2 mb-1">
        <p className="text-[10px] font-medium tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40">
          {t("userMenu.account", { defaultValue: "Account" })}
        </p>
      </div>

      <DropdownItem
        icon={<User className="w-4 h-4" />}
        onClick={() => {
          const id = currentUser?.id;
          if (id) {
            navigate(`${adminPath}/users/${id}`);
          } else {
            navigate(`${adminPath}/users`);
          }
        }}
      >
        {t("userMenu.profileSettings", { defaultValue: "Profile Settings" })}
      </DropdownItem>

      {isSuperAdmin && (
        <DropdownItem
          icon={<Shield className="w-4 h-4" />}
          onClick={() => navigate(`${adminPath}/roles`)}
        >
          {t("userMenu.permissions", { defaultValue: "Permissions" })}
        </DropdownItem>
      )}

      {showDeveloperSection && (
        <>
          <DropdownSeparator />

          <div className="px-4 py-2 mb-1">
            <p className="text-[10px] font-medium tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40">
              {t("userMenu.developer", { defaultValue: "Developer" })}
            </p>
          </div>

          {isAdmin && (
            <DropdownItem
              icon={<Key className="w-4 h-4" />}
              onClick={() => navigate(`${adminPath}/keys`)}
            >
              {t("userMenu.apiKeys", { defaultValue: "API Keys" })}
            </DropdownItem>
          )}

          {isAdmin && (
            <DropdownItem
              icon={<Webhook className="w-4 h-4" />}
              onClick={() => navigate(`${adminPath}/webhooks`)}
            >
              {t("userMenu.webHooks", { defaultValue: "Web Hooks" })}
            </DropdownItem>
          )}

          {isAdmin && (
            <DropdownItem
              icon={<Clock className="w-4 h-4" />}
              onClick={() => navigate(`${adminPath}/sessions`)}
            >
              {t("userMenu.sessions", { defaultValue: "Sessions" })}
            </DropdownItem>
          )}

          {canReadAudit && (
            <DropdownItem
              icon={<FileText className="w-4 h-4" />}
              onClick={() => navigate(`${adminPath}/audit`)}
            >
              {t("userMenu.auditLogs", { defaultValue: "Audit Logs" })}
            </DropdownItem>
          )}

          {isAdmin && (
            <DropdownItem
              icon={<Terminal className="w-4 h-4" />}
              onClick={() => navigate(`${adminPath}/rest-playground`)}
            >
              {t("userMenu.apiExplorer", { defaultValue: "API Explorer" })}
            </DropdownItem>
          )}

          {isAdmin && (apiAccess === null || apiAccess?.graphqlEnabled) && (
            <DropdownItem
              icon={<Zap className="w-4 h-4" />}
              onClick={() => navigate(`${adminPath}/graphql`)}
            >
              {t("userMenu.graphqlPlayground", { defaultValue: "GraphQL Playground" })}
            </DropdownItem>
          )}
        </>
      )}

      <DropdownSeparator />

      <div className="px-4 py-2 mb-1">
        <p className="text-[10px] font-medium tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40">
          {t("userMenu.resources", { defaultValue: "Resources" })}
        </p>
      </div>

      <DropdownItem
        icon={<ExternalLink className="w-4 h-4" />}
        onClick={() => window.open("https://kyro-cms.com/getting-started.html", "_blank")}
      >
        {t("userMenu.documentation", { defaultValue: "Documentation" })}
      </DropdownItem>

      <DropdownItem
        icon={<HelpCircle className="w-4 h-4" />}
        onClick={() => window.open("https://github.com/danielDozie/kyro-cms/issues/new", "_blank")}
      >
        {t("userMenu.getSupport", { defaultValue: "Get Support" })}
      </DropdownItem>

      <DropdownSeparator />

      <DropdownItem
        icon={<LogOut className="w-4 h-4" />}
        danger
        onClick={() => document.getElementById("logout-btn")?.click()}
      >
        {t("actions.signOut", { defaultValue: "Sign Out" })}
      </DropdownItem>
    </Dropdown>
  );
}
