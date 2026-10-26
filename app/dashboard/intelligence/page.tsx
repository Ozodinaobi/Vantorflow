"use client";

import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { BarChart } from "@/components/Charts";
import { Skeleton } from "@/components/ui";

interface Intel {
  stages: { stage: string; count: number }[];
  categories: { category: string; count: number }[];
  bottlenecks: { stage: string; count: number; avg_days: number | null }[];
  totals: { opportunities: number; open: number; won: number; lost: number; rate: number | null };
  byReason: { reason: string; won: number; lost: number }[];
  trend: { month: string; won: number; lost: number; rate: number }[];
}

// Intelligence: charts and tables computed from real rows (pipeline by stage, requirement categories, bottlenecks, outcomes).
export default function IntelligencePage() {
  const [data, setData] = useState<Intel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Intel>("/api/intelligence")
      .then(setData)
      .catch((e) => setError(`Could not load intelligence: ${errorText(e)}`));
  }, []);

  if (!data && !error) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="label-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Pipeline intelligence</h1>
        <p className="mt-2 text-sm text-slate-500">Computed from your saved opportunities and requirements.</p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {data && data.totals.opportunities === 0 && (
        <div className="card text-center">
          <p className="text-lg font-semibold">Nothing to analyse yet</p>
          <p className="mt-2 text-sm text-slate-500">Add an RFQ and extract its requirements to see intelligence here.</p>
        </div>
      )}

      {data && data.totals.opportunities > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Opportunities" value={data.totals.opportunities} />
            <Stat label="Open" value={data.totals.open} />
            <Stat label="Won / lost" value={`${data.totals.won} / ${data.totals.lost}`} />
            <Stat label="Win rate" value={data.totals.rate === null ? "n/a" : `${data.totals.rate}%`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <p className="label-mono mb-4">Opportunities per stage</p>
              <BarChart bars={data.stages.map((s) => ({ label: s.stage, value: s.count }))} />
            </div>
            <div className="card">
              <p className="label-mono mb-4">Requirements per category</p>
              {data.categories.every((c) => c.count === 0) ? (
                <p className="text-sm text-slate-500">No requirements saved yet.</p>
              ) : (
                <BarChart bars={data.categories.map((c) => ({ label: c.category, value: c.count }))} />
              )}
            </div>
          </div>

          <div className="card">
            <p className="label-mono mb-4">Time since last update, by stage (open opportunities)</p>
            {data.bottlenecks.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing open to measure.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-2 font-medium">Stage</th>
                    <th className="py-2 font-medium">Opportunities</th>
                    <th className="py-2 font-medium">Avg days since update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.bottlenecks.map((b) => (
                    <tr key={b.stage}>
                      <td className="py-2">{b.stage}</td>
                      <td className="py-2 tabular-nums">{b.count}</td>
                      <td className="py-2 tabular-nums">{b.avg_days ?? "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-xs text-slate-500">This is time since each opportunity was last changed, not a stage history.</p>
          </div>

          {data.trend.length > 0 && (
            <div className="card">
              <p className="label-mono mb-4">Monthly outcomes</p>
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-2 font-medium">Month</th>
                    <th className="py-2 font-medium">Won</th>
                    <th className="py-2 font-medium">Lost</th>
                    <th className="py-2 font-medium">Win rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.trend.map((t) => (
                    <tr key={t.month}>
                      <td className="py-2">{t.month}</td>
                      <td className="py-2 tabular-nums">{t.won}</td>
                      <td className="py-2 tabular-nums">{t.lost}</td>
                      <td className="py-2 tabular-nums">{t.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="label-mono">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 sm:text-3xl">{value}</p>
    </div>
  );
}
