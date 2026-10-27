// GET /api/opportunities/[id]/qualification: the saved qualification, or null.
// PUT /api/opportunities/[id]/qualification: save the 7 scores + notes, verdict computed on the server.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { QUAL_FIELDS, computeVerdict } from "@/lib/qualification";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const rows = await rest<any[]>("GET", "vf_qualifications", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*&limit=1`,
    });
    return NextResponse.json({ qualification: rows[0] ?? null });
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
  // Accept scores either nested ({ scores: {...} }) or flat (top-level keys).
  const source: Record<string, unknown> = body?.scores && typeof body.scores === "object" ? body.scores : body ?? {};
  const scores: Record<string, number> = {};
  for (const f of QUAL_FIELDS) {
    const raw = source[f.key];
    // A blank or missing factor is treated as neutral (3) so the save never fails on an unscored field.
    if (raw === undefined || raw === null || raw === "") {
      scores[f.key] = 3;
      continue;
    }
    const v = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return NextResponse.json(
        { error: `${f.label}: pick a whole-number score from 1 to 5 (got ${String(raw)}).`, field: f.key },
        { status: 400 },
      );
    }
    scores[f.key] = v;
  }
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 4000) : "";
  const verdict = computeVerdict(scores as any).verdict;

  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) {
      return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    }
    const now = new Date().toISOString();
    const existing = await rest<any[]>("GET", "vf_qualifications", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=id&limit=1`,
    });
    const row = { ...scores, notes, verdict, updated_at: now };
    let saved: any;
    if (existing.length) {
      [saved] = await rest<any[]>("PATCH", "vf_qualifications", {
        query: `?id=eq.${existing[0].id}&user_id=eq.${auth.userId}`,
        body: row,
        prefer: "return=representation",
      });
    } else {
      [saved] = await rest<any[]>("POST", "vf_qualifications", {
        body: { ...row, user_id: auth.userId, opportunity_id: params.id },
        prefer: "return=representation",
      });
    }
    return NextResponse.json({ qualification: saved, result: computeVerdict(scores as any) });
  } catch (e) {
    return errorResponse(e, "Qualification was NOT saved: ");
  }
}
