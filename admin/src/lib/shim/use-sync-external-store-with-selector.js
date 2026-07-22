import { useSyncExternalStore, useMemo } from "react";

export function useSyncExternalStoreWithSelector(
  subscribe,
  getSnapshot,
  getServerSnapshot,
  selector,
  isEqual,
) {
  const memoizedSelector = useMemo(() => {
    let last, lastSnap, hasMemo = false;
    return (snap) => {
      if (!hasMemo || !Object.is(lastSnap, snap)) {
        const next = selector(snap);
        if (!hasMemo || !(isEqual ? isEqual(last, next) : Object.is(last, next))) {
          last = next;
          lastSnap = snap;
          hasMemo = true;
        }
      }
      return last;
    };
  }, [selector, isEqual]);
  const getSelection = () => memoizedSelector(getSnapshot());
  const getServerSelection =
    getServerSnapshot != null
      ? () => memoizedSelector(getServerSnapshot())
      : undefined;
  return useSyncExternalStore(subscribe, getSelection, getServerSelection);
}
