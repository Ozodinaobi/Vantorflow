"use client";

import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { formatDateTime } from "@/lib/time";
import { BreathingLoader, Reveal } from "@/components/ui";

type Ev = { id: string; action: string; opportunity_id: string | null; opportunity_title: string | null; created_at: string; detail: any };

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

// Feature 14: every audit event across your opportunities, newest first, grouped by day.
export default function ActivityPage() {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ events: Ev[] }>("/api/activity")
      .then((d) => setEvents(d.events))
      .catch((e) => {
        setError(errorText(e));
        setEvents([]);
      });
  }, []);

  if (events === null) return <BreathingLoader label="Loading activity" />;

  const groups: Record<string, Ev[]> = {};
  for (const ev of events) (groups[dayKey(ev.created_at)] ??= []).push(ev);

  return (
    <section>
      <h1 className="font-serif text-3xl text-bone">Activity</h1>
      <p className="mt-2 text-sm text-white/45">Everything that changed across your opportunities, newest first.</p>
      {error && <p className="mt-6 text-sm text-red-300">{error}</p>}
      {!error && events.length === 0 && (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">No activity yet. Create an opportunity to start the feed.</p>
      )}
      <div className="mt-8 space-y-8">
        {Object.entries(groups).map(([day, evs]) => (
          <Reveal key={day}>
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-emerald-300/80">{day}</h2>
            <ul className="space-y-2">
              {evs.map((ev) => (
                <li key={ev.id} className="glass rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-sm text-bone">
                    <span className="capitalize">{ev.action.replace(/_/g, " ")}</span>
                    {ev.opportunity_title && <span className="text-white/55"> on {ev.opportunity_title}</span>}
                  </p>
                  <p className="mt-1 text-xs text-white/35">{formatDateTime(ev.created_at)}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
