import React from "react";
import { useIsMounted } from "../../hooks/useIsMounted";

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Reusable wrapper component that renders `fallback` during server-side rendering (SSR)
 * and renders `children` once mounted on the client.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
