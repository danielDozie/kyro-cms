interface ShimmerProps {
  variant: "text" | "circle" | "rect" | "card" | "table-row" | "media-card" | "stat-card";
  count?: number;
  className?: string;
}

export function Shimmer({ variant, count = 1, className = "" }: ShimmerProps) {
  const variants = {
    text: "h-3 rounded-md",
    circle: "size-10 rounded-full",
    rect: "h-10 rounded-xl",
    card: "h-32 rounded-2xl",
    "table-row": "h-14 rounded-xl",
    "media-card": "aspect-square rounded-2xl",
    "stat-card": "h-24 rounded-2xl",
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
