import { useEffect } from "react";
import { useAuthStore, type AuthUser, type Permissions } from "../lib/stores";

/**
 * AuthBridge
 *
 * This component is the critical link between the vanilla-JS auth flow
 * (which runs in AdminLayout.astro and fires `kyro:auth-ready`) and the
 * React Zustand store (`useAuthStore`).
 *
 * It:
 *  1. Checks `window.__kyroAuth` immediately in case the event already fired
 *     before this component mounted (race condition on fast networks).
 *  2. Listens for the `kyro:auth-ready` custom event and populates the store.
 *
 * Once the store is hydrated, every React component that calls
 * `useAuthStore()` will automatically re-render with the correct permissions.
 */
export function AuthBridge() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  
  useEffect(() => {
    const { setUser, setLoading } = useAuthStore.getState();

    function populate(detail: { user: unknown; permissions: unknown }) {
      if (detail?.user) {
        setUser(detail.user as AuthUser, (detail.permissions ?? null) as Permissions | null);
      } else {
        // Unauthenticated – set loading to false so components don't hang
        setLoading(false);
      }
    }

    // Check if the event already fired before this component mounted
    const cached = (window as { __kyroAuth?: { user: unknown; permissions: unknown; verified: boolean } }).__kyroAuth;
    if (cached?.verified && cached?.user) {
      populate({ user: cached.user, permissions: cached.permissions ?? null });
      return; // No need to register the event listener
    }

    // Otherwise wait for the event
    const handler = (event: Event) => {
      populate((event as CustomEvent).detail);
    };

    window.addEventListener("kyro:auth-ready", handler);
    return () => window.removeEventListener("kyro:auth-ready", handler);
  }, []);

  return null;
}