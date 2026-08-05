import { useState, useEffect } from "react";

/**
 * Custom React hook to detect client-side mounting.
 * Returns `false` during server-side rendering (Node SSR)
 * and `true` once mounted on the browser client.
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
