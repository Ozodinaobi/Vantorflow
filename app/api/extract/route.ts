// POST /api/extract
// Sends RFQ text to Gemini and returns structured requirements as JSON.
// It does NOT save anything: the browser shows the list for review first, then saves it.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { callGemini } from "@/lib/gemini";
import { CATEGORIES, ExtractResult } from "@/lib/types";

export async function POST(req: Request) {
  // Only signed-in users can spend the Gemini key.
  const auth = await requireUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { rfqText?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const rfqText = typeof body.rfqText === "string" ? body.rfqText.trim() : "";
  if (rfqText.length < 20) {
    return NextResponse.json({ error: "RFQ text is too short to extract from." }, { status: 400 });
  }
  if (rfqText.length > 60000) {
    return NextResponse.json({ error: "RFQ text is too long (over 60,000 characters). Split it and try again." }, { status: 400 });
  }

  try {
    const raw = await callGemini(buildExtractPrompt(rfqText), true);
    const result = parseExtractJson(raw);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// The strict prompt: a fixed JSON shape, fixed category names, and clear rules.
function buildExtractPrompt(rfq: string): string {
  return [
    "You extract structured data from a tender or request for quotation (RFQ).",
    "Return ONLY a JSON object. No markdown, no commentary.",
    "The JSON must match exactly this shape:",
    '{"buyer": string or null, "deadline": string or null, "scope": string or null, "requirements": [{"number": integer, "text": string, "category": "Technical" | "Commercial" | "Compliance" | "Delivery" | "Other"}]}',
    "Rules:",
    "- One entry per distinct requirement. Each mandatory or stated requirement must be its own entry.",
    "- Keep the wording as close to the source as possible. Do not invent or merge requirements.",
    "- number starts at 1 and increases by 1.",
    "- category must be exactly one of the five values above.",
    "- scope is a 1 to 3 sentence summary of what is being bought.",
    "- Use null when a field is not stated in the text.",
    "",
    "RFQ TEXT:",
    '"""',
    rfq,
    '"""',
  ].join("\n");
}

// Parse and clean Gemini's answer. Anything unexpected becomes a clear error, never a silent blank.
function parseExtractJson(raw: string): ExtractResult {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini did not return valid JSON. Please try again.");
  }

  const obj = (data ?? {}) as Record<string, unknown>;
  if (!Array.isArray(obj.requirements)) {
    throw new Error("Gemini's answer had no requirements list. Please try again.");
  }

  const requirements = obj.requirements
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>;
      const text = typeof r.text === "string" ? r.text.trim() : "";
      const category =
        typeof r.category === "string" && CATEGORIES.includes(r.category) ? r.category : "Other";
      return { text, category };
    })
    .filter((r) => r.text.length > 0)
    // Renumber 1..n so the numbers are always clean and sequential.
    .map((r, i) => ({ number: i + 1, text: r.text, category: r.category }));

  if (requirements.length === 0) {
    throw new Error("No requirements were found in this text.");
  }

  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    buyer: str(obj.buyer),
    deadline: str(obj.deadline),
    scope: str(obj.scope),
    requirements,
  };
}
