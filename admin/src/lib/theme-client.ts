export type AppearanceMode = "system" | "light" | "dark";

export function getAppearanceMode(): AppearanceMode {
  const stored = localStorage.getItem("theme");
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyAppearance(mode = getAppearanceMode()) {
  const isDark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.dataset.themeMode = mode;
  document.querySelectorAll<HTMLButtonElement>("[data-theme-choice]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === mode));
  });
  document.querySelectorAll<HTMLElement>("[data-theme-label]").forEach(label => { label.textContent = mode[0].toUpperCase() + mode.slice(1); });
}

export function setAppearanceMode(mode: AppearanceMode) {
  localStorage.setItem("theme", mode);
  applyAppearance(mode);
  window.dispatchEvent(new CustomEvent("kyro:theme-changed", { detail: { mode } }));
}

let attached = false;
export function setupAppearance() {
  applyAppearance();
  if (attached) return;
  attached = true;
  document.addEventListener("astro:page-load", () => applyAppearance());
  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const choice = event.target.closest<HTMLButtonElement>("[data-theme-choice]");
    const mode = choice?.dataset.themeChoice;
    if (mode === "system" || mode === "light" || mode === "dark") {
      setAppearanceMode(mode);
      const disclosure = choice?.closest<HTMLDetailsElement>(".theme-switcher");
      if (disclosure) { disclosure.open = false; disclosure.querySelector<HTMLElement>("summary")?.focus(); }
    }
    document.querySelectorAll<HTMLDetailsElement>(".theme-switcher[open]").forEach(disclosure => {
      if (!disclosure.contains(event.target as Node)) disclosure.open = false;
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    document.querySelectorAll<HTMLDetailsElement>(".theme-switcher[open]").forEach(disclosure => {
      disclosure.open = false; disclosure.querySelector<HTMLElement>("summary")?.focus();
    });
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (getAppearanceMode() === "system") applyAppearance(); });
  window.addEventListener("storage", event => { if (event.key === "theme") applyAppearance(); });
}
