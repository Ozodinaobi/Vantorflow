// Notification generation. Rows are deduped by (user_id, dedupe_key) via upsert.
import { rest } from "@/lib/db";

export interface NotifyInput {
  userId: string;
  title: string;
  body?: string;
  kind: string;
  dedupeKey: string;
}

// Insert one notification; a repeat with the same dedupe key is ignored.
export async function notify(n: NotifyInput): Promise<void> {
  try {
    await rest("POST", "vf_notifications", {
      query: "?on_conflict=user_id,dedupe_key",
      body: {
        user_id: n.userId,
        title: n.title.slice(0, 200),
        body: (n.body ?? "").slice(0, 1000),
        kind: n.kind,
        dedupe_key: n.dedupeKey,
      },
      prefer: "resolution=ignore-duplicates,return=minimal",
    });
  } catch {
    // Notifications must never break the action that triggered them.
  }
}

// Deadline reminders at 7, 3 and 1 days out. Computed on page load; each threshold notifies once.
export async function deadlineReminders(userId: string, todayIso: string): Promise<void> {
  const rows = await rest<any[]>("GET", "opportunities", {
    query: `?user_id=eq.${userId}&select=id,title,deadline&deadline=not.is.null`,
  }).catch(() => []);
  const today = Date.parse(`${todayIso}T00:00:00Z`);
  for (const o of rows) {
    if (!o.deadline) continue;
    const days = Math.round((Date.parse(`${String(o.deadline).slice(0, 10)}T00:00:00Z`) - today) / 86400000);
    // Tightest band first: 1 day out is the 1-day reminder, not the 7-day one.
    const threshold = [1, 3, 7].find((t) => days >= 0 && days <= t);
    if (threshold === undefined) continue;
    await notify({
      userId,
      title: `Deadline in ${days} day${days === 1 ? "" : "s"}: ${o.title ?? "Opportunity"}`,
      body: `Due ${String(o.deadline).slice(0, 10)}.`,
      kind: "deadline",
      dedupeKey: `deadline:${o.id}:${threshold}`,
    });
  }
}

// Lagos calendar date (YYYY-MM-DD) for threshold math.
export function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
