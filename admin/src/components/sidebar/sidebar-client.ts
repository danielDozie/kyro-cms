export function applyProjectFilter(allowedCollectionsJson?: string | null) {
  if (!allowedCollectionsJson) return;
  try {
    const allowed: string[] = JSON.parse(allowedCollectionsJson);
    if (!Array.isArray(allowed) || allowed.length === 0) {
      // No collection restrictions on this project, show all permitted by RBAC
      return;
    }

    const allowedSet = new Set(allowed);
    const navItems = document.querySelectorAll("[data-nav-item]");
    navItems.forEach((item) => {
      const type = item.getAttribute("data-type");
      const slug = item.getAttribute("data-slug") || "";
      const isDashboard = item.getAttribute("data-is-dashboard") === "true";
      if (isDashboard || type !== "collection" || slug === "media" || slug === "users" || slug === "audit_logs") {
        return;
      }
      if (!allowedSet.has(slug)) {
        (item as HTMLElement).style.display = "none";
      }
    });
  } catch {
    // Fallback gracefully on parsing error
  }
}

export function initSidebar(adminPath: string) {
  // Project / Tenancy Switcher
  const switcherBtn = document.getElementById("project-switcher-btn");
  const switcherMenu = document.getElementById("project-switcher-menu");
  const activeNameEl = document.getElementById("active-project-name");
  const activeEnvEl = document.getElementById("active-project-env");

  if (switcherBtn && switcherMenu) {
    const savedProjName = localStorage.getItem("kyro-active-project-name");
    const savedProjEnv = localStorage.getItem("kyro-active-project-env");
    const savedProjCollections = localStorage.getItem("kyro-active-project-collections");

    if (savedProjName && activeNameEl) activeNameEl.textContent = savedProjName;
    if (savedProjEnv && activeEnvEl) activeEnvEl.textContent = savedProjEnv;
    if (savedProjCollections) applyProjectFilter(savedProjCollections);

    switcherBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      switcherMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!switcherMenu.contains(e.target as Node) && !switcherBtn.contains(e.target as Node)) {
        switcherMenu.classList.add("hidden");
      }
    });

    const items = switcherMenu.querySelectorAll(".project-switcher-item");
    items.forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-proj-id") || "";
        const name = item.getAttribute("data-proj-name") || "";
        const env = item.getAttribute("data-proj-env") || "";
        const collectionsJson = item.getAttribute("data-proj-collections") || "[]";

        if (activeNameEl) activeNameEl.textContent = name;
        if (activeEnvEl) activeEnvEl.textContent = env;

        localStorage.setItem("kyro-active-project-id", id);
        localStorage.setItem("kyro-active-project-name", name);
        localStorage.setItem("kyro-active-project-env", env);
        localStorage.setItem("kyro-active-project-collections", collectionsJson);

        switcherMenu.classList.add("hidden");

        // Re-run RBAC pruning then apply project-level filtering
        pruneSidebar(adminPath);
        applyProjectFilter(collectionsJson);

        window.dispatchEvent(
          new CustomEvent("kyro:project-changed", {
            detail: { id, name, env, collections: JSON.parse(collectionsJson) },
          }),
        );
      });
    });
  }

  const sections = document.querySelectorAll("[data-section]");
  sections.forEach((section) => {
    const label = section.getAttribute("data-section");
    const toggleBtn = section.querySelector(".sidebar-section-toggle");
    const itemsContainer = section.querySelector(".section-items");

    const isCollapsed = localStorage.getItem(`kyro-sidebar-collapsed-${label}`) === "true";
    if (isCollapsed) {
      section.setAttribute("data-collapsed", "true");
      if (itemsContainer) itemsContainer.classList.add("hidden");
    } else {
      section.removeAttribute("data-collapsed");
      if (itemsContainer) itemsContainer.classList.remove("hidden");
    }

    // Remove old listeners to prevent duplicates
    const newToggleBtn = toggleBtn?.cloneNode(true);
    if (toggleBtn && newToggleBtn && toggleBtn.parentNode) {
      toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
      newToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentlyCollapsed = section.getAttribute("data-collapsed") === "true";
        if (currentlyCollapsed) {
          section.removeAttribute("data-collapsed");
          if (itemsContainer) itemsContainer.classList.remove("hidden");
          localStorage.setItem(`kyro-sidebar-collapsed-${label}`, "false");
        } else {
          section.setAttribute("data-collapsed", "true");
          if (itemsContainer) itemsContainer.classList.add("hidden");
          localStorage.setItem(`kyro-sidebar-collapsed-${label}`, "true");
        }
      });
    }
  });
}

