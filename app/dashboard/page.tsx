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
        <p className="label-mono">Overview</p>
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

  const stageBars = STAGES.map((s) => ({ label: s, value: rows.filter((r) => r.status === s).length }));
  const catBars = (intel?.categories ?? []).map((c) => ({ label: c.category, value: c.count }));
  const hasReqs = catBars.some((c) => c.value > 0);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono mb-1">Overview</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Your pipeline</h1>
        </div>
        <Link href="/dashboard/new" className="btn-primary">New RFQ</Link>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center">
          <p className="text-lg font-semibold">No opportunities yet</p>
          <p className="mt-2 text-sm text-slate-500">Paste an RFQ to start your first opportunity.</p>
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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <p className="label-mono mb-4">Opportunities per stage</p>
              <BarChart bars={stageBars} />
            </div>
            <div className="card">
              <p className="label-mono mb-4">Requirements per category</p>
              {!intel ? (
                <Skeleton className="h-32 w-full" />
              ) : hasReqs ? (
                <BarChart bars={catBars} />
              ) : (
                <p className="text-sm text-slate-500">No requirements saved yet. Extract them from an RFQ to see the split.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <p className="label-mono">Closing this week</p>
              <Link href="/dashboard/opportunities" className="text-sm text-emerald-400 hover:underline">All opportunities</Link>
            </div>
            {closing.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing closes in the next 7 days.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {closing.map((opp) => (
                  <li key={opp.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <Link href={`/dashboard/${opp.id}`} className="font-medium text-slate-900 hover:underline">{opp.title}</Link>
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
    <div className="card p-4 sm:p-5">
      <p className="label-mono">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums sm:text-3xl ${danger ? "text-red-700" : "text-slate-900"}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}
