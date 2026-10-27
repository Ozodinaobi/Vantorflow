"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { Opportunity, STAGES } from "@/lib/types";
import { Readiness } from "@/lib/readiness";
import { daysUntil } from "@/lib/deadline";
import { Skeleton } from "@/components/ui";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { BarChart } from "@/components/Charts";

type Row = Opportunity & { readiness: Readiness };
type Intel = { categories: { category: string; count: number }[] };

// Overview (sidebar "Overview"): KPI cards, pipeline chart, requirement categories, and closing-this-week.
export default function OverviewPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [intel, setIntel] = useState<Intel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ opportunities: Row[] }>("/api/opportunities")
      .then((d) => setRows(d.opportunities))
      .catch((e) => setError(`Could not load data: ${errorText(e)}`));
    api<Intel>("/api/intelligence")
      .then(setIntel)
      .catch(() => setIntel({ categories: [] }));
  }, []);

  if (error) {
    return (
      <section>
        <p className="eyebrow mb-2">Overview</p>
          <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">Overview</h1>
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      </section>
    );
  }
  if (!rows) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  const open = rows.filter((r) => r.status !== "Outcome");
  const decided = rows.filter((r) => r.outcome_result === "Won" || r.outcome_result === "Lost");
  const won = decided.filter((r) => r.outcome_result === "Won").length;
  const winRate = decided.length ? Math.round((won / decided.length) * 100) : null;
  const pipelineValue = open.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  const overdue = open.filter((r) => {
    const d = daysUntil(r.deadline);
    return d !== null && d < 0;
  }).length;
  const closing = rows
    .filter((r) => {
      const d = daysUntil(r.deadline);
      return d !== null && d >= 0 && d <= 7 && r.status !== "Outcome";
    })
    .sort((a, b) => (daysUntil(a.deadline) ?? 0) - (daysUntil(b.deadline) ?? 0));

  const needs = open
    .filter((r) => r.status === "Intake" || r.status === "Analysis")
    .slice(0, 6);

  const stageBars = STAGES.map((s) => ({ label: s, value: rows.filter((r) => r.status === s).length }));
  const catBars = (intel?.categories ?? []).map((c) => ({ label: c.category, value: c.count }));
  const hasReqs = catBars.some((c) => c.value > 0);

  return (
    <section className="space-y-6 animate-enter">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Command center</p>
          <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">Pipeline overview</h1>
          <p className="mt-2 text-sm text-muted">What needs a decision, what is due, and where the value sits.</p>
        </div>
        <Link href="/dashboard/new" className="btn-primary shrink-0">New RFQ</Link>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center">
          <p className="text-lg font-semibold">No opportunities yet</p>
          <p className="mt-2 text-sm text-muted">Paste an RFQ to start your first opportunity.</p>
          <Link href="/dashboard/new" className="btn-primary mt-6">Add your first RFQ</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Active" value={String(open.length)} note={`${rows.length} total`} />
            <Kpi label="Open value" value={pipelineValue.toLocaleString("en-GB")} note="sum of estimated values" />
            <Kpi label="Win rate" value={winRate === null ? "n/a" : `${winRate}%`} note={decided.length ? `${decided.length} decided` : "no outcomes yet"} />
            <Kpi label="Overdue" value={String(overdue)} note={overdue ? "past deadline, still open" : "nothing overdue"} danger={overdue > 0} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card glass-interactive animate-enter lg:col-span-2">
              <p className="eyebrow mb-4">Needs a decision</p>
              {needs.length === 0 ? (
                <p className="text-sm text-muted">Nothing waiting on a Go/No-Go call right now.</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {needs.map((opp) => (
                    <li key={opp.id} className="row-hover flex flex-wrap items-center justify-between gap-3 px-2 py-3">
                      <Link href={`/dashboard/${opp.id}`} className="ghost-link min-w-0 truncate font-medium text-ink hover:text-emerald-400">{opp.title}</Link>
                      <span className="text-xs text-muted">{opp.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card glass-interactive animate-enter">
              <p className="eyebrow mb-4">Value by stage</p>
              <p className="num font-serif text-3xl text-ink">{pipelineValue.toLocaleString("en-GB")}</p>
              <p className="mt-1 text-xs text-muted">{open.length} active across {STAGES.length} stages</p>
              <div className="mt-4 space-y-2">
                {STAGES.map((s) => {
                  const v = open.filter((r) => r.status === s).reduce((sum, r) => sum + (Number(r.value) || 0), 0);
                  const pct = pipelineValue ? Math.round((v / pipelineValue) * 100) : 0;
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs text-muted"><span>{s}</span><span className="num">{pct}%</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full rounded bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card glass-interactive animate-enter p-4">
              <p className="eyebrow">Win rate, all decided</p>
              <p className="num mt-2 font-serif text-2xl text-ink">{winRate === null ? "n/a" : `${winRate}%`}</p>
              <p className="mt-1 text-xs text-muted">Based on Won and Lost outcomes only.</p>
            </div>
            <div className="card glass-interactive animate-enter p-4">
              <p className="eyebrow">Next deadline</p>
              {(() => {
                const next = open.filter((r) => daysUntil(r.deadline) !== null && (daysUntil(r.deadline) ?? -1) >= 0).sort((a, b) => (daysUntil(a.deadline) ?? 0) - (daysUntil(b.deadline) ?? 0))[0];
                return next ? (
                  <>
                    <Link href={`/dashboard/${next.id}`} className="mt-2 block truncate font-medium text-ink hover:text-emerald-400">{next.title}</Link>
                    <div className="mt-1"><DeadlineBadge deadline={next.deadline} /></div>
                  </>
                ) : <p className="mt-2 text-sm text-muted">No open deadlines.</p>;
              })()}
            </div>
            <div className="card glass-interactive animate-enter p-4">
              <p className="eyebrow">Shortcuts</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Link href="/dashboard/opportunities" className="rounded-lg border border-white/10 px-3 py-1.5 text-ink hover:border-emerald-500/50">Opportunities</Link>
                <Link href="/dashboard/library" className="rounded-lg border border-white/10 px-3 py-1.5 text-ink hover:border-emerald-500/50">Library</Link>
                <Link href="/dashboard/templates" className="rounded-lg border border-white/10 px-3 py-1.5 text-ink hover:border-emerald-500/50">Templates</Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card glass-interactive animate-enter">
              <p className="eyebrow mb-4">Opportunities per stage</p>
              <BarChart bars={stageBars} />
            </div>
            <div className="card glass-interactive animate-enter">
              <p className="eyebrow mb-4">Requirements per category</p>
              {!intel ? (
                <Skeleton className="h-32 w-full" />
              ) : hasReqs ? (
                <BarChart bars={catBars} />
              ) : (
                <p className="text-sm text-muted">No requirements saved yet. Extract them from an RFQ to see the split.</p>
              )}
            </div>
          </div>

          <div className="card glass-interactive animate-enter">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow">Closing this week</p>
              <Link href="/dashboard/opportunities" className="text-sm text-emerald-400 hover:underline">All opportunities</Link>
            </div>
            {closing.length === 0 ? (
              <p className="text-sm text-muted">Nothing closes in the next 7 days.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {closing.map((opp) => (
                  <li key={opp.id} className="row-hover flex flex-wrap items-center justify-between gap-3 px-2 py-3">
                    <Link href={`/dashboard/${opp.id}`} className="ghost-link font-medium text-ink hover:text-emerald-400">{opp.title}</Link>
                    <DeadlineBadge deadline={opp.deadline} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({ label, value, note, danger }: { label: string; value: string; note?: string; danger?: boolean }) {
  return (
    <div className="card glass-interactive p-4 sm:p-5 animate-enter">
      <p className="eyebrow">{label}</p>
      <p className={`num mt-2 font-serif text-3xl font-medium sm:text-4xl ${danger ? "text-red-400" : "text-ink"}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
