let projectController: AbortController | undefined;

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
      const slug = item.getAttribute("data-slug") || "";
      if (item.getAttribute("data-project-collection") !== "true") return;
      if (!allowedSet.has(slug)) {
        (item as HTMLElement).style.display = "none";
        const row = item.closest("li");
        if (row) row.hidden = true;
      }
    });
  } catch {
    // Fallback gracefully on parsing error
  }
}

export function initSidebar(adminPath: string) {
  projectController?.abort();
  projectController = new AbortController();
  const { signal } = projectController;
  const switcherBtn = document.getElementById("project-switcher-btn");
  const switcherMenu = document.getElementById("project-switcher-menu");
  let switcherBackdrop = document.getElementById("project-switcher-backdrop");
  if (!switcherBackdrop) {
    switcherBackdrop = document.createElement("div");
    switcherBackdrop.id = "project-switcher-backdrop";
    switcherBackdrop.className = "project-picker-backdrop hidden";
    switcherBackdrop.setAttribute("aria-hidden", "true");
  }
  if (switcherBackdrop && switcherBackdrop.parentElement !== document.body) document.body.appendChild(switcherBackdrop);
  if (switcherMenu && switcherMenu.parentElement !== document.body) document.body.appendChild(switcherMenu);
  const choices = Array.from(document.querySelectorAll<HTMLElement>("[data-project-choice]"));
  const closeProjectMenu = (restoreFocus = false) => {
    switcherMenu?.classList.add("hidden");
    switcherBackdrop?.classList.add("hidden");
    switcherBtn?.setAttribute("aria-expanded", "false");
    if (restoreFocus) switcherBtn?.focus();
  };
  const showSelection = (choice: HTMLElement, persist: boolean) => {
    const id = choice.dataset.projId || "";
    const name = choice.dataset.projName || "";
    const env = choice.dataset.projEnv || "Production";
    const org = choice.dataset.projOrg || "Workspace";
    const collectionsJson = choice.dataset.projCollections || "[]";
    const projKey = choice.dataset.projKey || id || name;
    const values: Record<string, string> = { "active-project-name": name, "active-project-org": org, "active-project-env": env };
    if (switcherBtn) switcherBtn.title = `${org} / ${name} (${env})`;
    const note = document.getElementById("project-context-note");
    if (note) {
      note.classList.add("hidden");
      note.textContent = "";
    }
    const currentSlug = window.location.pathname.slice(adminPath.length).split("/").filter(Boolean)[0];
    const isCollection = Array.from(document.querySelectorAll<HTMLElement>('[data-project-collection="true"]')).some(item => item.dataset.slug === currentSlug);
    let allowed: string[] = [];
    try { allowed = JSON.parse(collectionsJson); } catch {}
    const outside = isCollection && allowed.length > 0 && !allowed.includes(currentSlug);

    Object.entries(values).forEach(([key, value]) => { const element = document.getElementById(key); if (element) element.textContent = value; });
    choices.forEach(item => { const selected = item.dataset.projKey === choice.dataset.projKey; item.setAttribute("aria-pressed", String(selected)); item.classList.toggle("is-selected", selected); });
    const summary = document.getElementById("workspace-active-summary");
    if (summary) summary.textContent = `Active project: ${name}${org !== "Workspace" ? ` · ${org}` : ""}`;
    choices.forEach(item => { const label = item.querySelector("[data-project-action-label]"); if (label) label.textContent = item.dataset.projKey === choice.dataset.projKey ? "Active project" : "Use project"; });
    localStorage.setItem("kyro-active-project-id", id);
    localStorage.setItem("kyro-active-project-key", projKey);
    localStorage.setItem("kyro-active-project-name", name);
    localStorage.setItem("kyro-active-project-org", org);
    localStorage.setItem("kyro-active-project-env", env);
    localStorage.setItem("kyro-active-project-collections", collectionsJson);
    document.cookie = `kyro-active-project=${encodeURIComponent(projKey)}; path=/; max-age=31536000; SameSite=Lax`;

    if (persist) {
      // If user switched project and current collection is outside the new project scope,
      // seamlessly redirect to the first allowed collection view
      if (outside && allowed.length > 0) {
        window.location.replace(`${adminPath}/${allowed[0]}`);
        return;
      }
      // If on the dashboard, reload so SSR metrics and charts refresh for the new active project
      const isDashboard = window.location.pathname === adminPath || window.location.pathname === `${adminPath}/`;
      if (isDashboard) {
        window.location.reload();
        return;
      }
      pruneSidebar(adminPath);
      let collections: string[] = [];
      try { collections = JSON.parse(collectionsJson); } catch {}
      window.dispatchEvent(new CustomEvent("kyro:project-changed", { detail: { id, name, org, env, collections } }));
      return;
    }

    // Hydration check on initial load:
    if (outside && allowed.length > 0) {
      const owningChoice = choices.find(c => {
        try {
          const cols: string[] = JSON.parse(c.dataset.projCollections || "[]");
          return cols.includes(currentSlug);
        } catch {
          return false;
        }
      });
      if (owningChoice) {
        showSelection(owningChoice, true);
        return;
      }
      window.location.replace(`${adminPath}/${allowed[0]}`);
      return;
    }
  };
  const cookieMatch = document.cookie.match(/(?:^|;\s*)kyro-active-project=([^;]+)/);
  const cookieKey = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  const savedKey = cookieKey || localStorage.getItem("kyro-active-project-key") || localStorage.getItem("kyro-active-project-id");
  const selected = choices.find(choice => choice.dataset.projKey === savedKey || (!!savedKey && choice.dataset.projId === savedKey)) || choices.find(choice => choice.dataset.projName === localStorage.getItem("kyro-active-project-name")) || choices[0];
  if (selected) showSelection(selected, false);
  if (switcherBtn && switcherMenu) {
    const openProjectMenu = () => {
      const rect = switcherBtn.getBoundingClientRect();
      switcherMenu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 276))}px`;
      switcherMenu.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 220)}px`;
      switcherMenu.style.maxHeight = `${Math.max(120, Math.min(320, window.innerHeight - rect.bottom - 24))}px`;
      switcherBackdrop?.classList.remove("hidden");
      switcherMenu.classList.remove("hidden"); switcherBtn.setAttribute("aria-expanded", "true");
      document.getElementById("project-picker-search")?.focus();
    };
    switcherBtn.addEventListener("click", event => { event.stopPropagation(); if (switcherMenu.classList.contains("hidden")) openProjectMenu(); else closeProjectMenu(); }, { signal });
    switcherBackdrop?.addEventListener("click", () => closeProjectMenu(), { signal });
    document.addEventListener("click", event => { if (!switcherMenu.contains(event.target as Node) && !switcherBtn.contains(event.target as Node)) closeProjectMenu(); }, { signal });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !switcherMenu.classList.contains("hidden")) closeProjectMenu(true); }, { signal });
    window.addEventListener("resize", () => closeProjectMenu(), { signal });
    document.getElementById("project-picker-search")?.addEventListener("input", event => {
      const query = (event.target as HTMLInputElement).value.toLowerCase(); let count = 0;
      switcherMenu.querySelectorAll<HTMLElement>("[data-project-row]").forEach(row => { const show = `${row.dataset.projName} ${row.dataset.projOrg}`.toLowerCase().includes(query); row.hidden = !show; if (show) count++; });
      switcherMenu.querySelectorAll<HTMLElement>("[data-project-group]").forEach(group => { group.hidden = !group.querySelector("[data-project-row]:not([hidden])"); });
      document.getElementById("project-picker-empty")?.classList.toggle("hidden", count > 0);
    }, { signal });
  }
  choices.forEach(choice => choice.addEventListener("click", () => { showSelection(choice, true); closeProjectMenu(true); }, { signal }));

  document.getElementById("sidebar-group-flyout")?.remove();
  let flyoutTrigger: HTMLElement | null = null;
  const closeFlyout = (restoreFocus = false) => {
    document.getElementById("sidebar-group-flyout")?.remove();
    flyoutTrigger?.setAttribute("aria-expanded", "false");
    if (flyoutTrigger?.dataset.sectionControl) flyoutTrigger.setAttribute("aria-controls", flyoutTrigger.dataset.sectionControl);
    if (restoreFocus) flyoutTrigger?.focus({ preventScroll: true });
    flyoutTrigger = null;
  };
  document.addEventListener("click", event => {
    if (!(event.target instanceof Node) || document.getElementById("sidebar-group-flyout")?.contains(event.target)) return;
    closeFlyout();
  }, { signal });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && flyoutTrigger) { event.preventDefault(); closeFlyout(true); }
  }, { signal });
  window.addEventListener("resize", () => closeFlyout(), { signal });
  document.getElementById("sidebar-nav")?.addEventListener("scroll", () => closeFlyout(), { signal });
  document.getElementById("sidebar-panel-toggle")?.addEventListener("click", () => closeFlyout(), { signal });
  const sections = document.querySelectorAll("[data-section]");
  sections.forEach((section) => {
    const label = section.getAttribute("data-section");
    const toggleBtn = section.querySelector(".sidebar-section-toggle");
    const itemsContainer = section.querySelector(".section-items");

    const hasActiveDocument = !!section.querySelector('[aria-current="page"]');
    const isCollapsed = label !== "Dashboard" && !hasActiveDocument && localStorage.getItem(`kyro-sidebar-collapsed-${label}`) === "true";
    toggleBtn?.setAttribute("aria-expanded", String(!isCollapsed));
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
        const sidebar = document.getElementById("kyro-sidebar");
        if (sidebar?.getAttribute("data-minimized") === "true") {
          const trigger = newToggleBtn as HTMLElement;
          const sameTrigger = flyoutTrigger === trigger;
          closeFlyout();
          if (sameTrigger || !itemsContainer) return;
          const flyout = document.createElement("nav");
          flyout.id = "sidebar-group-flyout";
          flyout.className = "sidebar-group-flyout";
          const title = trigger.getAttribute("aria-label") || label || "Navigation";
          flyout.setAttribute("aria-label", title);
          const heading = document.createElement("div");
          heading.className = "sidebar-group-flyout-heading";
          heading.textContent = title;
          flyout.appendChild(heading);
          itemsContainer.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link => {
            if (link.closest("li")?.hidden || link.style.display === "none") return;
            const copy = link.cloneNode(true) as HTMLAnchorElement;
            copy.removeAttribute("id");
            copy.removeAttribute("title");
            copy.className = "sidebar-group-flyout-link";
            copy.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
            copy.querySelectorAll<HTMLElement>(".sidebar-text").forEach(node => { node.className = ""; node.style.cssText = ""; });
            copy.addEventListener("click", () => closeFlyout());
            flyout.appendChild(copy);
          });
          document.body.appendChild(flyout);
          const rect = trigger.getBoundingClientRect();
          flyout.style.left = `${Math.min(rect.right + 10, window.innerWidth - flyout.offsetWidth - 8)}px`;
          flyout.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - flyout.offsetHeight - 8))}px`;
          flyoutTrigger = trigger;
          trigger.setAttribute("aria-expanded", "true");
          trigger.dataset.sectionControl = itemsContainer.id;
          trigger.setAttribute("aria-controls", flyout.id);
          flyout.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
          return;
        }
        const currentlyCollapsed = section.getAttribute("data-collapsed") === "true";
        (newToggleBtn as HTMLElement).setAttribute("aria-expanded", String(currentlyCollapsed));
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
    const row = item.closest("li");
    if (row) row.hidden = !hasAccess;
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
      "fixed z-[9999] pointer-events-none opacity-0 transition-opacity duration-150 ease-out px-2.5 py-1.5 text-xs font-semibold rounded-sm bg-[var(--kyro-surface-accent)] text-[var(--kyro-text-primary)] border border-[var(--kyro-border)] whitespace-nowrap hidden";
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
  let toggleBtn = document.getElementById("sidebar-panel-toggle");
  if (!sidebar || !toggleBtn) return;

  const updateMinimizedUI = (isMin: boolean) => {
    toggleBtn?.setAttribute("aria-expanded", String(!isMin));
    const label = toggleBtn?.querySelector(".sidebar-collapse-label");
    if (label) label.textContent = isMin ? "Expand sidebar" : "Collapse sidebar";
    sidebar.querySelectorAll<HTMLElement>("[data-section]").forEach(section => {
      section.querySelector(".sidebar-section-toggle")?.setAttribute("aria-expanded", String(!isMin && section.dataset.collapsed !== "true"));
    });
    if (isMin) {
      sidebar.setAttribute("data-minimized", "true");
      sidebar.classList.remove("w-[240px]");
      sidebar.classList.add("w-[76px]");
      toggleBtn?.setAttribute("title", "Expand sidebar");
      toggleBtn?.setAttribute("aria-label", "Expand sidebar");
    } else {
      sidebar.removeAttribute("data-minimized");
      sidebar.classList.remove("w-[76px]");
      sidebar.classList.add("w-[240px]");
      toggleBtn?.setAttribute("title", "Collapse sidebar");
      toggleBtn?.setAttribute("aria-label", "Collapse sidebar");
    }
  };

  const savedMin = localStorage.getItem("kyro-sidebar-minimized") === "true";
  updateMinimizedUI(savedMin);

  const newToggleBtn = toggleBtn.cloneNode(true);
  if (toggleBtn.parentNode) {
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    toggleBtn = newToggleBtn as HTMLElement;
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
