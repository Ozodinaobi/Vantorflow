// PUT /api/opportunities/[id]/drafts: save drafts, one row per section (regenerate updates, never copies).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { SECTIONS } from "@/lib/types";
import { toDraft } from "@/lib/mappers";

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
  if (!Array.isArray(body.drafts)) return NextResponse.json({ error: "drafts must be a list." }, { status: 400 });
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) {
      return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    }
    const now = new Date().toISOString();
    const [opp] = await rest<any[]>("GET", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=rfq_id&limit=1`,
    });
    // Live schema: response_sections.content holds the draft text; rfq_id links to the RFQ.
    const rows = body.drafts
      .filter((d: any) => SECTIONS.includes(d.section))
      .map((d: any) => ({
        user_id: auth.userId,
        opportunity_id: params.id,
        rfq_id: opp?.rfq_id ?? null,
        section: d.section,
        title: d.section,
        sort_order: SECTIONS.indexOf(d.section) + 1,
        content: String(d.draft ?? ""),
        updated_at: now,
      }));
    // The live table has no unique (opportunity_id, section) constraint, so the upsert is done as
    // update-if-present, insert-if-missing, one row per section.
    const existing = await rest<any[]>("GET", "response_sections", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=id,section`,
    });
    const saved: any[] = [];
    for (const row of rows) {
      const hit = existing.find((e) => e.section === row.section);
      if (hit) {
        const [updated] = await rest<any[]>("PATCH", "response_sections", {
          query: `?id=eq.${hit.id}&user_id=eq.${auth.userId}`,
          body: { content: row.content, rfq_id: row.rfq_id, updated_at: now },
          prefer: "return=representation",
        });
        saved.push(updated);
      } else {
        const [created] = await rest<any[]>("POST", "response_sections", {
          body: row,
          prefer: "return=representation",
        });
        saved.push(created);
      }
    }
    return NextResponse.json({ drafts: saved.map(toDraft) });
  } catch (e) {
    return errorResponse(e, "Drafts were NOT saved: ");
  }
}