export function pruneSidebar(adminPath: string, user?: any, permissions?: any) {
  if (!user) {
    // @ts-ignore
    user = window.__kyroAuth?.user;
    // @ts-ignore
    permissions = window.__kyroAuth?.permissions;
  }
  if (!user) return;

  const userRole = user.role || "";
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  const isEditor = userRole === "editor";
  const isAuthor = userRole === "author";
  const isCustomer = userRole === "customer";

  const navItems = document.querySelectorAll("[data-nav-item]");
  navItems.forEach((item) => {
    const slug = item.getAttribute("data-slug") || "";
    const type = item.getAttribute("data-type") || "";

    let hasAccess = true;

    const isDashboard =
      item.getAttribute("data-is-dashboard") === "true" || item.getAttribute("href") === adminPath;
    if (isDashboard) {
      hasAccess = true;
    } else if (slug === "roles") {
      hasAccess = isSuperAdmin;
    } else if (slug === "plugins" || slug === "keys" || slug === "webhooks" || slug === "settings") {
      hasAccess = isAdmin;
    } else if (slug === "users") {
      hasAccess = isAdmin || permissions?.collections?.users?.read === true;
    } else if (slug === "audit" || slug === "audit_logs") {
      hasAccess = isAdmin || permissions?.collections?.audit_logs?.read === true;
    } else if (slug === "media") {
      hasAccess =
        !isCustomer && (isAdmin || isEditor || isAuthor || permissions?.collections?.media?.read === true);
    } else if (type === "collection") {
      if (isAdmin) {
        hasAccess = true;
      } else if (permissions?.collections?.[slug]) {
        hasAccess = permissions.collections[slug].read === true;
      } else if (isEditor) {
        hasAccess = !["users", "audit_logs", "roles", "plugins", "keys", "webhooks", "settings"].includes(slug);
      } else if (isAuthor) {
        hasAccess = ["posts", "categories", "orders"].includes(slug);
      } else if (isCustomer) {
        hasAccess = ["orders"].includes(slug);
      } else {
        hasAccess = false;
      }
    } else if (type === "global") {
      if (!isAdmin) {
        hasAccess = permissions?.globals?.[slug]?.read === true;
      }
    }

    if (!hasAccess) {
      (item as HTMLElement).style.display = "none";
    } else {
      (item as HTMLElement).style.display = "";
    }
  });

  // Apply saved project collection filter if active
  const savedProjCollections = localStorage.getItem("kyro-active-project-collections");
  if (savedProjCollections) {
    applyProjectFilter(savedProjCollections);
  }

  // Hide empty sections after RBAC & project filtering
  const sections = document.querySelectorAll("[data-section]");
  sections.forEach((section) => {
    const visibleItems = section.querySelectorAll('[data-nav-item]:not([style*="display: none"])');
    if (visibleItems.length === 0) {
      (section as HTMLElement).style.display = "none";
    } else {
      (section as HTMLElement).style.display = "";
    }
  });
}

