// GET /api/opportunities/[id]: one opportunity with its RFQ, requirements and drafts.
// PATCH /api/opportunities/[id]: change the pipeline stage.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";
import { STAGES } from "@/lib/types";
import { toDraft, toOpportunity, toRequirements, toRfq } from "@/lib/mappers";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const opps = await rest<any[]>("GET", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=*`,
    });
    if (!opps.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const opp = toOpportunity(opps[0]);
    const [rfqRows, requirementRows, draftRows] = await Promise.all([
      opp.rfq_id
        ? rest<any[]>("GET", "rfqs", { query: `?id=eq.${opp.rfq_id}&user_id=eq.${auth.userId}&select=*&limit=1` })
        : Promise.resolve([] as any[]),
      rest<any[]>("GET", "requirements", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*` }),
      rest<any[]>("GET", "response_sections", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*` }),
    ]);
    return NextResponse.json({
      opportunity: opp,
      rfq: rfqRows[0] ? toRfq(rfqRows[0]) : null,
      requirements: toRequirements(requirementRows),
      drafts: draftRows.map(toDraft),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  if (!STAGES.includes(body.status)) return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
  try {
    const rows = await rest<any[]>("PATCH", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}`,
      body: { status: body.status },
      prefer: "return=representation",
    });
    if (!rows.length) return NextResponse.json({ error: "Stage was NOT saved: opportunity not found." }, { status: 404 });
    return NextResponse.json({ opportunity: toOpportunity(rows[0]) });
  } catch (e) {
    return errorResponse(e, "Stage was NOT saved: ");
  }
}

// DELETE /api/opportunities/[id]: remove this user's opportunity and every linked row.
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const rows = await rest<any[]>("GET", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=id,rfq_id&limit=1`,
    });
    if (!rows.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    await rest("DELETE", "requirements", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}` });
    await rest("DELETE", "response_sections", { query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}` });
    if (rows[0].rfq_id) {
      await rest("DELETE", "rfqs", { query: `?id=eq.${rows[0].rfq_id}&user_id=eq.${auth.userId}` });
    }
    const removed = await rest<any[]>("DELETE", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=id`,
      prefer: "return=representation",
    });
    if (!removed.length) return NextResponse.json({ error: "Opportunity was not deleted." }, { status: 409 });
    return NextResponse.json({ deleted: true, id: params.id });
  } catch (e) {
    return errorResponse(e, "Could not delete the opportunity: ");
  }
}
