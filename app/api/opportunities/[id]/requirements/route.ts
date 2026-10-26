// PUT /api/opportunities/[id]/requirements: replace the requirement list (delete old, insert new).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { CATEGORIES } from "@/lib/types";
import { toRequirements } from "@/lib/mappers";

type Ctx = { params: { id: string } };

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
  if (!Array.isArray(body.requirements) || body.requirements.length === 0) {
    return NextResponse.json({ error: "No requirements to save." }, { status: 400 });
  }
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) {
      return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    }
    // Live schema: requirements.rfq_id is required, so it is taken from the opportunity's RFQ.
    const [opp] = await rest<any[]>("GET", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=rfq_id&limit=1`,
    });
    const base = Date.now();
    // created_at increases by 1 ms per row so the requirement number (position) is stable.
    const rows = body.requirements
      .map((r: any, i: number) => ({
        user_id: auth.userId,
        opportunity_id: params.id,
        rfq_id: opp?.rfq_id ?? null,
        description: String(r.text ?? "").trim(),
        category: CATEGORIES.includes(r.category) ? r.category : "Other",
        mandatory: true,
        section: null,
        created_at: new Date(base + i).toISOString(),
      }))
      .filter((r: any) => r.description.length > 0);
    if (rows.length === 0) return NextResponse.json({ error: "No requirement text to save." }, { status: 400 });

    await rest("DELETE", "requirements", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}` });
    const inserted = await rest<any[]>("POST", "requirements", { body: rows, prefer: "return=representation" });
    return NextResponse.json({ requirements: toRequirements(inserted) });
  } catch (e) {
    return errorResponse(e, "Requirements were NOT saved: ");
  }
}
