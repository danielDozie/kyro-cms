export type DateStyle = "full" | "date" | "time" | "short";

export function formatDate(
  date: string | Date | null | undefined,
  style: DateStyle = "date",
): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  switch (style) {
    case "full":
      return d.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    case "time":
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    case "short":
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "date":
    default:
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  }
}

export function formatRelativeTime(
  date: string | Date | null | undefined,
): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(d, "date");
}

export function getTimestamp(): string {
  return `?t=${Date.now()}`;
}

export function generateId(length: number = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
