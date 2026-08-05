import { useEffect } from "react";

type KeyCombo = "mod+s" | "mod+k" | "escape" | string;

/**
 * Reusable React hook for listening to keyboard shortcuts (e.g. Cmd+S, Cmd+K, Escape).
 */
export function useHotkey(combo: KeyCombo, callback: (event: KeyboardEvent) => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isCmdOrCtrl = event.metaKey || event.ctrlKey;
      const lowerKey = event.key.toLowerCase();

      if (combo === "mod+s" && isCmdOrCtrl && lowerKey === "s") {
        event.preventDefault();
        callback(event);
      } else if (combo === "mod+k" && isCmdOrCtrl && lowerKey === "k") {
        event.preventDefault();
        callback(event);
      } else if (combo === "escape" && lowerKey === "escape") {
        callback(event);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [combo, callback]);
}
