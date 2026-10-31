import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { callGemini } from "@/lib/gemini";
import { rest, UUID_RE } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const rows = await rest<any[]>("GET", "opportunities", { query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=id,title,buyer_organization,estimated_value,deadline_date,gonogo&limit=1` });
    if (!rows.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const row = rows[0];
    const paragraph = await callGemini([
      "Write one concise paragraph recommending go, no-go, or further review for this bid opportunity.",
      "Use only the provided opportunity details and four 1-to-5 assessment scores. Do not invent missing facts.",
      "State the recommendation, explain the score pattern, and identify a key uncertainty if one is present.",
      `Opportunity: ${JSON.stringify({ title: row.title, buyer: row.buyer_organization, value: row.estimated_value, deadline: row.deadline_date })}`,
      `Assessment: ${JSON.stringify(row.gonogo ?? {})}`,
      "Return the paragraph only, with no heading or list. This is decision support, not an automatic decision.",
    ].join("\n"));
    return NextResponse.json({ recommendation: paragraph.trim() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not generate a recommendation." }, { status: 502 });
  }
}
