"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { LoadingBlock, Reveal } from "@/components/ui";

interface Row {
  id: string;
  title: string;
  buyer: string | null;
  outcome_result: "Won" | "Lost" | null;
  outcome_reason: string | null;
  outcome_at: string | null;
}

// Win and loss breakdown by reason. Reads only opportunities that have a recorded outcome.
export default function InsightsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ opportunities: Row[] }>("/api/opportunities")
      .then((d) => setRows(d.opportunities as any))
      .catch((e) => setError(`Could not load insights: ${errorText(e)}`));
  }, []);

  if (!rows && !error) return <LoadingBlock label="Loading insights" />;

  const decided = (rows ?? []).filter((r) => r.outcome_result === "Won" || r.outcome_result === "Lost");
  const won = decided.filter((r) => r.outcome_result === "Won").length;
  const lost = decided.length - won;
  const rate = decided.length ? Math.round((won / decided.length) * 100) : null;

  const byReason = new Map<string, { won: number; lost: number }>();
  decided.forEach((r) => {
    const key = r.outcome_reason || "No reason given";
    const cur = byReason.get(key) ?? { won: 0, lost: 0 };
    if (r.outcome_result === "Won") cur.won++;
    else cur.lost++;
    byReason.set(key, cur);
  });
  const reasons = [...byReason.entries()].sort((a, b) => b[1].won + b[1].lost - (a[1].won + a[1].lost));

  return (
    <section className="space-y-8">
      <div>
        <p className="label-mono mb-3">Analysis</p>
        <h1 className="font-serif text-4xl font-medium tracking-tighter sm:text-5xl">Insights</h1>
        <p className="mt-3 text-sm text-white/50">Won and lost opportunities, with the reasons recorded at close.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">{error}</p>}

      {decided.length === 0 ? (
        <div className="glass rounded-3xl border-dashed p-10 text-center">
          <p className="font-serif text-2xl">No outcomes recorded yet</p>
          <p className="mt-2 text-sm text-white/50">
            Mark an opportunity as Won or Lost on its page and the breakdown will appear here.
          </p>
          <Link href="/dashboard" className="btn-secondary mt-6">Go to opportunities</Link>
        </div>
      ) : (
        <>
          <Reveal>
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="label-mono !text-[9px]">Won</p>
                <p className="mt-2 font-serif text-3xl tabular-nums text-emerald-300">{won}</p>
              </div>
              <div className="card text-center">
                <p className="label-mono !text-[9px]">Lost</p>
                <p className="mt-2 font-serif text-3xl tabular-nums">{lost}</p>
              </div>
              <div className="card text-center">
                <p className="label-mono !text-[9px]">Win rate</p>
                <p className="mt-2 font-serif text-3xl tabular-nums">{rate === null ? "n/a" : `${rate}%`}</p>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="card space-y-5">
              <p className="label-mono">By reason</p>
              {reasons.map(([reason, c]) => {
                const total = c.won + c.lost;
                return (
                  <div key={reason} className="space-y-2">
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="min-w-0 break-words">{reason}</span>
                      <span className="shrink-0 tabular-nums text-white/50">
                        {c.won} won · {c.lost} lost
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="bg-emerald-400" style={{ width: `${(c.won / total) * 100}%` }} />
                      <div className="bg-white/30" style={{ width: `${(c.lost / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal>
            <div className="card">
              <p className="label-mono mb-4">Decided opportunities</p>
              <ul className="divide-y divide-white/5">
                {decided.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <Link href={`/dashboard/${r.id}`} className="min-w-0 truncate hover:underline">{r.title}</Link>
                    <span className={`shrink-0 ${r.outcome_result === "Won" ? "text-emerald-300" : "text-white/50"}`}>
                      {r.outcome_result}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </>
      )}
    </section>
  );
}
