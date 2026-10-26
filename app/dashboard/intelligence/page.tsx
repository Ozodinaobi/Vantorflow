"use client";

import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, LoadingBlock, Reveal } from "@/components/ui";

interface Intel {
  stages: { stage: string; count: number }[];
  categories: { category: string; count: number }[];
  bottlenecks: { stage: string; count: number; avgDays: number | null }[];
  totals: { opportunities: number; open: number; won: number; lost: number; rate: number | null };
  trend: { month: string; won: number; lost: number }[];
}

// Intelligence: pipeline by stage, requirement categories, stage bottlenecks, and win rate trend.
export default function IntelligencePage() {
  const [data, setData] = useState<Intel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Intel>("/api/intelligence")
      .then(setData)
      .catch((e) => setError(`Could not load intelligence: ${errorText(e)}`));
  }, []);

  if (!data && !error) return <LoadingBlock label="Reading your pipeline" />;

  return (
    <section className="space-y-8">
      <div>
        <p className="label-mono mb-3">Intelligence</p>
        <h1 className="font-serif text-4xl font-medium tracking-tighter sm:text-5xl">Pipeline intelligence</h1>
        <p className="mt-3 text-sm text-white/50">Computed from your saved opportunities and requirements.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">{error}</p>}

      {data && data.totals.opportunities === 0 && (
        <div className="glass rounded-3xl border-dashed p-10 text-center">
          <p className="font-serif text-2xl">Nothing to analyse yet</p>
          <p className="mt-2 text-sm text-white/50">Add an RFQ and extract its requirements to see intelligence here.</p>
        </div>
      )}

      {data && data.totals.opportunities > 0 && (
        <>
          <Reveal>
            <div className="card space-y-5">
              <p className="label-mono">Pipeline by stage</p>
              {(() => {
                const max = Math.max(1, ...data.stages.map((s) => s.count));
                return data.stages.map((s) => (
                  <div key={s.stage} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span>{s.stage}</span>
                      <span className="tabular-nums text-white/50">{s.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full bg-emerald-400/80 transition-[width] duration-700" style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Reveal>

          <Reveal>
            <div className="card space-y-5">
              <p className="label-mono">Requirements by category</p>
              {data.categories.every((c) => c.count === 0) ? (
                <p className="text-sm text-white/50">No requirements saved yet.</p>
              ) : (
                data.categories.map((c) => (
                  <div key={c.category} className="flex justify-between text-sm">
                    <span>{c.category}</span>
                    <span className="tabular-nums text-white/50">{c.count}</span>
                  </div>
                ))
              )}
            </div>
          </Reveal>

          <Reveal>
            <div className="card space-y-5">
              <p className="label-mono">Stage bottlenecks</p>
              <p className="text-xs text-white/40">Average days since an open opportunity was last changed, grouped by stage.</p>
              {data.bottlenecks.map((b) => (
                <div key={b.stage} className="flex justify-between text-sm">
                  <span>{b.stage}</span>
                  <span className="tabular-nums text-white/50">{b.avgDays === null ? "none open" : `${b.avgDays} days (${b.count})`}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="card space-y-5">
              <p className="label-mono">Win rate trend</p>
              {data.trend.length === 0 ? (
                <p className="text-sm text-white/50">No outcomes recorded yet.</p>
              ) : (
                data.trend.map((t) => {
                  const total = t.won + t.lost;
                  return (
                    <div key={t.month} className="flex justify-between text-sm">
                      <span>{t.month}</span>
                      <span className="tabular-nums text-white/50">
                        {t.won} won · {t.lost} lost · {total ? Math.round((t.won / total) * 100) : 0}%
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </Reveal>
        </>
      )}
    </section>
  );
}
