// Public, read-only proposal page. Dark theme. The token is the only credential.
import Link from "next/link";
import { readinessTone } from "@/lib/shareView";

interface Proposal {
  title: string;
  buyer: string;
  deadline: string | null;
  status: string;
  readiness: { score: number; total: number; mapped: number; drafted: number; sectionCount: number };
  sections: { section: string; draft: string }[];
  requirements: { number: number; category: string; text: string; section: string | null }[];
  expiresAt: string;
}

async function load(token: string): Promise<{ proposal?: Proposal; error?: string }> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://vantorflow.vercel.app";
  try {
    const res = await fetch(`${base}/api/share/${encodeURIComponent(token)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "This link is not available." };
    return { proposal: data.proposal };
  } catch {
    return { error: "Could not load this proposal right now. Try again in a moment." };
  }
}

export default async function SharePage({ params }: { params: { token: string } }) {
  const { proposal, error } = await load(params.token);

  if (error || !proposal) {
    return (
      <main className="min-h-screen bg-[#050505] px-6 py-24 text-[#EBEBEB]">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Vantorflow</p>
          <h1 className="mt-4 font-serif text-3xl">Link not available</h1>
          <p className="mt-3 text-sm text-white/60">{error}</p>
          <Link href="/" className="mt-6 inline-block text-sm text-emerald-300 underline">Back to Vantorflow</Link>
        </div>
      </main>
    );
  }

  const r = proposal.readiness;
  const pct = r.total ? Math.round((r.mapped / r.total) * 100) : 0;
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] px-4 py-10 text-[#EBEBEB] sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">Proposal, read only</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{proposal.title}</h1>
          <p className="mt-2 text-sm text-white/60">Buyer: {proposal.buyer}</p>
          {proposal.deadline && <p className="text-sm text-white/60">Deadline: {proposal.deadline}</p>}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Stage" value={proposal.status} />
            <Stat label="Readiness" value={`${r.score}%`} />
            <Stat label="Requirements mapped" value={`${pct}%`} />
            <Stat label="Sections drafted" value={`${r.drafted} of ${r.sectionCount}`} />
          </div>
          <p className="mt-4 text-xs text-white/40">{readinessTone(r.score)}</p>
        </header>

        <section className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Sections</p>
          {proposal.sections.map((s) => (
            <article key={s.section} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
              <h2 className="font-serif text-2xl">{s.section}</h2>
              {s.draft.trim() ? (
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/80">
                  {s.draft.split(/\n\s*\n/).map((p, i) => (
                    <p key={i} className="whitespace-pre-line break-words">{p.trim()}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm italic text-white/40">Not drafted yet.</p>
              )}
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Requirements</p>
          {proposal.requirements.length === 0 ? (
            <p className="mt-3 text-sm text-white/40">No requirements yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {proposal.requirements.map((q) => (
                <li key={q.number} className="break-words border-b border-white/5 pb-2">
                  <span className="text-emerald-300">{q.number}.</span> {q.text}{" "}
                  <span className="text-white/40">({q.category}{q.section ? `, ${q.section}` : ", not mapped"})</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-white/35">This link expires {new Date(proposal.expiresAt).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" })} (Lagos time).</p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-1 font-serif text-xl">{value}</p>
    </div>
  );
}
