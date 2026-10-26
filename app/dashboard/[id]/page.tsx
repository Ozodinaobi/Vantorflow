"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { ExtractResult, Opportunity, Requirement, RfqRecord, ResponseSection, SECTIONS, Section, Stage } from "@/lib/types";
import { computeReadiness } from "@/lib/readiness";
import { formatDate, formatDateTime } from "@/lib/time";
import { buildDocx, downloadBlob } from "@/lib/docx";
import { buildPdf } from "@/lib/pdf";
import { Pipeline } from "@/components/Pipeline";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { BreathingLoader, LoadingBlock, Reveal } from "@/components/ui";
import { QualificationPanel, OutcomePanel, ApprovalPanel, AssistantPanel } from "@/components/OpportunityPanels";
import { daysUntil, deadlineTone, countdownLabel } from "@/lib/deadline";

interface Detail {
  opportunity: Opportunity;
  rfq: RfqRecord | null;
  requirements: Requirement[];
  drafts: ResponseSection[];
}

// Opportunity detail: pipeline, RFQ, requirement extraction + review, traceability, drafts, download.
// Every save goes through a server route that checks the signed-in user owns the opportunity.
export default function OpportunityPage() {
  const params = useParams<{ id: string }>();
  const oppId = params.id;

  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Extraction review: nothing is saved until the user clicks "Save requirements".
  const [extracting, setExtracting] = useState(false);
  const [review, setReview] = useState<ExtractResult | null>(null);
  const [savingReqs, setSavingReqs] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string; kind: string }[]>([]);
  const [companyId, setCompanyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<Detail>(`/api/opportunities/${oppId}`);
      setData(d);
      setNotFound(false);
    } catch (e) {
      setData(null);
      setNotFound(true);
      setMessage({ kind: "error", text: `Could not load: ${errorText(e)}` });
    } finally {
      setLoading(false);
    }
  }, [oppId]);

  useEffect(() => {
    load();
  }, [load]);

  // Contractor registry for the "Submitting as" dropdown. Empty list if the companies table is not set up yet.
  useEffect(() => {
    api<{ companies: { id: string; name: string; kind: string }[] }>("/api/companies")
      .then((r) => setCompanies(r.companies ?? []))
      .catch(() => setCompanies([]));
  }, []);

  const opp = data?.opportunity ?? null;
  const rfq = data?.rfq ?? null;
  const reqs = useMemo(() => data?.requirements ?? [], [data]);
  const drafts = useMemo(() => data?.drafts ?? [], [data]);

  const readiness = useMemo(() => computeReadiness({ requirements: reqs, drafts }), [reqs, drafts]);

  // ---- Change the pipeline stage ----
  async function changeStage(stage: Stage) {
    if (!opp) return;
    setMessage(null);
    try {
      const r = await api<{ opportunity: Opportunity }>(`/api/opportunities/${opp.id}`, { method: "PATCH", body: { status: stage } });
      setData((prev) => (prev ? { ...prev, opportunity: r.opportunity } : prev));
      setMessage({ kind: "ok", text: `Stage saved as ${stage}.` });
    } catch (e) {
      setMessage({ kind: "error", text: `Stage was NOT saved: ${errorText(e)}` });
    }
  }

  // ---- Ask Gemini to extract requirements (no saving yet) ----
  async function runExtract() {
    if (!rfq) return;
    setMessage(null);
    setExtracting(true);
    try {
      const res = await api<ExtractResult>("/api/extract", { method: "POST", body: { rfqText: rfq.rfq_text } });
      setReview(res);
    } catch (e) {
      setMessage({ kind: "error", text: errorText(e) });
    } finally {
      setExtracting(false);
    }
  }

  // ---- Save the reviewed requirements (server replaces the list in one step, so no duplicates) ----
  async function saveReviewed() {
    if (!review || !opp) return;
    setMessage(null);
    setSavingReqs(true);
    try {
      const r = await api<{ requirements: Requirement[] }>(`/api/opportunities/${opp.id}/requirements`, {
        method: "PUT",
        body: { requirements: review.requirements },
      });
      setData((prev) => (prev ? { ...prev, requirements: r.requirements } : prev));
      setReview(null);
      setMessage({ kind: "ok", text: `Saved ${r.requirements.length} requirements.` });
    } catch (e) {
      setMessage({ kind: "error", text: `Requirements were NOT saved: ${errorText(e)}. Run extraction again.` });
    } finally {
      setSavingReqs(false);
    }
  }

  // ---- Map a requirement to a response section ----
  async function mapRequirement(req: Requirement, section: string) {
    setMessage(null);
    try {
      const r = await api<{ requirement: Requirement }>(`/api/requirements/${req.id}`, {
        method: "PATCH",
        body: { section: section === "" ? null : section },
      });
      setData((prev) =>
        prev ? { ...prev, requirements: prev.requirements.map((x) => (x.id === req.id ? r.requirement : x)) } : prev
      );
    } catch (e) {
      setMessage({ kind: "error", text: `Mapping was NOT saved: ${errorText(e)}` });
    }
  }

  // ---- Draft each section with Gemini, then save the drafts ----
  async function runGenerate() {
    if (!opp) return;
    setMessage(null);
    setGenerating(true);
    try {
      const sections = SECTIONS.map((s) => ({
        section: s,
        requirements: reqs.filter((r) => r.section === s).map((r) => ({ number: r.number, text: r.text, category: r.category })),
      }));
      const gen = await api<{ drafts: { section: string; draft: string }[] }>("/api/generate", {
        method: "POST",
        body: { title: opp.title, buyer: opp.buyer, sections, companyId: companyId || undefined },
      });
      const saved = await api<{ drafts: ResponseSection[] }>(`/api/opportunities/${opp.id}/drafts`, {
        method: "PUT",
        body: { drafts: gen.drafts },
      });
      setData((prev) => (prev ? { ...prev, drafts: saved.drafts } : prev));
      setMessage({ kind: "ok", text: "Drafts generated and saved." });
    } catch (e) {
      setMessage({ kind: "error", text: errorText(e) });
    } finally {
      setGenerating(false);
    }
  }

  // ---- Build and download the .docx ----
  async function downloadDocument() {
    if (!opp) return;
    try {
      const blob = await buildDocx(opp, drafts, reqs);
      const safeName = opp.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "response";
      downloadBlob(blob, `${safeName}-response.docx`);
    } catch (e) {
      setMessage({ kind: "error", text: `Could not build the document: ${errorText(e)}` });
    }
  }

  // ---- Build and download the PDF (same content as the .docx) ----
  async function downloadPdf() {
    if (!opp) return;
    try {
      const blob = await buildPdf(opp, drafts, reqs);
      const safeName = opp.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "response";
      downloadBlob(blob, `${safeName}-response.pdf`);
    } catch (e) {
      setMessage({ kind: "error", text: `Could not build the PDF: ${errorText(e)}` });
    }
  }

  const mappedCount = reqs.filter((r) => r.section).length;
  const draftedCount = SECTIONS.filter((s) => drafts.some((d) => d.section === s && d.draft.trim())).length;

  if (loading) return <LoadingBlock label="Loading opportunity" />;
  if (notFound || !opp) {
    return (
      <div className="glass rounded-3xl p-8">
        <p className="font-serif text-2xl">Opportunity not found.</p>
        {message && <p className="mt-2 text-sm text-red-300">{message.text}</p>}
        <Link href="/dashboard" className="btn-secondary mt-6">Back to opportunities</Link>
      </div>
    );
  }

  const busyLabel = (on: boolean, idle: string, active: string) => (on ? active : idle);

  return (
    <section className="space-y-8">
      <div>
        <Link href="/dashboard" className="link-u !min-h-[44px] text-sm">Back to opportunities</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="label-mono mb-3">Opportunity</p>
            <h1 className="font-serif text-4xl font-medium leading-[0.95] tracking-tighter sm:text-5xl">{opp.title}</h1>
            <p className="mt-4 text-sm text-white/50">
              Buyer: {opp.buyer} · Deadline: {formatDate(opp.deadline)} · Last updated: {formatDateTime(opp.updated_at)}
            </p>
            <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
              ["overdue","urgent"].includes(deadlineTone(daysUntil(opp.deadline))) ? "border-red-500/40 text-red-300" : deadlineTone(daysUntil(opp.deadline)) === "soon" ? "border-emerald-500/40 text-emerald-300" : "border-white/10 text-white/50"
            }`}>{countdownLabel(daysUntil(opp.deadline))}</span>
          </div>
          <ReadinessBadge readiness={readiness} />
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-2xl border p-4 text-sm ${
            message.kind === "ok"
              ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-200"
              : "border-red-500/20 bg-red-500/[0.06] text-red-300"
          }`}
        >
          {message.text}
        </p>
      )}

      <Reveal>
        <div className="card">
          <p className="label-mono mb-4">Stage</p>
          <Pipeline current={opp.status} onChange={changeStage} />
        </div>
      </Reveal>

      <Reveal>
        <div className="card">
          <p className="label-mono mb-3">RFQ text</p>
          <h2 className="mb-3 font-serif text-2xl">Source document</h2>
          {rfq ? (
            <details className="group">
              <summary className="link-u cursor-pointer text-sm">
                Show the RFQ text ({rfq.rfq_text.length.toLocaleString("en-GB")} characters)
              </summary>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/5 bg-black/40 p-4 font-mono text-xs leading-relaxed text-bone/70">
                {rfq.rfq_text}
              </pre>
            </details>
          ) : (
            <p className="text-sm text-red-300">No RFQ text is linked to this opportunity.</p>
          )}
        </div>
      </Reveal>

      <Reveal>
        <div className="card space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-mono mb-3">Extraction</p>
              <h2 className="font-serif text-3xl tracking-tight">Requirements</h2>
              <p className="mt-2 text-sm text-white/50">
                {reqs.length} requirement{reqs.length === 1 ? "" : "s"} saved · {mappedCount} mapped to a section
              </p>
            </div>
            <button type="button" className="btn-primary" disabled={extracting || !rfq} onClick={runExtract}>
              {busyLabel(extracting, reqs.length ? "Re-extract requirements" : "Extract requirements", "Extracting with Gemini")}
            </button>
          </div>

          {extracting && (
            <div className="breathing-panel flex items-center gap-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5">
              <BreathingLoader label="Reading the RFQ and extracting requirements" />
            </div>
          )}

          {review && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="font-serif text-xl">
                Review: Gemini found {review.requirements.length} requirements. Saving replaces the current list.
              </p>
              <div className="mt-3 space-y-1 text-sm text-white/60">
                <p>Buyer: {review.buyer ?? "not stated"}</p>
                <p>Deadline: {review.deadline ?? "not stated"}</p>
                <p>Scope: {review.scope ?? "not stated"}</p>
              </div>
              <ol className="mt-4 max-h-80 list-decimal space-y-2 overflow-auto pl-5 text-sm text-bone/80">
                {review.requirements.map((r) => (
                  <li key={r.number}>
                    <span className="label-mono mr-1 !text-[9px] !text-emerald-400/80">[{r.category}]</span> {r.text}
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className="btn-primary" disabled={savingReqs} onClick={saveReviewed}>
                  {savingReqs ? "Saving..." : "Save requirements"}
                </button>
                <button type="button" className="btn-secondary" disabled={savingReqs} onClick={() => setReview(null)}>
                  Discard
                </button>
              </div>
            </div>
          )}

          {reqs.length === 0 ? (
            <p className="text-sm text-white/45">No requirements saved yet. Extract them from the RFQ text above.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="w-14">#</th>
                    <th>Requirement</th>
                    <th className="w-36">Category</th>
                    <th className="w-56">Response section</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="tabular-nums text-white/50">{r.number}</td>
                      <td>{r.text}</td>
                      <td className="text-white/60">{r.category}</td>
                      <td>
                        <select
                          aria-label={`Response section for requirement ${r.number}`}
                          className="input !min-h-[44px] !py-2 !text-sm"
                          value={r.section ?? ""}
                          onChange={(e) => mapRequirement(r, e.target.value)}
                        >
                          <option value="">Not mapped</option>
                          {SECTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-sm text-white/60">
                Coverage: <span className="font-serif text-lg text-bone">{mappedCount}</span> of {reqs.length} requirements mapped
              </p>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal>
        <div className="card space-y-6">
          <label className="block text-sm">
            <span className="mb-1.5 block text-white/60">Submitting as</span>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-emerald-500/50"
            >
              <option value="">No contractor (generic voice)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-mono mb-3">Drafting</p>
              <h2 className="font-serif text-3xl tracking-tight">Response sections</h2>
              <p className="mt-2 text-sm text-white/50">{draftedCount} of {SECTIONS.length} sections drafted</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-primary" disabled={generating || mappedCount === 0} onClick={runGenerate}>
                {busyLabel(generating, "Generate drafts", "Drafting with Gemini")}
              </button>
              <button type="button" className="btn-secondary" disabled={drafts.length === 0} onClick={downloadDocument}>
                Download .docx
              </button>
              <button type="button" className="btn-secondary" disabled={drafts.length === 0} onClick={downloadPdf}>
                Download PDF
              </button>
            </div>
          </div>

          {generating && (
            <div className="breathing-panel flex items-center gap-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5">
              <BreathingLoader label="Drafting each section from its mapped requirements" />
            </div>
          )}

          {mappedCount === 0 && <p className="text-sm text-white/45">Map at least one requirement to a section before generating drafts.</p>}

          <div className="grid gap-4 md:grid-cols-2">
            {SECTIONS.map((s: Section) => {
              const d = drafts.find((x) => x.section === s);
              const mapped = reqs.filter((r) => r.section === s).length;
              return (
                <div key={s} className="shimmer-border glass rounded-3xl p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-xl">{s}</h3>
                    <span className="label-mono !text-[9px]">{mapped} mapped</span>
                  </div>
                  {d?.draft?.trim() ? (
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-bone/75">{d.draft}</div>
                  ) : (
                    <p className="mt-4 text-sm italic text-white/35">Not drafted yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      <QualificationPanel oppId={opp.id} onMessage={setMessage} />
      <OutcomePanel opp={opp} onSaved={() => load()} onMessage={setMessage} />
      <ApprovalPanel oppId={opp.id} onMessage={setMessage} />
      <AssistantPanel oppId={opp.id} />
    </section>
  );
}
