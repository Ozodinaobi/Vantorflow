"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { QUAL_FIELDS, computeVerdict, Verdict } from "@/lib/qualification";
import { OUTCOME_REASONS } from "@/lib/intelligence";
import { formatDateTime } from "@/lib/time";
import { BreathingLoader, Reveal } from "@/components/ui";
import type { Opportunity } from "@/lib/types";

type Msg = { kind: "ok" | "error"; text: string } | null;

const VERDICT_CLASS: Record<Verdict, string> = {
  Qualified: "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400",
  Review: "border-slate-200 bg-slate-50 text-slate-900",
  Declined: "border-red-200 bg-red-50 text-red-700",
};

// ---------- Qualification: 7 scored fields (1 to 5) + notes; verdict is computed on the server ----------
export function QualificationPanel({ oppId, onMessage }: { oppId: string; onMessage: (m: Msg) => void }) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [verdict, setVerdict] = useState<{ verdict: Verdict; reason: string; average: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    api<{ qualification: any }>(`/api/opportunities/${oppId}/qualification`)
      .then((d) => {
        if (d.qualification) {
          const q = d.qualification;
          const s: Record<string, number> = {};
          QUAL_FIELDS.forEach((f) => (s[f.key] = q[f.key]));
          setScores(s);
          setNotes(q.notes ?? "");
          setVerdict({ verdict: q.verdict, reason: q.reason ?? "", average: q.average });
        }
      })
      .catch((e: any) => {
        if (e?.setupRequired) setSetupRequired(true);
        else onMessage({ kind: "error", text: `Qualification did not load: ${errorText(e)}` });
      })
      .finally(() => setLoading(false));
  }, [oppId, onMessage]);

  const complete = QUAL_FIELDS.every((f) => scores[f.key] >= 1 && scores[f.key] <= 5);
  const preview = complete ? computeVerdict(scores as any) : null;

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api<{ qualification: any }>(`/api/opportunities/${oppId}/qualification`, {
        method: "PUT",
        body: { scores, notes },
      });
      setVerdict({ verdict: r.qualification.verdict, reason: r.qualification.reason ?? "", average: r.qualification.average });
      onMessage({ kind: "ok", text: `Qualification saved: ${r.qualification.verdict}.` });
    } catch (err) {
      onMessage({ kind: "error", text: `Qualification was NOT saved: ${errorText(err)}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Reveal>
      <div className="card glass-interactive animate-enter space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Bid / no-bid</p>
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Qualification</h2>
            <p className="mt-2 text-sm text-slate-500">Score each factor 1 (weak) to 5 (strong). The verdict is worked out from your scores.</p>
          </div>
          {verdict && (
            <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-wider ${VERDICT_CLASS[verdict.verdict]}`}>
              {verdict.verdict} · {verdict.average.toFixed(1)}
            </span>
          )}
        </div>

        {loading && <BreathingLoader label="Loading qualification" />}
        {setupRequired && (
          <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Qualification is coming online after setup. Run the FEATURES MIGRATION SQL once in Supabase, then reload.
          </p>
        )}

        {!loading && !setupRequired && (
          <form onSubmit={save} className="space-y-5">
            {QUAL_FIELDS.map((f) => (
              <fieldset key={f.key} className="space-y-2">
                <legend className="text-sm">{f.label}</legend>
                <p className="text-xs text-slate-500">{f.hint}</p>
                <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={f.label}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = scores[f.key] === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setScores((s) => ({ ...s, [f.key]: n }))}
                        className={`min-h-[44px] rounded-xl border text-sm tabular-nums transition-colors duration-300 ${
                          on ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-200"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <label className="block text-sm">
              <span className="mb-1.5 block text-slate-500">Notes</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30"
              />
            </label>

            {preview && (
              <p className="text-sm text-slate-500">
                Current scores give <span className="text-slate-900">{preview.verdict}</span>: {preview.reason}
              </p>
            )}
            <button type="submit" disabled={saving || !complete} className="btn-primary">
              {saving ? "Saving" : "Save qualification"}
            </button>
            {!complete && <p className="text-xs text-slate-500">Score all seven factors to save.</p>}
          </form>
        )}
      </div>
    </Reveal>
  );
}

// ---------- Win / loss outcome ----------
export function OutcomePanel({ opp, onSaved, onMessage }: { opp: Opportunity; onSaved: (o: Opportunity) => void; onMessage: (m: Msg) => void }) {
  const [result, setResult] = useState<"Won" | "Lost" | "">(opp.outcome_result ?? "");
  const [reason, setReason] = useState(opp.outcome_reason ?? "");
  const [notes, setNotes] = useState(opp.outcome_notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!result) return;
    setSaving(true);
    try {
      const r = await api<{ opportunity: Opportunity }>(`/api/opportunities/${opp.id}/outcome`, {
        method: "PUT",
        body: { result, reason, notes },
      });
      onSaved(r.opportunity);
      onMessage({ kind: "ok", text: `Outcome saved: ${result}.` });
    } catch (err) {
      onMessage({ kind: "error", text: `Outcome was NOT saved: ${errorText(err)}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Reveal>
      <form onSubmit={save} className="card glass-interactive animate-enter space-y-5">
        <div>
          <p className="eyebrow mb-3">Outcome</p>
          <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Won or lost?</h2>
          {opp.outcome_result && (
            <p className="mt-2 text-sm text-slate-500">
              Recorded as {opp.outcome_result} {opp.outcome_at ? `on ${formatDateTime(opp.outcome_at)}` : ""}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["Won", "Lost"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={result === r}
              onClick={() => setResult(r)}
              className={`min-h-[44px] rounded-xl border text-sm transition-colors ${
                result === r ? (r === "Won" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-slate-200 bg-emerald-500 text-[#050505]") : "border-slate-200 text-slate-700"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-500">Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30">
            <option value="">Choose a reason</option>
            {OUTCOME_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-slate-500">Notes</span>
          <textarea rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30" />
        </label>
        <button type="submit" disabled={saving || !result} className="btn-primary">{saving ? "Saving" : "Save outcome"}</button>
      </form>
    </Reveal>
  );
}

// ---------- Approvals: request with note; approve or reject with signature name and timestamp ----------
export function ApprovalPanel({ oppId, onMessage }: { oppId: string; onMessage: (m: Msg) => void }) {
  const [approval, setApproval] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [note, setNote] = useState("");
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ approval: any }>(`/api/opportunities/${oppId}/approval`)
      .then((d) => setApproval(d.approval))
      .catch((e: any) => {
        if (e?.setupRequired) setSetupRequired(true);
        else onMessage({ kind: "error", text: `Approvals did not load: ${errorText(e)}` });
      })
      .finally(() => setLoading(false));
  }, [oppId, onMessage]);

  async function request(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ approval: any }>(`/api/opportunities/${oppId}/approval`, { method: "POST", body: { note } });
      setApproval(r.approval);
      setNote("");
      onMessage({ kind: "ok", text: "Approval requested." });
    } catch (err) {
      onMessage({ kind: "error", text: `Approval request was NOT saved: ${errorText(err)}` });
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "Approved" | "Rejected") {
    if (!signature.trim()) {
      onMessage({ kind: "error", text: "Type your name to sign the decision." });
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ approval: any }>(`/api/opportunities/${oppId}/approval`, {
        method: "PATCH",
        body: { decision, signature: signature.trim(), note },
      });
      setApproval(r.approval);
      setSignature("");
      onMessage({ kind: "ok", text: `${decision} and signed.` });
    } catch (err) {
      onMessage({ kind: "error", text: `Decision was NOT saved: ${errorText(err)}` });
    } finally {
      setBusy(false);
    }
  }

  const status: string = approval?.status ?? "None";
  const statusClass =
    status === "Approved" ? "border-emerald-500/30 text-emerald-400" : status === "Rejected" ? "border-red-200 text-red-700" : status === "Requested" ? "border-slate-200 text-slate-900" : "border-slate-200 text-slate-500";

  return (
    <Reveal>
      <div className="card glass-interactive animate-enter space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Sign-off</p>
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Approvals</h2>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-wider ${statusClass}`}>{status === "None" ? "Not requested" : status}</span>
        </div>

        {loading && <BreathingLoader label="Loading approvals" />}
        {setupRequired && (
          <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Approvals are coming online after setup. Run the FEATURES MIGRATION SQL once in Supabase, then reload.
          </p>
        )}

        {!loading && !setupRequired && (
          <>
            {approval?.requested_note && (
              <p className="text-sm text-slate-500">Request note: {approval.requested_note}</p>
            )}
            {approval?.decided_at && (
              <p className="text-sm text-slate-500">
                {approval.status} by {approval.signature} on {formatDateTime(approval.decided_at)}
                {approval.decision_note ? ` · ${approval.decision_note}` : ""}
              </p>
            )}

            {status !== "Requested" && (
              <form onSubmit={request} className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-500">Request approval: note</span>
                  <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30" />
                </label>
                <button type="submit" disabled={busy} className="btn-secondary">Request approval</button>
              </form>
            )}

            {status === "Requested" && (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-500">Signature (type your full name)</span>
                  <input value={signature} onChange={(e) => setSignature(e.target.value)} maxLength={120} className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-emerald-500/30" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" disabled={busy} onClick={() => decide("Approved")} className="btn-primary">Approve</button>
                  <button type="button" disabled={busy} onClick={() => decide("Rejected")} className="btn-secondary">Reject</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Reveal>
  );
}

// ---------- Assistant: 3 guided prompts answered from the opportunity's full context ----------
export function AssistantPanel({ oppId }: { oppId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ q: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const PROMPTS = [
    { key: "next", label: "What should I do next?" },
    { key: "blocked", label: "Why is this blocked?" },
    { key: "missing", label: "What&apos;s missing?" },
  ];

  const [free, setFree] = useState("");

  async function ask(key: string, label: string, text?: string) {
    setError(null);
    setBusy(key);
    setAnswer(null);
    try {
      const r = await api<{ answer: string }>(`/api/opportunities/${oppId}/assistant`, { method: "POST", body: text ? { text } : { prompt: key } });
      setAnswer({ q: label, text: r.answer });
    } catch (err) {
      setError(`The assistant could not answer: ${errorText(err)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the assistant"
        className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-50/90 px-5 text-sm backdrop-blur-xl  md:bottom-8 md:right-8"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        Assistant
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Assistant"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-slate-50/90 p-6 backdrop-blur-2xl sm:max-w-md"
          >
            <div className="flex items-center justify-between">
              <p className="font-serif text-2xl">Assistant</p>
              <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] rounded-full border border-slate-200 px-4 text-sm">Close</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Answers use this opportunity&apos;s requirements, sections, readiness and stage.</p>

            <div className="mt-6 flex flex-col gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => ask(p.key, p.label)}
                  className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-left text-sm transition-colors hover:border-slate-200 disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-6 flex-1 overflow-y-auto">
              {busy && <BreathingLoader label="Reading the opportunity" />}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              {answer && (
                <div className="space-y-3">
                  <p className="eyebrow">{answer.q}</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{answer.text}</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-xs text-slate-500" htmlFor="assistant-free">Free text</label>
              <input
                id="assistant-free"
                value={free}
                onChange={(e) => setFree(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && free.trim() && busy === null) ask("free", free.trim(), free.trim()); }}
                placeholder="Ask anything about this bid"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
              <button
                type="button"
                disabled={busy !== null || !free.trim()}
                onClick={() => ask("free", free.trim(), free.trim())}
                className="btn-primary mt-2 w-full disabled:opacity-50"
              >
                Ask
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
