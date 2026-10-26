"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { ExtractResult, Opportunity, Requirement, RfqRecord, ResponseSection, SECTIONS, Section, Stage } from "@/lib/types";
import { computeReadiness } from "@/lib/readiness";
import { formatDate, formatDateTime } from "@/lib/time";
import { buildDocx, downloadBlob } from "@/lib/docx";
import { buildPdf } from "@/lib/pdf";
import SharePanel from "@/components/SharePanel";
import { Pipeline } from "@/components/Pipeline";
import { ReadinessBadge } from "@/components/ReadinessBadge";
import { LoadingBlock } from "@/components/ui";
import { QualificationPanel, OutcomePanel, ApprovalPanel, AssistantPanel } from "@/components/OpportunityPanels";
import { daysUntil, deadlineTone, countdownLabel } from "@/lib/deadline";
import { categoryConfidence, CONFIDENCE_LABEL } from "@/lib/confidence";
import { requirementsFromCsv } from "@/lib/csv";
import { OpportunityExtras } from "@/components/OpportunityExtras";

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
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);

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
  const [templates, setTemplates] = useState<{ id: string; name: string; kind: string; content: string }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const activeTemplate = templates.find((t) => t.id === templateId) ?? null;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSection, setBulkSection] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);

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
  // Document templates for the wrapper dropdown. Empty list if none exist yet.
  useEffect(() => {
    api<{ templates: { id: string; name: string; kind: string; content: string }[] }>("/api/templates")
      .then((r) => setTemplates(r.templates ?? []))
      .catch(() => setTemplates([]));
  }, []);

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

  // ---- Bulk remap selected requirements to one section ----
  async function applyBulk() {
    if (selected.size === 0) return;
    setMessage(null);
    try {
      const r = await api<{ updated: number }>("/api/requirements/bulk", {
        method: "PATCH",
        body: { ids: Array.from(selected), section: bulkSection === "" ? null : bulkSection },
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              requirements: prev.requirements.map((x) =>
                selected.has(x.id) ? { ...x, section: (bulkSection || null) as Requirement["section"] } : x
              ),
            }
          : prev
      );
      setSelected(new Set());
      setMessage({ kind: "ok", text: `Mapped ${r.updated} requirement${r.updated === 1 ? "" : "s"}.` });
    } catch (e) {
      setMessage({ kind: "error", text: `Bulk change was NOT saved: ${errorText(e)}` });
    }
  }

  // ---- CSV paste (number,description,category) appended to the saved list ----
  async function importCsv() {
    if (!opp || !csvText.trim()) return;
    const parsed = requirementsFromCsv(csvText);
    if (parsed.requirements.length === 0) {
      setMessage({ kind: "error", text: "No rows found. Use one requirement per line: number,description,category." });
      return;
    }
    setCsvBusy(true);
    setMessage(null);
    try {
      const merged = [
        ...reqs.map((r) => ({ text: r.text, category: r.category })),
        ...parsed.requirements.map((r) => ({ text: r.text, category: r.category })),
      ];
      const r = await api<{ requirements: Requirement[] }>(`/api/opportunities/${opp.id}/requirements`, {
        method: "PUT",
        body: { requirements: merged },
      });
      setData((prev) => (prev ? { ...prev, requirements: r.requirements } : prev));
      setCsvText("");
      setMessage({
        kind: "ok",
        text: `Imported ${parsed.requirements.length} from CSV${parsed.skipped ? ` (${parsed.skipped} blank rows skipped)` : ""}. Existing sections were reset: map them again.`,
      });
    } catch (e) {
      setMessage({ kind: "error", text: `CSV import was NOT saved: ${errorText(e)}` });
    } finally {
      setCsvBusy(false);
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
      const blob = await buildDocx(opp, drafts, reqs, activeTemplate);
      const safeName = opp.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "response";
      downloadBlob(blob, `${safeName}-response.docx`);
    } catch (e) {
      setMessage({ kind: "error", text: `Could not build the document: ${errorText(e)}` });
    }
  }

  // ---- Build and download the PDF (same content as the .docx) ----
  // ---- Duplicate: creates a clean copy (no requirements, drafts or outcome) and opens it ----
  async function duplicate() {
    setDuplicating(true);
    setMessage(null);
    try {
      const d = await api<{ opportunity: { id: string } }>(`/api/opportunities/${opp?.id}/duplicate`, { method: "POST" });
      router.push(`/dashboard/${d.opportunity.id}`);
    } catch (e) {
      setMessage({ kind: "error", text: `Could not duplicate: ${errorText(e)}` });
      setDuplicating(false);
    }
  }

  // ---- Summary PDF: one-page opportunity summary (title, buyer, deadline, value, stage, readiness, requirement counts) ----
  async function downloadSummary() {
    if (!opp) return;
    try {
      const { buildSummaryPdf } = await import("@/lib/summaryPdf");
      const blob = await buildSummaryPdf({
        title: opp.title,
        buyer: opp.buyer,
        deadline: formatDate(opp.deadline),
        value: opp.value,
        stage: opp.status,
        readiness: `${readiness.score}%`,
        requirements: reqs.length,
        mapped: mappedCount,
      });
      downloadBlob(blob, `${(opp.title || "opportunity").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-summary.pdf`);
    } catch (e) {
      setMessage({ kind: "error", text: `Could not build the summary PDF: ${errorText(e)}` });
    }
  }

  async function downloadPdf() {
    if (!opp) return;
    try {
      const blob = await buildPdf(opp, drafts, reqs, activeTemplate);
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
        <p className="font-sans text-2xl">Opportunity not found.</p>
        {message && <p className="mt-2 text-sm text-red-700">{message.text}</p>}
        <Link href="/dashboard" className="btn-secondary mt-6">Back to opportunities</Link>
      </div>
    );
  }

  const busyLabel = (on: boolean, idle: string, active: string) => (on ? active : idle);

  return (
    <section className="space-y-6">
      <div>
        <Link href="/dashboard/opportunities" className="link-u !min-h-[44px] text-sm">Back to opportunities</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="label-mono mb-1">Opportunity</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">{opp.title}</h1>
            <p className="mt-4 text-sm text-slate-500">
              Buyer: {opp.buyer} · Deadline: {formatDate(opp.deadline)} · Last updated: {formatDateTime(opp.updated_at)}
            </p>
            <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
              ["overdue","urgent"].includes(deadlineTone(daysUntil(opp.deadline))) ? "border-red-200 text-red-700" : deadlineTone(daysUntil(opp.deadline)) === "soon" ? "border-blue-200 text-blue-700" : "border-slate-200 text-slate-500"
            }`}>{countdownLabel(daysUntil(opp.deadline))}</span>
          </div>
          <div className="flex flex-col items-end gap-3">
            <ReadinessBadge readiness={readiness} />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-secondary" disabled={duplicating} onClick={duplicate}>
                {duplicating ? "Duplicating" : "Duplicate"}
              </button>
              <button type="button" className="btn-secondary" onClick={downloadSummary}>
                Summary PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-2xl border p-4 text-sm ${
            message.kind === "ok"
              ? "border-blue-200 bg-blue-600/[0.06] text-blue-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div>
        <div className="card">
          <p className="label-mono mb-4">Stage</p>
          <Pipeline current={opp.status} onChange={changeStage} />
        </div>
      </div>

      <div>
        <div className="card">
          <p className="label-mono mb-3">RFQ text</p>
          <h2 className="mb-3 font-sans text-2xl">Source document</h2>
          {rfq ? (
            <details className="group">
              <summary className="link-u cursor-pointer text-sm">
                Show the RFQ text ({rfq.rfq_text.length.toLocaleString("en-GB")} characters)
              </summary>
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-100 p-4 font-mono text-xs leading-relaxed text-slate-700">
                {rfq.rfq_text}
              </pre>
            </details>
          ) : (
            <p className="text-sm text-red-700">No RFQ text is linked to this opportunity.</p>
          )}
        </div>
      </div>

      <div>
        <div className="card space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-mono mb-3">Extraction</p>
              <h2 className="font-sans text-3xl tracking-tight">Requirements</h2>
              <p className="mt-2 text-sm text-slate-500">
                {reqs.length} requirement{reqs.length === 1 ? "" : "s"} saved · {mappedCount} mapped to a section
              </p>
            </div>
            <button type="button" className="btn-primary" disabled={extracting || !rfq} onClick={runExtract}>
              {busyLabel(extracting, reqs.length ? "Re-extract requirements" : "Extract requirements", "Extracting with Gemini")}
            </button>
          </div>

          {extracting && (
            <div className=" flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-600/[0.03] p-5">
              <p className="text-sm text-slate-600">Reading the RFQ and extracting requirements…</p>
            </div>
          )}

          {review && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-sans text-xl">
                Review: Gemini found {review.requirements.length} requirements. Saving replaces the current list.
              </p>
              <div className="mt-3 space-y-1 text-sm text-slate-500">
                <p>Buyer: {review.buyer ?? "not stated"}</p>
                <p>Deadline: {review.deadline ?? "not stated"}</p>
                <p>Scope: {review.scope ?? "not stated"}</p>
              </div>
              <ol className="mt-4 max-h-80 list-decimal space-y-2 overflow-auto pl-5 text-sm text-slate-700">
                {review.requirements.map((r) => (
                  <li key={r.number}>
                    <span className="label-mono mr-1 !text-[9px] !text-blue-700/80">[{r.category}]</span> {r.text}
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
            <p className="text-sm text-slate-500">No requirements saved yet. Extract them from the RFQ text above.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all requirements"
                        className="h-4 w-4 accent-blue-600"
                        checked={selected.size === reqs.length && reqs.length > 0}
                        onChange={(e) => setSelected(e.target.checked ? new Set(reqs.map((x) => x.id)) : new Set())}
                      />
                    </th>
                    <th className="w-14">#</th>
                    <th>Requirement</th>
                    <th className="w-36">Category</th>
                    <th className="w-56">Response section</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-slate-50">
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select requirement ${r.number}`}
                          className="h-4 w-4 accent-blue-600"
                          checked={selected.has(r.id)}
                          onChange={(e) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(r.id);
                              else next.delete(r.id);
                              return next;
                            })
                          }
                        />
                      </td>
                      <td className="tabular-nums text-slate-500">{r.number}</td>
                      <td>{r.text}</td>
                      <td className="text-slate-500">
                        {r.category}
                        {(() => {
                          const c = categoryConfidence(r.text, r.category);
                          return (
                            <span className={`ml-2 inline-flex rounded-full border px-2 py-0.5 text-xs ${
                              c.level === "high" ? "border-emerald-200 text-emerald-700" : c.level === "medium" ? "border-blue-200 text-blue-700" : "border-amber-200 text-amber-700"
                            }`} title={`${c.matches} category keyword match${c.matches === 1 ? "" : "es"} in the text`}>
                              {CONFIDENCE_LABEL[c.level]}
                            </span>
                          );
                        })()}
                      </td>
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
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-3">
                <span className="text-sm text-slate-500">{selected.size} selected</span>
                <select
                  aria-label="Bulk response section"
                  className="input !min-h-[44px] !py-2 !text-sm"
                  value={bulkSection}
                  onChange={(e) => setBulkSection(e.target.value)}
                >
                  <option value="">Not mapped</option>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" className="btn-secondary" disabled={selected.size === 0} onClick={applyBulk}>
                  Apply to selected
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Coverage: <span className="font-sans text-lg text-slate-900">{mappedCount}</span> of {reqs.length} requirements mapped
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="card space-y-4">
          <p className="label-mono">Bulk import</p>
          <h2 className="font-sans text-2xl">Paste requirements as CSV</h2>
          <p className="text-sm text-slate-500">One per line: number,description,category (category: Technical, Commercial, Compliance, Delivery, Other). Header row optional.</p>
          <textarea
            aria-label="CSV of requirements"
            className="input min-h-[120px] font-mono text-xs"
            placeholder={"1,Provide ISO 9001 certificate,Compliance\n2,Deliver within 12 weeks,Delivery"}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <button type="button" className="btn-secondary" disabled={csvBusy || !csvText.trim()} onClick={importCsv}>
            {csvBusy ? "Importing..." : "Import CSV"}
          </button>
        </div>
      </div>

      <div>
        <div className="card space-y-6">
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-500">Submitting as</span>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-blue-200"
            >
              <option value="">No contractor (generic voice)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-500">Document template</span>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-blue-200"
            >
              <option value="">Plain document (no template)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-mono mb-3">Drafting</p>
              <h2 className="font-sans text-3xl tracking-tight">Response sections</h2>
              <p className="mt-2 text-sm text-slate-500">{draftedCount} of {SECTIONS.length} sections drafted</p>
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
            <div className=" flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-600/[0.03] p-5">
              <p className="text-sm text-slate-600">Drafting each section from its mapped requirements…</p>
            </div>
          )}

          {mappedCount === 0 && <p className="text-sm text-slate-500">Map at least one requirement to a section before generating drafts.</p>}

          <div className="grid gap-4 md:grid-cols-2">
            {SECTIONS.map((s: Section) => {
              const d = drafts.find((x) => x.section === s);
              const mapped = reqs.filter((r) => r.section === s).length;
              return (
                <div key={s} className=" glass rounded-3xl p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-sans text-xl">{s}</h3>
                    <span className="label-mono !text-[9px]">{mapped} mapped</span>
                  </div>
                  {d?.draft?.trim() ? (
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{d.draft}</div>
                  ) : (
                    <p className="mt-4 text-sm italic text-slate-500">Not drafted yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <QualificationPanel oppId={opp.id} onMessage={setMessage} />
      <OutcomePanel opp={opp} onSaved={() => load()} onMessage={setMessage} />
      <ApprovalPanel oppId={opp.id} onMessage={setMessage} />
      <OpportunityExtras oppId={opp.id} onMessage={setMessage} />
      <SharePanel oppId={opp.id} />
      <AssistantPanel oppId={opp.id} />
    </section>
  );
}
