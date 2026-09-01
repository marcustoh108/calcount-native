export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dayKeyFromIso(iso: string): string {
  return todayKey(new Date(iso));
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDayLabel(dateKey: string): string {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Returns the last `n` day keys ending today, oldest first. */
export function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(todayKey(d));
  }
  return days;
}

export function suggestMealTypeForNow(): "breakfast" | "lunch" | "dinner" | "snack" {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
