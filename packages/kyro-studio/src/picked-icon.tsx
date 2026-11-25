import React, { lazy, Suspense } from "react";

const cache = new Map<string, React.LazyExoticComponent<React.ComponentType<any>>>();
export function PickedIcon({ name, size, label }: { name: string; size: number; label: string }) {
  if (!cache.has(name))
    cache.set(
      name,
      lazy(async () => {
        const [library, raw] = name.includes(":") ? name.split(":", 2) : ["lucide", name];
        const pascal = raw.replace(/(^|[-_])(\w)/g, (_, _separator, letter) => letter.toUpperCase());
        const icons: Record<string, any> =
          library === "hero-solid"
            ? await import("@heroicons/react/24/solid")
            : library === "hero" || library === "hero-outline"
              ? await import("@heroicons/react/24/outline")
              : await import("lucide-react");
        return { default: icons[raw] || icons[pascal] || icons[pascal + "Icon"] || (() => null) };
      }),
    );
  const Icon = cache.get(name)!;
  return (
    <Suspense fallback={<span style={{ display: "inline-block", width: size, height: size }} />}>
      <Icon width={size} height={size} role="img" aria-label={label} strokeWidth={1.5} />
    </Suspense>
  );
}
