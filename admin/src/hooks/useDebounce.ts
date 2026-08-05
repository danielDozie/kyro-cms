import { useState, useEffect } from "react";

/**
 * Reusable React hook for debouncing fast-changing values (e.g. search inputs, auto-save).
 * Delays updating the returned value until the specified `delay` has elapsed since the last change.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
