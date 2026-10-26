import { daysUntil, deadlineTone, countdownLabel } from "@/lib/deadline";

// Relative deadline pill: "In 5 days", "Due tomorrow", "Overdue by 3 days" (red), urgent/soon tinted.
export function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const days = daysUntil(deadline);
  const tone = deadlineTone(days);
  const cls =
    tone === "overdue" || tone === "urgent"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "soon"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-slate-200 text-slate-600";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {countdownLabel(days)}
    </span>
  );
}
