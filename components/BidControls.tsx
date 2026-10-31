"use client";

import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";

type Decision = { scores: Record<string, number>; total: number; recommendation: string; rationale?: string; updatedAt?: string };
const criteria = [["fit", "Strategic fit", "How closely does the opportunity match your proven offer?"], ["capacity", "Delivery capacity", "Can the team deliver within the required timeline?"], ["margin", "Commercial margin", "Can you price this sustainably and protect margin?"], ["relationship", "Buyer relationship", "Do you understand the buyer and their priorities?"]] as const;

export function BidDecisionPanel({ opportunityId }: { opportunityId: string }) {
  const [scores, setScores] = useState<Record<string, number>>({ fit: 3, capacity: 3, margin: 3, relationship: 3 });
  const [decision, setDecision] = useState<Decision | null>(null);
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [migration, setMigration] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { api<{ gonogo: Decision | null; migrationRequired?: boolean }>(`/api/opportunities/${opportunityId}/gonogo`).then((res) => { setMigration(Boolean(res.migrationRequired)); if (res.gonogo) { setDecision(res.gonogo); setScores(res.gonogo.scores); } }).catch((e) => setNotice(errorText(e))).finally(() => setLoading(false)); }, [opportunityId]);
  async function save() {
    setBusy(true); setNotice("");
    try { const res = await api<{ gonogo: Decision }>(`/api/opportunities/${opportunityId}/gonogo`, { method: "PUT", body: { scores } }); setDecision(res.gonogo); setMigration(false); setNotice("Scores saved."); }
    catch (e) { setNotice(errorText(e)); }
    finally { setBusy(false); }
  }
  async function recommend() {
    setBusy(true); setNotice("");
    try {
      if (!decision || Object.keys(scores).some((key) => decision.scores[key] !== scores[key])) {
        const saved = await api<{ gonogo: Decision }>(`/api/opportunities/${opportunityId}/gonogo`, { method: "PUT", body: { scores } });
        setDecision(saved.gonogo);
      }
      const res = await api<{ recommendation: string }>(`/api/opportunities/${opportunityId}/gonogo/recommend`, { method: "POST", body: {} });
      setRecommendation(res.recommendation);
    } catch (e) { setNotice(errorText(e)); }
    finally { setBusy(false); }
  }
  const label = (value: string) => value === "go" ? "Pursue" : value === "no-go" ? "Pass" : "Review further";
  return <section className="card space-y-5"><div><p className="label-mono mb-2">Bid decision</p><h2 className="font-serif text-3xl">Go / no-go brief</h2><p className="mt-2 text-sm text-white/45">Score each factor from 1 to 5. Your team owns the decision.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">{criteria.map(([key, name, hint]) => <label key={key} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4"><span className="block font-medium">{name}</span><span className="mt-1 block text-xs text-white/40">{hint}</span><select className="input mt-3 !min-h-[42px]" aria-label={name} value={scores[key]} onChange={(e) => setScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></label>)}</div>
    <div className="flex flex-wrap gap-3"><button className="btn-primary" disabled={busy || loading || migration} onClick={save}>{busy ? "Saving..." : "Save scores"}</button><button className="btn-secondary" disabled={busy || loading || migration} onClick={recommend}>Get recommendation</button></div>
    {migration && <p className="text-xs text-white/40">Scores become saveable after the database migration is applied. You can still review the checklist.</p>}
    {decision && <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5"><p className="label-mono mb-2">Saved assessment</p><h3 className="font-serif text-2xl">{label(decision.recommendation)}</h3><p className="mt-2 text-sm text-white/55">Score {decision.total} of 20</p></div>}
    {recommendation && <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-5"><p className="label-mono mb-2">Recommendation</p><p className="text-sm leading-relaxed text-white/70">{recommendation}</p></div>}
    {notice && <p role="status" className="text-sm text-white/55">{notice}</p>}
  </section>;
}

export function CompliancePanel({ requirements, drafts }: { requirements: { number: number; text: string; section: string | null }[]; drafts: { section: string; draft: string }[] }) {
  if (!requirements.length) return <section className="card"><p className="label-mono mb-2">Compliance check</p><h2 className="font-serif text-2xl">Response coverage</h2><p className="mt-3 text-sm text-white/45">Add requirements from the RFQ to check response coverage.</p></section>;
  const checks = requirements.map((requirement) => { const draft = requirement.section ? drafts.find((item) => item.section === requirement.section)?.draft.trim() ?? "" : ""; const covered = Boolean(requirement.section && draft); return { ...requirement, covered }; });
  const count = checks.filter((item) => item.covered).length;
  return <section className="card"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="label-mono mb-2">Compliance check</p><h2 className="font-serif text-2xl">Response coverage</h2></div><span className="label-mono">{count} / {checks.length} covered</span></div><div className="space-y-2">{checks.map((item) => <div key={item.number} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${item.covered ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-300/10 text-amber-200"}`}>{item.covered ? "✓" : "!"}</span><div><p className="text-sm text-bone/85">{item.text}</p><p className="mt-1 text-xs text-white/40">{item.covered ? `Mapped to ${item.section} with a draft` : item.section ? `No response drafted for ${item.section}` : "No response section mapped"}</p></div></div>)}</div><p className="mt-4 text-xs text-white/35">Unmet requirements need a mapped response and a saved draft. Review each answer against the original requirement before submission.</p></section>;
}
