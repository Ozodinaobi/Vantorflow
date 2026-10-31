// POST /api/generate
// Drafts each response section from the requirements mapped to it, using Gemini.
// Returns drafts only; the browser saves them to response_sections.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { callGemini } from "@/lib/gemini";
import { SECTIONS } from "@/lib/types";

interface GroupIn {
  section: string;
  requirements: { number: number; text: string; category: string }[];
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { title?: unknown; buyer?: unknown; sections?: unknown };
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

  try {
    const drafts: { section: string; draft: string }[] = [];
    // Run sections one after another to stay gentle on the Gemini rate limit.
    for (const group of groups) {
      if (!Array.isArray(group.requirements) || group.requirements.length === 0) {
        // Nothing mapped to this section, so there is nothing to draft.
        drafts.push({ section: group.section, draft: "" });
        continue;
      }
      const draft = await callGemini(buildSectionPrompt(title, buyer, group));
      drafts.push({ section: group.section, draft });
    }
    return NextResponse.json({ drafts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Draft generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// One prompt per section. The model must reference each requirement by number so it can be traced.
function buildSectionPrompt(title: string, buyer: string, group: GroupIn): string {
  const reqLines = group.requirements.map((r) => `${r.number}. (${r.category}) ${r.text}`).join("\n");
  return [
    `You are writing the "${group.section}" section of a formal bid response.`,
    `Opportunity: ${title}`,
    `Buyer: ${buyer}`,
    "",
    "Address every requirement listed below. Refer to each one by its number (for example: Requirement 3) so an evaluator can trace it.",
    "Write in clear, professional English.",
    "Plain text only: no markdown, no bullet symbols, no headings. Separate paragraphs with one blank line.",
    "Return only the body text of this section, without repeating the section title.",
    "Do not invent certifications, prices, past client names or figures. If a specific fact is missing, use clean neutral wording that identifies who will confirm it, such as 'the appointed Contract Manager will confirm this detail'. Never output bracketed placeholders or placeholder markers, including [TO CONFIRM].",
    "",
    "Requirements:",
    reqLines,
  ].join("\n");
}
