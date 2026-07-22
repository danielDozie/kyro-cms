import React, { useState, useEffect } from "react";
import { Dropdown, DropdownItem, DropdownSeparator } from "./ui/Dropdown";
import { User, Shield, Key, Webhook, Clock, FileText, ExternalLink, HelpCircle, LogOut, Terminal, Zap } from "./ui/icons";
import { useAuthStore } from "../lib/stores";
import { apiGet } from "../lib/api";
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
    const avatar = currentUser?.avatar;
    if (typeof avatar === "string" && /^[0-9a-f-]+$/i.test(avatar)) {
      apiGet<any>(`/api/media/${avatar}`)
        .then((media) => setAvatarUrl(media?.thumbnailUrl || media?.url || null))
        .catch(() => setAvatarUrl(null));
    } else if (typeof avatar === "string") {
      setAvatarUrl(avatar);
    } else {
      setAvatarUrl(null);
    }
  }, [currentUser?.avatar]);

  useEffect(() => {
    apiGet<any>("/api/globals/access-settings")
      .then((res: any) => {
        const data = res?.data || res;
        setApiAccess(data?.apiAccess || {});
      })
      .catch(() => setApiAccess({}));
  }, []);

  return (
    <Dropdown
      align="right"
      trigger={
        <div
          className="flex justify-center p-.5 text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] hover:bg-[var(--kyro-surface)] rounded-xl transition-all shadow-sm active:scale-95"
          title={t("userMenu.account", { defaultValue: "Account" })}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
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

      <DropdownItem
        icon={<Shield className="w-4 h-4" />}
        onClick={() => navigate(`${adminPath}/roles`)}
      >
        {t("userMenu.permissions", { defaultValue: "Permissions" })}
      </DropdownItem>

      <DropdownSeparator />

      <div className="px-4 py-2 mb-1">
        <p className="text-[10px] font-medium tracking-[0.2em] text-[var(--kyro-text-secondary)] opacity-40">
          {t("userMenu.developer", { defaultValue: "Developer" })}
        </p>
      </div>

      <DropdownItem
        icon={<Key className="w-4 h-4" />}
        onClick={() => (navigate(`${adminPath}/keys`))}
      >
        {t("userMenu.apiKeys", { defaultValue: "API Keys" })}
      </DropdownItem>

      <DropdownItem
        icon={<Webhook className="w-4 h-4" />}
        onClick={() => (navigate(`${adminPath}/webhooks`))}
      >
        {t("userMenu.webHooks", { defaultValue: "Web Hooks" })}
      </DropdownItem>
      <DropdownItem
        icon={<Clock className="w-4 h-4" />}
        onClick={() => (navigate(`${adminPath}/sessions`))}
      >
        {t("userMenu.sessions", { defaultValue: "Sessions" })}
      </DropdownItem>
      <DropdownItem
        icon={<FileText className="w-4 h-4" />}
        onClick={() => (navigate(`${adminPath}/audit`))}
      >
        {t("userMenu.auditLogs", { defaultValue: "Audit Logs" })}
      </DropdownItem>

      <DropdownItem
        icon={<Terminal className="w-4 h-4" />}
        onClick={() => (navigate(`${adminPath}/rest-playground`))}
      >
        {t("userMenu.apiExplorer", { defaultValue: "API Explorer" })}
      </DropdownItem>

      {(apiAccess === null || apiAccess?.graphqlEnabled) && (
        <DropdownItem
          icon={<Zap className="w-4 h-4" />}
          onClick={() => (navigate(`${adminPath}/graphql`))}
        >
          {t("userMenu.graphqlPlayground", { defaultValue: "GraphQL Playground" })}
        </DropdownItem>
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
