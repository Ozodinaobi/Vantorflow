// Deadline countdowns, always counted on the Lagos calendar day (never the phone's local day).
import { APP_TIMEZONE } from "./time";

// Today's date in Lagos as YYYY-MM-DD.
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Whole days from today (Lagos) to the deadline. Negative = overdue. Null when there is no deadline.
export function daysUntil(deadline: string | null | undefined, now: Date = new Date()): number | null {
  if (!deadline) return null;
  const [y, m, d] = deadline.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = lagosToday(now).split("-").map(Number);
  if ([y, m, d, ty, tm, td].some((n) => Number.isNaN(n))) return null;
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}

export type DeadlineTone = "overdue" | "urgent" | "soon" | "later" | "none";

// Colour rules: 2 days or fewer (or overdue) is red, up to 7 days is emerald, later is quiet.
export function deadlineTone(days: number | null): DeadlineTone {
  if (days === null) return "none";
  if (days < 0 || days <= 2) return days < 0 ? "overdue" : "urgent";
  if (days <= 7) return "soon";
  return "later";
}

// Relative wording: "in 5 days", "tomorrow", "due today", "overdue by 3 days".
export function countdownLabel(days: number | null): string {
  if (days === null) return "No deadline";
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `In ${days} days`;
}
