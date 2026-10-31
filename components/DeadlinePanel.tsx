"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { formatDate } from "@/lib/time";
import { LoadingBlock } from "@/components/ui";

type Opportunity = { id: string; title: string; buyer: string; deadline: string | null; status: string };
type Payload = { opportunities: Opportunity[]; migrationRequired?: boolean };
const daysUntil = (date: string) => Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
const urgency = (days: number) => days < 7 ? "border-red-400/20 bg-red-400/[0.08] text-red-200" : days < 14 ? "border-amber-300/20 bg-amber-300/[0.07] text-amber-100" : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200";

export function DeadlinePanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Payload>({ opportunities: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<Payload>("/api/bid-calendar").then(setData).catch((e) => setError(errorText(e))).finally(() => setLoading(false)); }, []);
  const upcoming = useMemo(() => data.opportunities.filter((o) => o.deadline && daysUntil(o.deadline) >= 0).sort((a, b) => daysUntil(a.deadline!) - daysUntil(b.deadline!)).slice(0, compact ? 4 : undefined), [data.opportunities, compact]);
  if (loading) return <LoadingBlock label="Loading deadlines" />;
  return <div className="card">
    <div className="mb-5 flex items-end justify-between gap-4"><div><p className="label-mono mb-2">Deadline radar</p><h2 className="font-serif text-2xl">Submission dates</h2></div>{compact && <Link className="link-u text-sm" href="/dashboard/deadlines">All deadlines</Link>}</div>
    {error ? <p className="text-sm text-white/50">Deadlines are unavailable at the moment.</p> : upcoming.length ? <div className="space-y-3">{upcoming.map((o) => { const days = daysUntil(o.deadline!); const d = Math.max(0, days); return <Link key={o.id} href={`/dashboard/${o.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/15"><div className="min-w-0"><p className="truncate font-medium">{o.title}</p><p className="mt-1 truncate text-xs text-white/40">{o.buyer || o.status} · {formatDate(o.deadline)}</p></div><span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${urgency(d)}`}>{d === 0 ? "Due today" : `${d} days`}</span></Link>; })}</div> : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center"><p className="text-sm text-white/60">No upcoming deadlines yet.</p><p className="mt-1 text-xs text-white/35">Add a deadline to an opportunity to see it here.</p></div>}
    {data.migrationRequired && <p className="mt-4 text-xs text-white/35">Calendar data will appear after the database update is applied.</p>}
  </div>;
}

export default function DeadlinesPage() {
  return <section className="space-y-8"><div><p className="label-mono mb-3">Portfolio control</p><h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Deadline radar</h1><p className="mt-3 text-sm text-white/50">Every upcoming submission, prioritized by time remaining.</p></div><DeadlinePanel /></section>;
}
