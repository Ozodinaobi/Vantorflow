// GET /api/opportunities/[id]/go-no-go: the saved matrix, or null.
// PUT /api/opportunities/[id]/go-no-go { criteria: [{key, score 1..5, weight 1..5}] }: score it.
//   weighted total = sum(score * weight) / (5 * sum(weight)) => percent. >= 60% suggests GO, else NO-GO.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { audit } from "@/lib/audit";

type Ctx = { params: { id: string } };

const GO_CRITERIA = [
  { key: "fit", label: "Strategic fit" },
  { key: "capability", label: "Capability match" },
  { key: "margin", label: "Margin potential" },
  { key: "competition", label: "Competitive position" },
  { key: "risk", label: "Risk level (5 = low risk)" },
] as const;

function scoreMatrix(criteria: { key: string; score: number; weight: number }[]) {
  const totalWeight = criteria.reduce((a, c) => a + c.weight, 0);
  const weighted = criteria.reduce((a, c) => a + c.score * c.weight, 0);
  const percent = totalWeight === 0 ? 0 : Math.round((weighted / (5 * totalWeight)) * 1000) / 10;
  return { percent, suggestion: percent >= 60 ? "GO" : "NO-GO" as "GO" | "NO-GO" };
}

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const rows = await rest<any[]>("GET", "vf_qualifications", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=go_no_go_score,criterion_scores,updated_at&limit=1`,
    });
    const q = rows[0];
    if (!q || q.go_no_go_score === null || q.go_no_go_score === undefined) return NextResponse.json({ goNoGo: null, criteria: GO_CRITERIA });
    return NextResponse.json({
      goNoGo: { percent: Number(q.go_no_go_score), suggestion: Number(q.go_no_go_score) >= 60 ? "GO" : "NO-GO", criteria: q.criterion_scores ?? [], updated_at: q.updated_at },
      criteria: GO_CRITERIA,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const criteria: { key: string; score: number; weight: number }[] = [];
  for (const def of GO_CRITERIA) {
    const found = Array.isArray(body?.criteria) ? body.criteria.find((c: any) => c?.key === def.key) : null;
    const score = Number(found?.score);
    const weight = Number(found?.weight);
    if (!Number.isInteger(score) || score < 1 || score > 5) return NextResponse.json({ error: `Score for ${def.label} must be 1 to 5.` }, { status: 400 });
    if (!Number.isInteger(weight) || weight < 1 || weight > 5) return NextResponse.json({ error: `Weight for ${def.label} must be 1 to 5.` }, { status: 400 });
    criteria.push({ key: def.key, score, weight });
  }
  const result = scoreMatrix(criteria);
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const now = new Date().toISOString();
    const existing = await rest<any[]>("GET", "vf_qualifications", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=id&limit=1`,
    });
    const row = { go_no_go_score: result.percent, criterion_scores: criteria, updated_at: now };
    if (existing.length) {
      await rest("PATCH", "vf_qualifications", { query: `?id=eq.${existing[0].id}&user_id=eq.${auth.userId}`, body: row, prefer: "return=minimal" });
    } else {
      // Row created with neutral 3s so it satisfies the existing qualification row shape. Verdict stays review until scored.
      await rest("POST", "vf_qualifications", {
        body: { ...row, user_id: auth.userId, opportunity_id: params.id, capability_fit: 3, past_performance: 3, resources: 3, compliance_risk: 3, relationship: 3, pricing_position: 3, known_risks: 3, notes: "", verdict: "Review" },
        prefer: "return=minimal",
      });
    }
    await audit(auth.userId, params.id, "go_no_go", { percent: result.percent, suggestion: result.suggestion });
    return NextResponse.json({ goNoGo: { ...result, criteria, updated_at: now }, criteria: GO_CRITERIA });
  } catch (e) {
    return errorResponse(e, "Go/no-go was NOT saved: ");
  }
}
