interface ShimmerProps {
  variant: "text" | "circle" | "rect" | "card" | "table-row" | "media-card" | "stat-card";
  count?: number;
  className?: string;
}

export function Shimmer({ variant, count = 1, className = "" }: ShimmerProps) {
  const variants = {
    text: "h-3 rounded-lg",
    circle: "size-10 rounded-full",
    rect: "h-10 rounded-lg",
    card: "h-32 rounded-lg",
    "table-row": "h-14 rounded-lg",
    "media-card": "aspect-square rounded-lg",
    "stat-card": "h-24 rounded-lg",
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`kyro-shimmer ${variants[variant]} ${className}`}
        />
      ))}
    </>
  );
}

export function SkeletonGrid({ count = 3, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-lg border border-[var(--kyro-border)] bg-[var(--kyro-surface-accent)]/20 animate-pulse space-y-4"
        >
          <div className="h-4 bg-[var(--kyro-border)] rounded-lg w-3/4" />
          <div className="h-3 bg-[var(--kyro-border)] rounded-lg w-1/2" />
          <div className="pt-4 border-t border-[var(--kyro-border)] grid grid-cols-2 gap-2">
            <div className="h-3 bg-[var(--kyro-border)] rounded-lg w-full" />
            <div className="h-3 bg-[var(--kyro-border)] rounded-lg w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
