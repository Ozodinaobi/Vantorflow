// All dates are shown in Africa/Lagos time, never US Eastern.
export const APP_TIMEZONE = "Africa/Lagos";

// Deadlines are plain dates (no time). Adding noon UTC avoids off-by-one-day shifts.
export function formatDate(value: string | null | undefined): string {
  if (!value) return "No deadline";
  const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return d.toLocaleDateString("en-GB", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Timestamps (created/updated) are shown with a clock time, in Lagos time.
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return (
    d.toLocaleString("en-GB", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " (Lagos time)"
  );
}
