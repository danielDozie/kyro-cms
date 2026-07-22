import React, { useState, useEffect } from "react";
import { CommandPalette } from "./CommandPalette";
import { ConfirmModal } from "./Modal";
import { adminPath } from "../../lib/paths";
import { useTranslation } from "react-i18next";

interface Props {
  collections: Record<string, unknown>;
  globals: Record<string, unknown>;
}

export function CommandPaletteWrapper({ collections, globals }: Props) {
    const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    (window as { openCommandPalette?: () => void }).openCommandPalette = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      delete (window as { openCommandPalette?: () => void }).openCommandPalette;
    };
  }, []);

  const handleClose = () => setIsOpen(false);

  const handleLogoutConfirm = () => {
    document.getElementById("logout-btn")?.click();
    setShowLogoutConfirm(false);
  };

  const handleNavigate = (view: string, collection?: string, id?: string) => {
    if (view === "list" && collection) {
      window.location.href = `${adminPath}/${collection}`;
    } else if (view === "edit" && collection && id) {
      window.location.href = `${adminPath}/${collection}/${id}`;
    } else if (view === "create" && collection) {
      window.location.href = `${adminPath}/${collection}/new`;
    } else if (view === "settings" && collection) {
      window.location.href = `${adminPath}/settings/${collection}`;
    } else if (view === "media") {
      window.location.href = `${adminPath}/media`;
    } else if (view === "users") {
      window.location.href = `${adminPath}/users`;
    } else if (view === "audit") {
      window.location.href = `${adminPath}/audit`;
    } else if (view === "roles") {
      window.location.href = `${adminPath}/roles`;
    } else if (view === "api-explorer") {
      window.location.href = `${adminPath}/api-explorer`;
    } else if (view === "graphql") {
      window.location.href = `${adminPath}/graphql`;
    } else if (view === "rest") {
      window.location.href = `${adminPath}/rest-playground`;
    } else if (view === "theme") {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
    } else if (view === "logout") {
      setShowLogoutConfirm(true);
    }
  };

  return (
    <>
      <CommandPalette
        isOpen={isOpen}
        onClose={handleClose}
        collections={collections}
        globals={globals}
        onNavigate={handleNavigate}
      />
      <ConfirmModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
        title={t("tooltips.signOut", { defaultValue: "Sign Out" })}
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        variant="danger"
      />
    </>
  );
}