export function initTooltips() {
  const sidebar = document.getElementById("kyro-sidebar");
  if (!sidebar) return;

  let tooltipBadge = document.getElementById("sidebar-tooltip-badge");
  if (!tooltipBadge) {
    tooltipBadge = document.createElement("div");
    tooltipBadge.id = "sidebar-tooltip-badge";
    tooltipBadge.className =
      "fixed z-[9999] pointer-events-none opacity-0 transition-opacity duration-150 ease-out px-2.5 py-1.5 text-xs font-semibold rounded-sm bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] border border-[var(--kyro-border)] shadow-md whitespace-nowrap hidden";
    document.body.appendChild(tooltipBadge);
  }

  const navItems = document.querySelectorAll("[data-nav-item]");
  navItems.forEach((item) => {
    const handleMouseEnter = () => {
      if (sidebar.getAttribute("data-minimized") !== "true") return;
      const textSpan = item.querySelector(".sidebar-text");
      const label = textSpan?.textContent?.trim() || item.getAttribute("title") || "";
      if (!label || !tooltipBadge) return;

      tooltipBadge.textContent = label;
      tooltipBadge.classList.remove("hidden");

      const rect = item.getBoundingClientRect();
      const top = rect.top + rect.height / 2;
      const left = rect.right + 10;

      tooltipBadge.style.top = `${top}px`;
      tooltipBadge.style.left = `${left}px`;
      tooltipBadge.style.transform = "translateY(-50%)";

      requestAnimationFrame(() => {
        tooltipBadge?.classList.remove("opacity-0");
        tooltipBadge?.classList.add("opacity-100");
      });
    };

    const handleMouseLeave = () => {
      if (!tooltipBadge) return;
      tooltipBadge.classList.remove("opacity-100");
      tooltipBadge.classList.add("opacity-0");
      setTimeout(() => {
        if (tooltipBadge?.classList.contains("opacity-0")) {
          tooltipBadge.classList.add("hidden");
        }
      }, 150);
    };

    item.removeEventListener("mouseenter", (item as any)._tpEnter);
    item.removeEventListener("mouseleave", (item as any)._tpLeave);
    (item as any)._tpEnter = handleMouseEnter;
    (item as any)._tpLeave = handleMouseLeave;
    item.addEventListener("mouseenter", handleMouseEnter);
    item.addEventListener("mouseleave", handleMouseLeave);
  });

  const navContainer = document.getElementById("sidebar-nav");
  if (navContainer) {
    navContainer.addEventListener(
      "scroll",
      () => {
        if (tooltipBadge) {
          tooltipBadge.classList.remove("opacity-100");
          tooltipBadge.classList.add("opacity-0", "hidden");
        }
      },
      { passive: true },
    );
  }
}

export function initPanelToggle() {
  const sidebar = document.getElementById("kyro-sidebar");
  const toggleBtn = document.getElementById("sidebar-panel-toggle");
  if (!sidebar || !toggleBtn) return;

  const updateMinimizedUI = (isMin: boolean) => {
    if (isMin) {
      sidebar.setAttribute("data-minimized", "true");
      sidebar.classList.remove("w-[280px]");
      sidebar.classList.add("w-[76px]");
      toggleBtn.setAttribute("title", "Expand Sidebar");
    } else {
      sidebar.removeAttribute("data-minimized");
      sidebar.classList.remove("w-[76px]");
      sidebar.classList.add("w-[280px]");
      toggleBtn.setAttribute("title", "Minimize Sidebar");
    }
  };

  const savedMin = localStorage.getItem("kyro-sidebar-minimized") === "true";
  updateMinimizedUI(savedMin);

  const newToggleBtn = toggleBtn.cloneNode(true);
  if (toggleBtn.parentNode) {
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    newToggleBtn.addEventListener("click", () => {
      const isNowMin = sidebar.getAttribute("data-minimized") !== "true";
      localStorage.setItem("kyro-sidebar-minimized", isNowMin ? "true" : "false");
      updateMinimizedUI(isNowMin);
    });
  }
}

export function setupSidebar(adminPath: string) {
  const runPruning = () => {
    initSidebar(adminPath);
    pruneSidebar(adminPath);
    initPanelToggle();
    initTooltips();
  };

  runPruning();
  document.addEventListener("astro:page-load", runPruning);

  window.addEventListener("kyro:auth-ready", (event) => {
    const { user, permissions } = (event as CustomEvent).detail || {};
    pruneSidebar(adminPath, user, permissions);
  });
}
