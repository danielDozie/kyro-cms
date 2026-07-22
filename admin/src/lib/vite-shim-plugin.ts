import type { Plugin } from "vite";

/**
 * Vite plugin that intercepts `use-sync-external-store/shim` and
 * `use-sync-external-store/shim/with-selector` imports and replaces them
 * with proper ESM implementations.
 *
 * Why this is needed:
 * - xstate-react (and other libs) import these shim files which are CJS-only.
 * - When @kyro-cms/admin is consumed as a local `file:` workspace dependency,
 *   Vite skips pre-bundling for its transitive deps entirely, so the raw CJS
 *   files are served directly to the browser — which cannot parse them.
 * - resolve.alias does not help because Vite's `resolveExportsOrImports` runs
 *   before alias matching for deep sub-path imports.
 * - optimizeDeps.include does not help because it only applies to external npm
 *   packages, not transitive deps of local workspace packages.
 * - A virtual Vite plugin with `enforce: "pre"` intercepts the import in the
 *   very first step of the resolution pipeline, before the filesystem is touched.
 *
 * useSyncExternalStoreWithSelector is NOT in the React core package, so we
 * provide a minimal, spec-compliant implementation using the native
 * useSyncExternalStore hook from React 18+.
 */
export function useSyncExternalStoreShimPlugin(): Plugin {
  const SHIM_ID = "\0virtual:use-sync-external-store-shim";
  const SHIM_WITH_SELECTOR_ID =
    "\0virtual:use-sync-external-store-shim-with-selector";

  const SHIM_PATHS = new Set([
    "use-sync-external-store/shim",
    "use-sync-external-store/shim/index.js",
    "use-sync-external-store",
  ]);

  const SHIM_WITH_SELECTOR_PATHS = new Set([
    "use-sync-external-store/shim/with-selector",
    "use-sync-external-store/shim/with-selector.js",
    "use-sync-external-store/with-selector",
    "use-sync-external-store/with-selector.js",
  ]);

  return {
    name: "use-sync-external-store-shim-fix",
    enforce: "pre",

    resolveId(id: string) {
      if (SHIM_PATHS.has(id)) return SHIM_ID;
      if (SHIM_WITH_SELECTOR_PATHS.has(id)) return SHIM_WITH_SELECTOR_ID;
    },

    load(id: string) {
      if (id === SHIM_ID) {
        // React 18+ ships useSyncExternalStore natively.
        return `export { useSyncExternalStore } from "react";`;
      }

      if (id === SHIM_WITH_SELECTOR_ID) {
        // useSyncExternalStoreWithSelector is not in React core.
        // This is a minimal, spec-compliant implementation that wraps
        // React's native useSyncExternalStore with selector memoisation.
        return `
import { useSyncExternalStore, useRef, useMemo } from "react";

export function useSyncExternalStoreWithSelector(
  subscribe,
  getSnapshot,
  getServerSnapshot,
  selector,
  isEqual
) {
  const memoRef = useRef(null);

  const memoizedSelector = useMemo(() => {
    let lastSnapshot = undefined;
    let lastSelection = undefined;
    let hasMemo = false;

    return (snapshot) => {
      if (!hasMemo || !Object.is(lastSnapshot, snapshot)) {
        const nextSelection = selector(snapshot);
        if (!hasMemo || !(isEqual ? isEqual(lastSelection, nextSelection) : Object.is(lastSelection, nextSelection))) {
          lastSnapshot = snapshot;
          lastSelection = nextSelection;
          hasMemo = true;
        }
      }
      return lastSelection;
    };
  }, [selector, isEqual]);

  const getSelection = () => memoizedSelector(getSnapshot());
  const getServerSelection =
    getServerSnapshot !== undefined && getServerSnapshot !== null
      ? () => memoizedSelector(getServerSnapshot())
      : undefined;

  return useSyncExternalStore(subscribe, getSelection, getServerSelection);
}
`;
      }
    },
  };
}
