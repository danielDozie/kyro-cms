import "../lib/i18n";
import React, { useEffect, useRef, useState } from "react";
import { Dropdown, DropdownItem, DropdownSeparator } from "./ui/Dropdown";
import {
  User,
  Shield,
  Key,
  Webhook,
  Clock,
  FileText,
  ExternalLink,
  HelpCircle,
  LogOut,
  Terminal,
  Zap,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "./ui/icons";
import { useAuthStore } from "../lib/stores";
import { apiGet } from "../lib/api";
import { resolveMedia } from "../lib/paths";
import { useTranslation } from "react-i18next";
import { navigate } from "../lib/navigate";
interface UserMenuProps {
  adminPath: string;
}
export function UserMenu({ adminPath }: UserMenuProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [apiAccess, setApiAccess] = useState<{ graphqlEnabled?: boolean }>({});
  const [view, setView] = useState<"main" | "developer" | "resources">("main");
  const bodyRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = isSuperAdmin || user?.role === "admin";
  const canReadAudit = isAdmin || permissions?.collections?.audit_logs?.read === true;
  useEffect(() => {
    const avatar = (user as any)?.avatar || (user as any)?.photo || (user as any)?.picture || (user as any)?.image;
    if (!avatar) {
      setAvatarUrl(null);
      return;
    }
    if (typeof avatar === "object") {
      const url = avatar.thumbnailUrl || avatar.url || avatar.filename;
      setAvatarUrl(url ? resolveMedia(url) : null);
      return;
    }
    if (typeof avatar === "string") {
      if (/^[0-9a-f-]+$/i.test(avatar)) {
        let active = true;
        apiGet<any>(`/api/media/${avatar}`)
          .then((response) => {
            const media = response?.data || response;
            const url = media?.thumbnailUrl || media?.url || media?.filename;
            if (active) setAvatarUrl(url ? resolveMedia(url) : null);
          })
          .catch(() => {
            if (active) setAvatarUrl(null);
          });
        return () => {
          active = false;
        };
      }
      setAvatarUrl(resolveMedia(avatar));
    }
  }, [user]);
  useEffect(() => {
    apiGet<any>("/api/auth/me")
      .then((response) => {
        const current = response?.user || (response?.id ? response : null);
        if (current) useAuthStore.getState().setUser(current);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!isAdmin) {
      setApiAccess({});
      return;
    }
    apiGet<any>("/api/globals/access-settings")
      .then((response) => setApiAccess((response?.data || response)?.apiAccess || {}))
      .catch(() => setApiAccess({}));
  }, [isAdmin]);
  useEffect(() => {
    bodyRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [view]);
  const name =
    (user as any)?.name ||
    (user as any)?.fullName ||
    user?.email?.split("@")[0] ||
    t("userMenu.account", { defaultValue: "Account" });
  const role = (user?.role || "").replace(/_/g, " ");
  const openView = (next: typeof view) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setView(next);
  };
  const back = (label: string) => (
    <button type="button" role="menuitem" className="account-menu-back" onClick={openView("main")}>
      <ChevronLeft size={14} />
      <span>{label}</span>
    </button>
  );
  return (
    <Dropdown
      align="right"
      menuClassName="account-menu"
      trigger={
        <button
          type="button"
          className="account-menu-trigger"
          aria-label={t("userMenu.openAccount", { defaultValue: "Account menu" })}
          title={user?.email || "Account menu"}
          onClick={() => setView("main")}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") setView("main");
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" onError={() => setAvatarUrl(null)} />
          ) : (
            <User size={16} strokeWidth={1.5} />
          )}
        </button>
      }
    >
      <div ref={bodyRef}>
        {view === "main" ? (
          <>
            <div className="account-menu-identity">
              <span className="account-menu-avatar" aria-hidden="true">
                {avatarUrl ? <img src={avatarUrl} alt="" /> : String(name).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{name}</strong>
                <small title={user?.email}>{user?.email}</small>
              </div>
              {role && <span className="account-menu-role">{role}</span>}
            </div>
            <DropdownSeparator />
            <DropdownItem
              icon={<User />}
              onClick={() => navigate(user?.id ? `${adminPath}/users/${user.id}` : `${adminPath}/users`)}
            >
              {t("userMenu.yourProfile", { defaultValue: "Your profile" })}
            </DropdownItem>
            {isSuperAdmin && (
              <DropdownItem icon={<Shield />} onClick={() => navigate(`${adminPath}/roles`)}>
                {t("userMenu.permissions", { defaultValue: "Permissions" })}
              </DropdownItem>
            )}
            {(isAdmin || canReadAudit) && (
              <button type="button" role="menuitem" className="account-menu-next" onClick={openView("developer")}>
                <Terminal size={14} />
                <span>{t("userMenu.developerTools", { defaultValue: "Developer tools" })}</span>
                <ChevronRight size={12} />
              </button>
            )}
            <button type="button" role="menuitem" className="account-menu-next" onClick={openView("resources")}>
              <HelpCircle size={14} />
              <span>{t("userMenu.helpResources", { defaultValue: "Help & resources" })}</span>
              <ChevronRight size={12} />
            </button>
            <DropdownSeparator />
            <DropdownItem icon={<LogOut />} danger onClick={() => document.getElementById("logout-btn")?.click()}>
              {t("actions.signOut", { defaultValue: "Sign out" })}
            </DropdownItem>
          </>
        ) : view === "developer" ? (
          <>
            {back(t("userMenu.developerTools", { defaultValue: "Developer tools" }))}
            <DropdownSeparator />
            {isAdmin && (
              <DropdownItem icon={<Key />} onClick={() => navigate(`${adminPath}/keys`)}>
                {t("userMenu.apiKeys", { defaultValue: "API keys" })}
              </DropdownItem>
            )}
            {isAdmin && (
              <DropdownItem icon={<Webhook />} onClick={() => navigate(`${adminPath}/webhooks`)}>
                {t("userMenu.webHooks", { defaultValue: "Webhooks" })}
              </DropdownItem>
            )}
            {isAdmin && (
              <DropdownItem icon={<Clock />} onClick={() => navigate(`${adminPath}/sessions`)}>
                {t("userMenu.sessions", { defaultValue: "Sessions" })}
              </DropdownItem>
            )}
            {canReadAudit && (
              <DropdownItem icon={<FileText />} onClick={() => navigate(`${adminPath}/audit`)}>
                {t("userMenu.auditLogs", { defaultValue: "Audit logs" })}
              </DropdownItem>
            )}
            {isAdmin && (
              <DropdownItem icon={<Terminal />} onClick={() => navigate(`${adminPath}/rest-playground`)}>
                {t("userMenu.apiExplorer", { defaultValue: "API explorer" })}
              </DropdownItem>
            )}
            {isAdmin && apiAccess.graphqlEnabled && (
              <DropdownItem icon={<Zap />} onClick={() => navigate(`${adminPath}/graphql`)}>
                {t("userMenu.graphqlPlayground", { defaultValue: "GraphQL playground" })}
              </DropdownItem>
            )}
          </>
        ) : (
          <>
            {back(t("userMenu.helpResources", { defaultValue: "Help & resources" }))}
            <DropdownSeparator />
            <DropdownItem icon={<Activity />} onClick={() => navigate(`${adminPath}/content-health`)}>
              {t("userMenu.contentHealth", { defaultValue: "Content health" })}
            </DropdownItem>
            <DropdownItem icon={<Activity />} onClick={() => navigate(`${adminPath}/api-health`)}>
              {t("userMenu.apiHealth", { defaultValue: "API health" })}
            </DropdownItem>
            <DropdownItem
              icon={<ExternalLink />}
              onClick={() => window.open("https://kyro-cms.com/getting-started.html", "_blank", "noopener,noreferrer")}
            >
              {t("userMenu.documentation", { defaultValue: "Documentation" })}
            </DropdownItem>
            <DropdownItem
              icon={<HelpCircle />}
              onClick={() =>
                window.open("https://github.com/danielDozie/kyro-cms/issues/new", "_blank", "noopener,noreferrer")
              }
            >
              {t("userMenu.getSupport", { defaultValue: "Get support" })}
            </DropdownItem>
          </>
        )}
      </div>
    </Dropdown>
  );
}
