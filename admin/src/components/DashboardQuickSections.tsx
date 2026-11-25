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
      id: "content-health",
      label: "Content Health & Quality",
      description: "Audit SEO tags, image alt-texts & schema validity",
      href: `${adminPath}/content-health`,
      visible: isAdmin || isEditor || isAuthor,
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

  const createActions = exploreCollections.filter(col => col.canCreate).slice(0, 3);
  const dailyActions = visibleQuickActions.filter(action => ["media", "content-health", "orders"].includes(action.id)).slice(0, 3);
  const otherActions = visibleQuickActions.filter(action => !dailyActions.includes(action));
  return <section className="workspace-shortcuts" aria-labelledby="shortcut-heading">
    <h2 className="workspace-section-title" id="shortcut-heading">Start something</h2>
    <div className="workspace-shortcut-grid">
      {createActions.map(col => <a key={col.slug} href={col.newHref}><span className="workspace-shortcut-mark" aria-hidden="true">+</span><span><strong>Create {col.label}</strong><span>Add a new document</span></span><span aria-hidden="true">→</span></a>)}
      {dailyActions.map(action => <a key={action.id} href={action.href}><span className="workspace-shortcut-mark" aria-hidden="true">↗</span><span><strong>{action.label}</strong><span>{action.description}</span></span><span aria-hidden="true">→</span></a>)}
    </div>
    {otherActions.length > 0 && <details className="workspace-more-tools"><summary>More workspace tools <span>{otherActions.length}</span></summary><div>{otherActions.map(action => <a key={action.id} href={action.href}>{action.label}<span aria-hidden="true">↗</span></a>)}</div></details>}
  </section>;
}
