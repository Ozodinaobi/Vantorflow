"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, errorText } from "@/lib/api";
import { Opportunity } from "@/lib/types";
import { Readiness } from "@/lib/readiness";
import { formatDate } from "@/lib/time";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { LoadingBlock } from "@/components/ui";
import { daysUntil } from "@/lib/deadline";
import { DeadlineBadge } from "@/components/DeadlineBadge";

type Row = Opportunity & { readiness: Readiness };

// Opportunities list. Plain cards, nearest deadline first, with relative deadlines (overdue in red).
export default function OpportunitiesPage() {
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

  const sorted = [...rows].sort((a, b) => {
    const da = daysUntil(a.deadline);
    const db = daysUntil(b.deadline);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono mb-1">Pipeline</p>
          <p className="label-mono">Pipeline</p>
          <h1 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">Opportunities</h1>
        </div>
        <Link href="/dashboard/new" className="btn-primary">New RFQ</Link>
      </div>

      {error && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {!error && rows.length === 0 && (
        <div className="card text-center">
          <p className="text-lg font-semibold">No opportunities yet</p>
          <p className="mt-2 text-sm text-slate-500">Paste an RFQ to start your first opportunity.</p>
          <Link href="/dashboard/new" className="btn-primary mt-6">Add your first RFQ</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((opp) => (
          <Link key={opp.id} href={`/dashboard/${opp.id}`} className="card block h-full p-5 transition-colors hover:border-emerald-500/30">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold leading-snug text-slate-900">{opp.title}</h2>
              <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600">{opp.status}</span>
            </div>
            <div className="mt-3">
              <DeadlineBadge deadline={opp.deadline} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Buyer</dt>
                <dd className="truncate text-right">{opp.buyer || "not set"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Value</dt>
                <dd className="text-right tabular-nums">
                  {opp.value !== null && opp.value !== undefined ? Number(opp.value).toLocaleString("en-GB") : "not set"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Deadline</dt>
                <dd className="text-right">{formatDate(opp.deadline)}</dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <ReadinessBadge readiness={opp.readiness} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Relative countdown. Overdue and due within 2 days are red.
