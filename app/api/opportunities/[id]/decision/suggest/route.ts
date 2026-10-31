import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { callGemini } from "@/lib/gemini";
import { rest, UUID_RE } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const [opportunities, decisionRows] = await Promise.all([
      rest<any[]>("GET", "opportunities", { query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=id,title,buyer_organization,estimated_value,deadline_date&limit=1` }),
      rest<any[]>("GET", "bid_decisions", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=decision&limit=1` }).catch(() => []),
    ]);
    if (!opportunities.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const prompt = `You are helping a bid team prepare a cautious, evidence-based go/no-go suggestion. Use only the supplied opportunity facts and checklist scores. Do not invent facts. Return JSON only with keys suggestion ("go", "review", or "no-go"), rationale (one short paragraph), watchouts (array of strings). This is decision support, not an automatic decision.\nOpportunity: ${JSON.stringify(opportunities[0])}\nScores: ${JSON.stringify(body.scores ?? decisionRows[0]?.decision?.scores ?? {})}`;
    const text = await callGemini(prompt, true);
    const result = JSON.parse(text);
    if (!["go", "review", "no-go"].includes(result.suggestion) || typeof result.rationale !== "string" || !Array.isArray(result.watchouts)) throw new Error("The suggestion could not be validated. Try again.");
    return NextResponse.json({ suggestion: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not generate a suggestion." }, { status: 502 });
  }
}
