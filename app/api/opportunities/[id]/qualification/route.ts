// GET /api/opportunities/[id]/qualification: the saved qualification, or null.
// PUT /api/opportunities/[id]/qualification: save the 7 scores + notes, verdict computed on the server.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { QUAL_KEYS, computeVerdict } from "@/lib/qualification";

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
  const scores: Record<string, number> = {};
  for (const k of QUAL_KEYS) {
    const v = Number(body?.[k]);
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return NextResponse.json({ error: `Score for ${k.replace(/_/g, " ")} must be a whole number from 1 to 5.` }, { status: 400 });
    }
    scores[k] = v;
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
