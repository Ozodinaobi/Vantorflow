"use client";

import { MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { Opportunity } from "@/lib/types";
import { Readiness } from "@/lib/readiness";
import { formatDate } from "@/lib/time";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { CountUp, LoadingBlock, Reveal } from "@/components/ui";
import { daysUntil, deadlineTone, countdownLabel } from "@/lib/deadline";
import { PerformanceCard } from "@/components/OpportunityExtras";

type Row = Opportunity & { readiness: Readiness };

// Moves the spotlight glow to the cursor position on a glass card.
function track(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

// Lists the signed-in user's opportunities. The server filters by user and computes readiness.
export default function DashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ opportunities: Row[] }>("/api/opportunities")
      .then((d) => setRows(d.opportunities))
      .catch((e) => setError(`Could not load data: ${errorText(e)}`))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock label="Loading opportunities" />;

  // Nearest deadline first (no deadline last). Items due within 7 days go in the "closing this week" band.
  const sorted = [...rows].sort((a, b) => {
    const da = daysUntil(a.deadline);
    const db = daysUntil(b.deadline);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
  const closingThisWeek = sorted.filter((r) => {
    const d = daysUntil(r.deadline);
    return d !== null && d >= 0 && d <= 7 && r.status !== "Outcome";
  });
  const open = rows.filter((r) => r.status !== "Outcome");
  const decided = rows.filter((r) => r.outcome_result === "Won" || r.outcome_result === "Lost");
  const won = decided.filter((r) => r.outcome_result === "Won").length;
  const winRate = decided.length ? Math.round((won / decided.length) * 100) : null;
  const pipelineValue = open.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
  const avgReadiness = rows.length ? Math.round(rows.reduce((s2, r) => s2 + (r.readiness?.score ?? 0), 0) / rows.length) : null;

  return (
    <section>
      <PerformanceCard />
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono mb-3 flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Pipeline
          </p>
          <h1 className="font-serif text-4xl font-medium tracking-tighter sm:text-5xl">Opportunities</h1>
        </div>
        <Link href="/dashboard/new" className="btn-primary">
          New RFQ
        </Link>
      </div>

      {error && <p role="alert" className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300">{error}</p>}

      {rows.length > 0 && (
        <div className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi label="Active" value={open.length} />
          <Kpi label="Pipeline value" value={pipelineValue} prefix="" />
          <Kpi label="Win rate" value={winRate} suffix="%" empty="n/a" note={decided.length ? `${decided.length} decided` : "no outcomes yet"} />
          <Kpi label="Avg readiness" value={avgReadiness} suffix="%" empty="n/a" />
        </div>
      )}

      {closingThisWeek.length > 0 && (
        <div className="mb-10">
          <p className="label-mono mb-3 text-red-300">Closing this week</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {closingThisWeek.map((opp) => (
              <Link key={opp.id} href={`/dashboard/${opp.id}`} className="glass block rounded-2xl border border-white/10 p-4 hover:border-white/25">
                <p className="truncate font-serif text-base">{opp.title}</p>
                <DeadlineBadge deadline={opp.deadline} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="glass rounded-3xl border-dashed p-10 text-center sm:p-14">
          <p className="font-serif text-2xl">No opportunities yet</p>
          <p className="mt-2 text-sm text-white/50">Paste an RFQ to start your first opportunity.</p>
          <Link href="/dashboard/new" className="btn-primary mt-6">
            Add your first RFQ
          </Link>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((opp, i) => (
          <Reveal key={opp.id} delay={Math.min(i, 5) * 90}>
            <Link
              href={`/dashboard/${opp.id}`}
              onMouseMove={track}
              className="spotlight shimmer-border glass group block h-full rounded-3xl p-6 transition-[transform,border-color] duration-700 ease-out-expo hover:-translate-y-1 hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-xl leading-snug">{opp.title}</h2>
                <span className="label-mono shrink-0 rounded-full border border-white/10 px-2.5 py-1 !text-[9px]">{opp.status}</span>
              </div>
              <div className="mt-3">
                <DeadlineBadge deadline={opp.deadline} />
              </div>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Buyer</dt>
                  <dd className="truncate text-right">{opp.buyer || "not set"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Value</dt>
                  <dd className="text-right tabular-nums">
                    {opp.value !== null && opp.value !== undefined ? Number(opp.value).toLocaleString("en-GB") : "not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Deadline</dt>
                  <dd className="text-right">{formatDate(opp.deadline)}</dd>
                </div>
              </dl>
              <div className="mt-6 border-t border-white/5 pt-5">
                <ReadinessBadge readiness={opp.readiness} />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// Kpi card: count-up number, emerald rule, empty value shown as a label instead of a fake zero.
function Kpi({ label, value, prefix = "", suffix = "", empty = "0", note }: { label: string; value: number | null; prefix?: string; suffix?: string; empty?: string; note?: string }) {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5">
      <p className="label-mono !text-[9px]">{label}</p>
      <p className="mt-2 font-serif text-2xl tabular-nums tracking-tight sm:text-3xl">
        {value === null ? empty : (
          <>
            {prefix}
            <CountUp value={value} suffix={suffix} />
          </>
        )}
      </p>
      {note && <p className="mt-1 text-[11px] text-white/35">{note}</p>}
    </div>
  );
}

// Countdown badge: red when 2 days or fewer (or overdue), emerald breathing up to 7 days, quiet otherwise.
function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const days = daysUntil(deadline);
  const tone = deadlineTone(days);
  const cls =
    tone === "overdue" || tone === "urgent"
      ? "border-red-500/40 bg-red-500/[0.06] text-red-300"
      : tone === "soon"
      ? "border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-300 animate-glow-pulse"
      : "border-white/10 text-white/50";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${cls}`}>
      {countdownLabel(days)}
    </span>
  );
}
