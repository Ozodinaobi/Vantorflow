// GET /api/opportunities: the signed-in user's opportunities, with readiness already computed.
// POST /api/opportunities: create an opportunity and its RFQ text together (rolled back if the RFQ save fails).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";
import { computeReadiness } from "@/lib/readiness";
import { toOpportunity, toDraft, toRequirements } from "@/lib/mappers";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const rows = await rest<any[]>("GET", "opportunities", {
      query: `?user_id=eq.${auth.userId}&select=*&order=created_at.desc`,
    });
    const opps = rows.map(toOpportunity);
    const ids = opps.map((o) => o.id);
    let reqs: any[] = [];
    let drafts: any[] = [];
    if (ids.length) {
      const inList = `in.(${ids.join(",")})`;
      reqs = toRequirements(
        await rest<any[]>("GET", "requirements", {
          query: `?user_id=eq.${auth.userId}&opportunity_id=${inList}&select=*`,
        })
      );
      drafts = (await rest<any[]>("GET", "response_sections", {
        query: `?user_id=eq.${auth.userId}&opportunity_id=${inList}&select=*`,
      })).map(toDraft);
    }
    const out = opps.map((o) => ({
      ...o,
      readiness: computeReadiness({
        requirements: reqs.filter((r) => r.opportunity_id === o.id),
        drafts: drafts.filter((d) => d.opportunity_id === o.id),
      }),
    }));
    return NextResponse.json({ opportunities: out });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const buyer = typeof body.buyer === "string" ? body.buyer.trim() : "";
  const rfqText = typeof body.rfqText === "string" ? body.rfqText.trim() : "";
  const deadline = typeof body.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.deadline) ? body.deadline : null;
  const value = body.value === null || body.value === undefined || body.value === "" ? null : Number(body.value);
  if (!title || !buyer) return NextResponse.json({ error: "Title and buyer organisation are required." }, { status: 400 });
  if (rfqText.length < 20) return NextResponse.json({ error: "Paste the RFQ text (at least a few sentences)." }, { status: 400 });
  if (value !== null && (Number.isNaN(value) || value < 0)) {
    return NextResponse.json({ error: "Estimated value must be a positive number." }, { status: 400 });
  }

  try {
    // Live schema: opportunities.rfq_id points at rfqs.id, so the RFQ is created first.
    const [rfqRow] = await rest<any[]>("POST", "rfqs", {
      body: {
        user_id: auth.userId,
        title,
        buyer_organization: buyer,
        deadline_date: deadline,
        status: "Intake",
        rfq_text: rfqText,
      },
      prefer: "return=representation",
    });
    let oppRow: any;
    try {
      [oppRow] = await rest<any[]>("POST", "opportunities", {
        body: {
          user_id: auth.userId,
          rfq_id: rfqRow.id,
          title,
          buyer_organization: buyer,
          deadline_date: deadline,
          estimated_value: value === null ? null : String(value),
          status: "Intake",
        },
        prefer: "return=representation",
      });
    } catch (e) {
      // Roll back so there is no RFQ without its opportunity.
      await rest("DELETE", "rfqs", { query: `?id=eq.${rfqRow.id}&user_id=eq.${auth.userId}` }).catch(() => {});
      throw e;
    }
    const opp = toOpportunity(oppRow);
    return NextResponse.json({ opportunity: opp }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Could not create the opportunity: ");
  }
}
