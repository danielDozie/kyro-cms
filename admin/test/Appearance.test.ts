import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("workspace appearance", () => {
  let systemDark: boolean;
  let dark: boolean;
  let values: Map<string, string>;
  let root: { dataset: Record<string, string>; classList: { toggle: ReturnType<typeof vi.fn> } };
  let choices: { dataset: { themeChoice: string }; setAttribute: ReturnType<typeof vi.fn> }[];
  let mediaChanged: () => void;
  let storageChanged: (event: { key: string }) => void;
  const documentListener = vi.fn();
  const mediaListener = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    documentListener.mockClear();
    mediaListener.mockClear();
    systemDark = true;
    dark = false;
    values = new Map();
    choices = ["system", "light", "dark"].map(themeChoice => ({ dataset: { themeChoice }, setAttribute: vi.fn() }));
    root = { dataset: {}, classList: { toggle: vi.fn((_name: string, enabled: boolean) => { dark = enabled; }) } };
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    vi.stubGlobal("matchMedia", () => ({ get matches() { return systemDark; }, addEventListener: (_event: string, callback: () => void) => { mediaListener(); mediaChanged = callback; } }));
    vi.stubGlobal("document", { documentElement: root, querySelectorAll: (selector: string) => selector === "[data-theme-choice]" ? choices : [], addEventListener: documentListener });
    vi.stubGlobal("window", { dispatchEvent: vi.fn(), addEventListener: (_event: string, callback: typeof storageChanged) => { storageChanged = callback; } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(["light", "dark"] as const)("keeps an explicit %s preference independent of the OS", async mode => {
    const { setAppearanceMode } = await import("../src/lib/theme-client");
    systemDark = mode === "light";
    setAppearanceMode(mode);
    expect(dark).toBe(mode === "dark");
    expect(values.get("theme")).toBe(mode);
    expect(root.dataset.themeMode).toBe(mode);
    expect(choices.find(choice => choice.dataset.themeChoice === mode)?.setAttribute).toHaveBeenCalledWith("aria-pressed", "true");
  });

  it("follows OS changes in system mode and stops following after an explicit choice", async () => {
    const { setupAppearance, setAppearanceMode } = await import("../src/lib/theme-client");
    setupAppearance();
    expect(dark).toBe(true);
    expect(root.dataset.themeMode).toBe("system");
    systemDark = false;
    mediaChanged();
    expect(dark).toBe(false);
    setAppearanceMode("dark");
    mediaChanged();
    expect(dark).toBe(true);
    setAppearanceMode("system");
    expect(dark).toBe(false);
    expect(values.get("theme")).toBe("system");
  });

  it("synchronizes changes made in another tab", async () => {
    const { setupAppearance } = await import("../src/lib/theme-client");
    setupAppearance();
    values.set("theme", "light");
    storageChanged({ key: "theme" });
    expect(dark).toBe(false);
    expect(root.dataset.themeMode).toBe("light");
  });

  it("does not duplicate listeners across page initialization", async () => {
    const { setupAppearance } = await import("../src/lib/theme-client");
    setupAppearance();
    setupAppearance();
    expect(documentListener).toHaveBeenCalledTimes(3);
    expect(mediaListener).toHaveBeenCalledTimes(1);
  });
});
