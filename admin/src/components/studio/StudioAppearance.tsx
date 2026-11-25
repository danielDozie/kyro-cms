import React, { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { Dropdown, DropdownItem } from "../ui/Dropdown";
import { getAppearanceMode, setAppearanceMode, type AppearanceMode } from "../../lib/theme-client";
export function useWorkspaceAppearance() {
  const read = () => ({
    mode: typeof document === "undefined" ? ("system" as AppearanceMode) : getAppearanceMode(),
    theme:
      typeof document !== "undefined" && document.documentElement.classList.contains("dark")
        ? ("dark" as const)
        : ("light" as const),
  });
  const [state, setState] = useState(read);
  useEffect(() => {
    const update = () => setState(read());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme-mode"] });
    update();
    return () => observer.disconnect();
  }, []);
  return state;
}
export function StudioAppearance({ mode }: { mode: AppearanceMode }) {
  const Icon = mode === "system" ? Monitor : mode === "dark" ? Moon : Sun;
  return (
    <Dropdown
      trigger={
        <button type="button" className="visual-studio-icon" aria-label="Appearance" title={`Appearance: ${mode}`}>
          <Icon size={15} />
        </button>
      }
      direction="down"
    >
      {[
        { id: "system", label: "System", Icon: Monitor },
        { id: "light", label: "Light", Icon: Sun },
        { id: "dark", label: "Dark", Icon: Moon },
      ].map(({ id, label, Icon }) => (
        <DropdownItem key={id} onClick={() => setAppearanceMode(id as AppearanceMode)} icon={<Icon size={14} />}>
          <span>
            {label}
            {mode === id ? " ✓" : ""}
          </span>
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
