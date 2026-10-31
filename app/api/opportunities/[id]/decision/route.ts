import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const owns = await rest<any[]>("GET", "opportunities", { query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=id&limit=1` });
    if (!owns.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const rows = await rest<any[]>("GET", "bid_decisions", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*&limit=1` });
    return NextResponse.json({ decision: rows[0]?.decision ?? null, saved: Boolean(rows.length) });
  } catch (e) {
    if (isMissingFeatureTable(e)) return NextResponse.json({ decision: null, saved: false, migrationRequired: true });
    return errorResponse(e);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const criteria = ["fit", "capacity", "margin", "relationship"];
  if (!body?.scores || criteria.some((key) => !Number.isInteger(body.scores[key]) || body.scores[key] < 1 || body.scores[key] > 5)) {
    return NextResponse.json({ error: "Score fit, capacity, margin and relationship from 1 to 5." }, { status: 400 });
  }
  const total = criteria.reduce((sum, key) => sum + body.scores[key], 0);
  const recommendation = total >= 15 ? "go" : total >= 10 ? "review" : "no-go";
  const decision = { scores: Object.fromEntries(criteria.map((key) => [key, body.scores[key]])), total, recommendation, rationale: typeof body.rationale === "string" ? body.rationale.slice(0, 2000) : "", updatedAt: new Date().toISOString() };
  try {
    const owns = await rest<any[]>("GET", "opportunities", { query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=id&limit=1` });
    if (!owns.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const rows = await rest<any[]>("POST", "bid_decisions", { body: { user_id: auth.userId, opportunity_id: params.id, decision }, prefer: "resolution=merge-duplicates,return=representation" });
    return NextResponse.json({ decision: rows[0]?.decision ?? decision, saved: true });
  } catch (e) {
    if (isMissingFeatureTable(e)) return NextResponse.json({ error: "Apply the Phase 1 database migration to save this recommendation.", migrationRequired: true }, { status: 503 });
    return errorResponse(e, "Recommendation was not saved: ");
  }
}

function isMissingFeatureTable(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as any).code === "PGRST205");
}
