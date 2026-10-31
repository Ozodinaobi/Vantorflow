"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { LoadingBlock } from "@/components/ui";

type Opportunity = { id: string; title: string; buyer: string; deadline: string | null; status: string };
type Milestone = { id: string; opportunityId: string; title: string; date: string };
type Payload = { opportunities: Opportunity[]; milestones: Milestone[]; migrationRequired?: boolean };
const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function CalendarPage() {
  const [data, setData] = useState<Payload>({ opportunities: [], milestones: [] });
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [migration, setMigration] = useState(false);
  const [oppId, setOppId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { api<Payload>("/api/bid-calendar").then((d) => { setData(d); setMigration(Boolean(d.migrationRequired)); setOppId(d.opportunities[0]?.id ?? ""); }).catch((e) => setError(errorText(e))).finally(() => setLoading(false)); }, []);
  const entries = useMemo(() => {
    const result: Record<string, { title: string; href: string; type: string }[]> = {};
    for (const opp of data.opportunities) if (opp.deadline) (result[opp.deadline] ??= []).push({ title: opp.title, href: `/dashboard/${opp.id}`, type: "Deadline" });
    for (const item of data.milestones) (result[item.date] ??= []).push({ title: item.title, href: `/dashboard/${item.opportunityId}`, type: "Milestone" });
    return result;
  }, [data]);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);
  async function addMilestone(e: React.FormEvent) {
    e.preventDefault(); setNotice(""); setSaving(true);
    try { const result = await api<{ milestone: Milestone }>("/api/bid-calendar", { method: "POST", body: { opportunityId: oppId, title, date } }); setData((prev) => ({ ...prev, milestones: [...prev.milestones, result.milestone] })); setTitle(""); setDate(""); setNotice("Milestone added to the calendar."); }
    catch (e) { setNotice(errorText(e)); }
    finally { setSaving(false); }
  }
  if (loading) return <LoadingBlock label="Loading bid calendar" />;
  return <section className="space-y-8"><div><p className="label-mono mb-3">Bid operations</p><h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Bid calendar</h1><p className="mt-3 text-sm text-white/50">Submission deadlines and team milestones, by month.</p></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <div className="card"><div className="mb-5 flex items-center justify-between gap-3"><button className="btn-secondary !px-4" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">‹</button><h2 className="font-serif text-2xl">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2><button className="btn-secondary !px-4" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">›</button></div>
      <div className="grid grid-cols-7 border-l border-t border-white/5">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="border-b border-r border-white/5 px-2 py-3 text-center label-mono">{d}</div>)}{cells.map((cell) => { const inMonth = cell.getMonth() === month.getMonth(); const dayEvents = entries[key(cell)] ?? []; return <div key={key(cell)} className={`min-h-24 border-b border-r border-white/5 p-2 sm:min-h-32 ${inMonth ? "bg-white/[0.01]" : "bg-black/10 opacity-35"}`}><span className={`text-xs ${key(cell) === key(new Date()) ? "text-emerald-300" : "text-white/45"}`}>{cell.getDate()}</span><div className="mt-2 space-y-1">{dayEvents.slice(0, 3).map((event, i) => <Link key={`${event.title}-${i}`} title={`${event.type}: ${event.title}`} href={event.href} className={`block truncate rounded-lg px-2 py-1 text-[10px] ${event.type === "Deadline" ? "bg-emerald-400/10 text-emerald-200" : "bg-blue-400/10 text-blue-200"}`}>{event.title}</Link>)}{dayEvents.length > 3 && <p className="px-1 text-[10px] text-white/40">+{dayEvents.length - 3} more</p>}</div></div>; })}</div>
      {migration && <p className="mt-4 text-xs text-white/40">Some calendar details will appear after the database update is applied. Saved opportunity deadlines remain visible.</p>}
    </div>
    {data.opportunities.length && !migration ? <form onSubmit={addMilestone} className="card"><p className="label-mono mb-2">Plan the work</p><h2 className="mb-5 font-serif text-2xl">Add a milestone</h2><div className="grid gap-4 sm:grid-cols-3"><select className="input" value={oppId} onChange={(e) => setOppId(e.target.value)}>{data.opportunities.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select><input className="input" placeholder="Milestone name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required/><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required/><button className="btn-primary sm:col-span-3 sm:justify-self-start" disabled={saving}>{saving ? "Saving..." : "Add milestone"}</button></div>{notice && <p role="status" className="mt-3 text-sm text-white/60">{notice}</p>}</form> : <div className="card"><p className="label-mono mb-2">Plan the work</p><h2 className="font-serif text-2xl">Milestones</h2><p className="mt-3 text-sm text-white/50">{migration ? "Milestone planning will be available after the database update is applied." : "Create an opportunity before adding milestones."}</p></div>}
  </section>;
}
