// POST /api/generate
// Drafts each response section from the requirements mapped to it, using Gemini.
// Returns drafts only; the browser saves them to response_sections.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { callGemini } from "@/lib/gemini";
import { SECTIONS } from "@/lib/types";
import { rest, UUID_RE } from "@/lib/db";
import { matchLibrary } from "@/lib/library";
import { decodeNotes, hasProfile, profileLines, CompanyProfile } from "@/lib/companyProfile";
import { isPresetId, PRESETS, PresetId } from "@/lib/documentPresets";

interface GroupIn {
  section: string;
  requirements: { number: number; text: string; category: string }[];
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { title?: unknown; buyer?: unknown; sections?: unknown; companyId?: unknown; templateId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title : "Untitled opportunity";
  const buyer = typeof body.buyer === "string" ? body.buyer : "the buyer";
  if (!Array.isArray(body.sections)) {
    return NextResponse.json({ error: "sections must be a list." }, { status: 400 });
  }

  // Only accept the five known section names.
  const groups = (body.sections as GroupIn[]).filter((g) => (SECTIONS as readonly string[]).includes(g.section));

  // The contractor/company the response is written for (optional). Looked up in the user's own vf_companies rows.
  // Best effort: if the companies table is missing or the id is not theirs, drafting runs without it.
  let contractor: Contractor | null = null;
  if (typeof body.companyId === "string" && UUID_RE.test(body.companyId)) {
    try {
      const rows = await rest<any[]>("GET", "vf_companies", {
        query: `?id=eq.${body.companyId}&user_id=eq.${auth.userId}&select=name,kind,contact,notes&limit=1`,
      });
      if (rows[0]) {
        const d = decodeNotes(rows[0].notes);
        contractor = {
          name: rows[0].name,
          kind: rows[0].kind,
          contact: rows[0].contact ?? null,
          notes: d.text || null,
          profile: hasProfile(d.profile) ? d.profile : null,
        };
      }
    } catch {
      contractor = null;
    }
  }

  // The document template preset (standard, quality, price). It sets the tone of the drafts.
  const preset: PresetId | null = isPresetId(body.templateId) ? body.templateId : null;

  // Approved answers from the library that overlap these requirements. Best effort: if the
  // library table is not set up yet, drafting still runs with no library context.
  let library: { question: string; answer: string }[] = [];
  try {
    const rows = await rest<any[]>("GET", "vf_answer_library", {
      query: `?user_id=eq.${auth.userId}&select=question,answer&limit=500`,
    });
    const allReqText = groups.flatMap((g) => g.requirements.map((r) => r.text));
    library = matchLibrary(rows, allReqText);
  } catch {
    library = [];
  }

  try {
    const drafts: { section: string; draft: string }[] = [];
    // Run sections one after another to stay gentle on the Gemini rate limit.
    for (const group of groups) {
      if (!Array.isArray(group.requirements) || group.requirements.length === 0) {
        // Nothing mapped to this section, so there is nothing to draft.
        drafts.push({ section: group.section, draft: "" });
        continue;
      }
      const draft = await callGemini(buildSectionPrompt(title, buyer, group, library, contractor, preset));
      drafts.push({ section: group.section, draft });
    }
    return NextResponse.json({ drafts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Draft generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

interface Contractor {
  name: string;
  kind: string;
  contact: string | null;
  notes: string | null;
  profile: CompanyProfile | null;
}

// One prompt per section. The model must reference each requirement by number so it can be traced.
function buildSectionPrompt(
  title: string,
  buyer: string,
  group: GroupIn,
  library: { question: string; answer: string }[] = [],
  contractor: Contractor | null = null,
  preset: PresetId | null = null
): string {
  // The contractor the bid is submitted under (trusted context from the user's registry).
  const contractorLines = contractor
    ? [
        "",
        `Submitting organisation: ${contractor.name} (${contractor.kind})`,
        ...(contractor.contact ? [`Contact: ${contractor.contact}`] : []),
        ...(contractor.notes ? [`Notes about this organisation: ${contractor.notes}`] : []),
        ...(contractor.profile ? ["", "Company details (use these facts; do not invent others):", ...profileLines(contractor.profile).map((l) => `- ${l}`)] : []),
        "Write the response in the voice of this organisation, in the first person plural (we). Only cite certifications, insurance and case studies listed above.",
      ]
    : [];
  const toneLines = preset ? ["", `Document style: ${PRESETS[preset].name}. ${PRESETS[preset].tone}`] : [];
  const reqLines = group.requirements.map((r) => `${r.number}. (${r.category}) ${r.text}`).join("\n");
  // Approved answers from the answer library, passed as trusted context. Only the relevant ones are included.
  const libLines = library.length
    ? [
        "",
        "Approved answers from our library (use these where relevant, and do not contradict them):",
        ...library.map((a, i) => `${i + 1}. Q: ${a.question}\n   A: ${a.answer}`),
      ]
    : [];
  return [
    `You are writing the "${group.section}" section of a formal bid response.`,
    `Opportunity: ${title}`,
    `Buyer: ${buyer}`,
    ...contractorLines,
    ...toneLines,
    "",
    "Address every requirement listed below. Refer to each one by its number (for example: Requirement 3) so an evaluator can trace it.",
    "Write in clear, professional English.",
    "Plain text only: no markdown, no bullet symbols, no headings. Separate paragraphs with one blank line.",
    "Return only the body text of this section, without repeating the section title.",
    "Do not invent certifications, prices, past client names or figures. Where a specific fact is needed but not given, leave it out or phrase the claim in general terms. Never write placeholders, notes to the team, or meta commentary. The text must read as final client-facing copy.",
    "",
    "Requirements:",
    reqLines,
    ...libLines,
  ].join("\n");
}
