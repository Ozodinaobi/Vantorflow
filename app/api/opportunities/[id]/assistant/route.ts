// POST /api/opportunities/[id]/assistant { prompt: "next" | "blocked" | "missing" }
// Answers one of three guided questions using the opportunity's full context.
// Free text is intentionally not accepted here.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { callGemini } from "@/lib/gemini";
import { errorResponse, rest, UUID_RE } from "@/lib/db";
import { toDraft, toOpportunity, toRequirements } from "@/lib/mappers";
import { computeReadiness } from "@/lib/readiness";
import { SECTIONS, STAGES } from "@/lib/types";
import { daysUntil } from "@/lib/deadline";

type Ctx = { params: { id: string } };

const QUESTIONS: Record<string, string> = {
  next: "What should I do next to move this opportunity forward? Give the top 3 concrete next actions, in order.",
  blocked: "Why is this opportunity blocked, or what is most likely to block it? Be specific, cite requirement numbers and sections where relevant.",
  missing: "What is missing before this bid can be submitted? List the gaps: unmapped requirements, sections with no draft, and any [TO CONFIRM] items.",
};

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const freeText = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
  const question = QUESTIONS[body?.prompt] ?? (freeText ? `Answer this question about the opportunity: ${freeText}` : null);
  if (!question) return NextResponse.json({ error: "Ask a question or pick one of the guided questions." }, { status: 400 });

  try {
    const oppRows = await rest<any[]>("GET", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=*`,
    });
    if (!oppRows.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const opp = toOpportunity(oppRows[0]);

    const [rfqRows, reqRows, draftRows] = await Promise.all([
      opp.rfq_id
        ? rest<any[]>("GET", "rfqs", { query: `?id=eq.${opp.rfq_id}&user_id=eq.${auth.userId}&select=title,buyer_organization,deadline_date,status&limit=1` })
        : Promise.resolve([] as any[]),
      rest<any[]>("GET", "requirements", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*` }),
      rest<any[]>("GET", "response_sections", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*` }),
    ]);
    const requirements = toRequirements(reqRows);
    const mandatoryById = new Map<string, boolean>(reqRows.map((r: any) => [r.id, !!r.mandatory]));
    const drafts = draftRows.map(toDraft);
    const readiness = computeReadiness({ requirements, drafts });
    const days = daysUntil(opp.deadline);

    const sectionLines = SECTIONS.map((s) => {
      const d = drafts.find((x) => x.section === s);
      const has = d && d.draft && d.draft.trim().length > 0;
      const mapped = requirements.filter((r) => r.section === s).length;
      return `- ${s}: ${has ? "draft written" : "NO draft yet"}, ${mapped} requirement(s) mapped`;
    }).join("\n");
    const unmapped = requirements.filter((r) => !r.section);
    const context = [
      `Opportunity: ${opp.title}`,
      `Buyer: ${opp.buyer}`,
      `Current stage: ${opp.status} (stages in order: ${STAGES.join(", ")})`,
      `Deadline: ${opp.deadline ?? "not set"}${days === null ? "" : ` (${days} day(s) from today)`}`,
      `Readiness: ${readiness.score}% (${readiness.mapped}/${readiness.total} requirements mapped, ${readiness.drafted}/${readiness.sectionCount} sections drafted)`,
      `Requirements: ${requirements.length} total, ${unmapped.length} not yet mapped to a section`,
      "Sections:",
      sectionLines,
      "",
      "Requirements (number, category, mandatory, section, text):",
      requirements.length
        ? requirements
            .map((r) => `${r.number}. [${r.category}] ${mandatoryById.get(r.id) ? "MANDATORY" : "optional"} section=${r.section ?? "UNMAPPED"}: ${r.text}`)
            .join("\n")
        : "(no requirements extracted yet)",
    ].join("\n");

    const prompt = [
      "You are Vantorflow's bid assistant for an internal tender team. Answer using ONLY the context below.",
      "Be concise: plain text, short numbered lines, no markdown headings, no bold. Maximum 180 words.",
      "If the context does not contain the answer, say what is missing rather than guessing.",
      "",
      "CONTEXT:",
      context,
      "",
      `QUESTION: ${question}`,
    ].join("\n");

    const answer = await callGemini(prompt);
    return NextResponse.json({ answer, prompt: body.prompt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Assistant could not answer.";
    return NextResponse.json({ error: `Assistant could not answer: ${msg}` }, { status: 502 });
  }
}
