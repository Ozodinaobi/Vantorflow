"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { BreathingLoader, Reveal } from "@/components/ui";

interface Hit { type: string; id: string; title: string; subtitle: string; href: string }

const LABEL: Record<string, string> = { opportunity: "Opportunity", requirement: "Requirement", library: "Library answer", company: "Company" };

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = (params.get("q") ?? "").trim();
    setQ(term);
    if (term.length < 2) { setHits(null); return; }
    let alive = true;
    setHits(null);
    api<{ results: Hit[] }>(`/api/search?q=${encodeURIComponent(term)}`)
      .then((d) => alive && setHits(d.results))
      .catch((e) => alive && (setError(errorText(e)), setHits([])));
    return () => { alive = false; };
  }, [params]);

  return (
    <section className="space-y-8">
      <div>
        <p className="label-mono mb-3">Search</p>
        <h1 className="font-serif text-4xl tracking-tight">Find anything</h1>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); router.push(`/dashboard/search?q=${encodeURIComponent(q.trim())}`); }} className="glass flex gap-3 rounded-2xl p-3">
        <input className="input flex-1" aria-label="Search" placeholder="Opportunities, requirements, answers, companies" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {hits === null && (params.get("q") ?? "").trim().length >= 2 && <BreathingLoader label="Searching" />}
      {(params.get("q") ?? "").trim().length < 2 && <p className="text-sm text-white/40">Type at least two characters.</p>}
      {hits && hits.length === 0 && <div className="glass rounded-3xl p-8 text-center text-sm text-white/50">Nothing matched “{params.get("q")}”.</div>}
      {hits && hits.length > 0 && (
        <Reveal>
          <ul className="space-y-3">
            {hits.map((h) => (
              <li key={`${h.type}-${h.id}`}>
                <Link href={h.href} className="glass block rounded-2xl p-4 transition hover:border-emerald-500/40">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80">{LABEL[h.type] ?? h.type}</p>
                  <p className="mt-1 truncate font-medium">{h.title}</p>
                  {h.subtitle && <p className="mt-1 truncate text-sm text-white/50">{h.subtitle}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </section>
  );
}

export default function SearchPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return <Suspense fallback={<BreathingLoader label="Loading search" />}><SearchInner /></Suspense>;
}
