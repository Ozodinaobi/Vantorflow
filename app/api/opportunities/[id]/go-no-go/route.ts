// GET /api/opportunities/[id]/go-no-go: the saved matrix, or null.
// PUT /api/opportunities/[id]/go-no-go { criteria: [{key, score 1..5, weight 1..5}] }: score it.
//   weighted total = sum(score * weight) / (5 * sum(weight)) => percent. >= 60% suggests GO, else NO-GO.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { audit } from "@/lib/audit";

type Ctx = { params: { id: string } };

import { GO_FACTORS, scoreGo, type GoKey } from "@/lib/knowledge";

const GO_CRITERIA = GO_FACTORS.map((f) => ({ key: f.key, label: f.label, weight: f.weight, hint: f.hint }));

function scoreMatrix(criteria: { key: string; score: number }[]) {
  const scores = Object.fromEntries(criteria.map((c) => [c.key, c.score])) as Record<GoKey, number>;
  const r = scoreGo(scores);
  return { percent: r.percent, suggestion: r.band, recommendation: r.recommendation, weakest: r.weakest };
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
      goNoGo: { percent: Number(q.go_no_go_score), suggestion: scoreGo(Object.fromEntries((q.criterion_scores ?? []).map((c: any) => [c.key, c.score])) as Record<GoKey, number>).band, criteria: q.criterion_scores ?? [], updated_at: q.updated_at },
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
    if (!Number.isInteger(score) || score < 1 || score > 5) return NextResponse.json({ error: `Score for ${def.label} must be 1 to 5.` }, { status: 400 });
    criteria.push({ key: def.key, score, weight: def.weight });
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
