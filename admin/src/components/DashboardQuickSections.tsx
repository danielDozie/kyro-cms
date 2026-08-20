import React, { useEffect, useState } from "react";
import { adminPath } from "../lib/paths";
import { useAuthStore } from "../lib/stores";

interface DashboardQuickSectionsProps {
  collections: Record<string, any>;
  serverUserRole?: string;
  serverPermissions?: any;
}

export function DashboardQuickSections({
  collections,
  serverUserRole,
  serverPermissions,
}: DashboardQuickSectionsProps) {
  const storeAuth = useAuthStore();
  const [windowAuth, setWindowAuth] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__kyroAuth) {
      setWindowAuth((window as any).__kyroAuth);
    }
    const handleAuth = (e: any) => {
      if (e?.detail) {
        setWindowAuth(e.detail);
      } else if (typeof window !== "undefined") {
        setWindowAuth((window as any).__kyroAuth);
      }
    };
    window.addEventListener("kyro:auth-ready", handleAuth);
    return () => window.removeEventListener("kyro:auth-ready", handleAuth);
  }, []);

  const user = storeAuth.user || windowAuth?.user || null;
  const permissions = storeAuth.permissions || windowAuth?.permissions || serverPermissions || null;
  const role = user?.role || serverUserRole || "";

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isEditor = role === "editor";
  const isAuthor = role === "author";
  const isCustomer = role === "customer";

  // Helpers to check collection read/create permission
  const canReadCollection = (slug: string): boolean => {
    if (isAdmin) return true;
    if (permissions && permissions.collections && permissions.collections[slug]) {
      return permissions.collections[slug].read === true;
    }
    if (isEditor) {
      return !["users", "audit_logs", "roles", "plugins", "keys", "webhooks", "settings"].includes(slug);
    }
    if (isAuthor) {
      return ["posts", "categories", "orders"].includes(slug);
    }
    if (isCustomer) {
      return ["orders"].includes(slug);
    }
    return false;
  };

  const canCreateCollection = (slug: string): boolean => {
    if (isAdmin) return true;
    if (permissions && permissions.collections && permissions.collections[slug]) {
      return permissions.collections[slug].create === true;
    }
    if (isEditor) {
      return !["users", "audit_logs", "roles", "plugins", "keys", "webhooks", "settings"].includes(slug);
    }
    if (isAuthor) {
      return ["posts", "categories"].includes(slug);
    }
    if (isCustomer) {
      return ["orders"].includes(slug);
    }
    return false;
  };

  // ── Quick Actions RBAC List ──
  const allQuickActions = [
    {
      id: "profile",
      label: "Edit Account Profile",
      description: "Manage your personal profile and account details",
      href: user?.id ? `${adminPath}/users/${user.id}` : `${adminPath}/users`,
      visible: !!user,
    },
    {
      id: "media",
      label: "Media Assets Library",
      description: "Upload and manage images, documents and files",
      href: `${adminPath}/media`,
      visible: !isCustomer && (isAdmin || isAuthor || isEditor || canReadCollection("media")),
    },
    {
      id: "orders",
      label: "Order History",
      description: "View past orders and purchases",
      href: `${adminPath}/orders`,
      visible: !!collections["orders"] && canReadCollection("orders"),
    },
    {
      id: "users",
      label: "User Management",
      description: "Manage team accounts, roles & customer profiles",
      href: `${adminPath}/users`,
      visible: isAdmin || canReadCollection("users"),
    },
    {
      id: "roles",
      label: "Roles & Permissions",
      description: "RBAC inheritance rules and granted permission matrices",
      href: `${adminPath}/roles`,
      visible: isSuperAdmin,
    },
    {
      id: "audit",
      label: "Security Audit Logs",
      description: "Monitor user actions, auth attempts and system logs",
      href: `${adminPath}/audit`,
      visible: isAdmin || canReadCollection("audit_logs"),
    },
    {
      id: "keys",
      label: "API Keys",
      description: "Generate and manage programmatic API keys",
      href: `${adminPath}/keys`,
      visible: isAdmin,
    },
    {
      id: "webhooks",
      label: "Webhooks",
      description: "Configure event-driven webhook subscriptions",
      href: `${adminPath}/webhooks`,
      visible: isAdmin,
    },
    {
      id: "rest",
      label: "REST API Explorer",
      description: "Test and inspect CMS API endpoints",
      href: `${adminPath}/rest-playground`,
      visible: isAdmin,
    },
    {
      id: "graphql",
      label: "GraphQL Playground",
      description: "Interactive schema query editor and docs",
      href: `${adminPath}/graphql`,
      visible: isAdmin,
    },
    {
      id: "health",
      label: "API System Health",
      description: "Real-time API status, memory and database health",
      href: `${adminPath}/health`,
      visible: isAdmin,
    },
    {
      id: "settings",
      label: "System Settings",
      description: "Global site preferences, SEO & API configuration",
      href: `${adminPath}/settings`,
      visible: isAdmin,
    },
  ];

  const visibleQuickActions = allQuickActions.filter((action) => action.visible);

  // ── Explore Content RBAC List ──
  const exploreCollections = Object.entries(collections)
    .filter(([slug]) => !["users", "audit_logs", "media"].includes(slug))
    .filter(([slug]) => canReadCollection(slug))
    .map(([slug, config]: [string, any]) => {
      const label = config.label || slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const canCreate = canCreateCollection(slug);
      return {
        slug,
        label,
        canCreate,
        href: `${adminPath}/${slug}`,
        newHref: `${adminPath}/${slug}/new`,
      };
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {/* ── Quick Actions ── */}
      <div className="surface-tile p-5 rounded-lg border border-[var(--kyro-border)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--kyro-text-primary)]">Quick Actions</h2>
              <p className="text-[11px] text-[var(--kyro-text-secondary)] mt-0.5">Shortcuts available for your role</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)]">
              {visibleQuickActions.length} Actions
            </span>
          </div>

          <div className="space-y-1">
            {visibleQuickActions.map((action) => (
              <a
                key={action.id}
                href={action.href}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--kyro-surface-accent)] text-xs text-[var(--kyro-text-primary)] transition-colors group"
              >
                <div>
                  <p className="font-medium text-[var(--kyro-text-primary)]">{action.label}</p>
                </div>
                <span className="text-[var(--kyro-text-muted)] group-hover:text-[var(--kyro-text-primary)] transition-colors">
                  →
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Explore Content ── */}
      <div className="surface-tile p-5 rounded-lg border border-[var(--kyro-border)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--kyro-text-primary)]">Explore Content</h2>
              <p className="text-[11px] text-[var(--kyro-text-secondary)] mt-0.5">Collections accessible to your account</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-secondary)]">
              {exploreCollections.length} Collections
            </span>
          </div>

          {exploreCollections.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--kyro-text-muted)]">No accessible collections</div>
          ) : (
            <div className="space-y-1">
              {exploreCollections.map((col) => (
                <div
                  key={col.slug}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--kyro-surface-accent)] text-xs transition-colors group"
                >
                  <a href={col.href} className="font-medium text-[var(--kyro-text-primary)] hover:underline flex-1">
                    {col.label}
                  </a>
                  <div className="flex items-center gap-2">
                    {col.canCreate && (
                      <a
                        href={col.newHref}
                        className="text-[10px] font-medium px-2 py-0.5 rounded border border-[var(--kyro-border)] bg-[var(--kyro-surface)] text-[var(--kyro-text-secondary)] hover:text-[var(--kyro-text-primary)] transition-colors"
                      >
                        + New
                      </a>
                    )}
                    <a href={col.href} className="text-[var(--kyro-text-muted)] group-hover:text-[var(--kyro-text-primary)] transition-colors">
                      →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
