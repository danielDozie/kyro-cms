import { useState, useEffect } from "react";

/**
 * Reusable React hook for responsive screen breakpoint checks.
 * Returns `true` if window width matches the mobile query (defaults to max-width: 768px).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(query.matches);

    const listener = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, [breakpoint]);

  return isMobile;
}
