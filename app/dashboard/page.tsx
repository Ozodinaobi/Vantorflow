"use client";

import { MouseEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { Opportunity } from "@/lib/types";
import { Readiness } from "@/lib/readiness";
import { formatDate } from "@/lib/time";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { LoadingBlock, Reveal } from "@/components/ui";

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
  const [deleting, setDeleting] = useState<string | null>(null);

  async function removeOpportunity(opp: Row) {
    if (!window.confirm(`Delete “${opp.title}”? This permanently removes the opportunity, its RFQ, requirements, mappings and response sections.`)) return;
    setDeleting(opp.id);
    setError(null);
    try {
      await api(`/api/opportunities/${opp.id}`, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== opp.id));
    } catch (e) {
      setError(`Could not delete opportunity: ${errorText(e)}`);
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    api<{ opportunities: Row[] }>("/api/opportunities")
      .then((d) => setRows(d.opportunities))
      .catch((e) => setError(`Could not load data: ${errorText(e)}`))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock label="Loading opportunities" />;

  return (
    <section>
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
        {rows.map((opp, i) => (
          <Reveal key={opp.id} delay={Math.min(i, 5) * 90}>
            <div
              onMouseMove={track}
              className="spotlight shimmer-border glass group block h-full rounded-3xl p-6 transition-[transform,border-color] duration-700 ease-out-expo hover:-translate-y-1 hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-xl leading-snug"><Link className="hover:text-emerald-200" href={`/dashboard/${opp.id}`}>{opp.title}</Link></h2>
                <span className="label-mono shrink-0 rounded-full border border-white/10 px-2.5 py-1 !text-[9px]">{opp.status}</span>
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
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={deleting === opp.id}
                  onClick={() => removeOpportunity(opp)}
                  className="btn-secondary !min-h-[40px] !border-red-400/20 !text-red-200/80 hover:!border-red-300/50 hover:!text-red-100"
                  aria-label={`Delete ${opp.title}`}
                >
                  {deleting === opp.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
