// POST /api/opportunities/:id/duplicate. Copies the opportunity and its RFQ text into a new Intake opportunity.
// Requirements, drafts, comments and outcome are NOT copied: the duplicate starts clean.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { rest, errorResponse } from "@/lib/db";
import { toOpportunity } from "@/lib/mappers";
import { audit } from "@/lib/audit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const opps = await rest<any[]>("GET", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=*`,
    });
    if (!opps.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const src = toOpportunity(opps[0]);

    let rfqText = "";
    if (src.rfq_id) {
      const rfqs = await rest<any[]>("GET", "rfqs", {
        query: `?id=eq.${src.rfq_id}&user_id=eq.${auth.userId}&select=rfq_text`,
      });
      rfqText = rfqs[0]?.rfq_text ?? "";
    }

    const title = `${src.title ?? "Untitled"} (copy)`;
    const [rfqRow] = await rest<any[]>("POST", "rfqs", {
      body: {
        user_id: auth.userId,
        title,
        buyer_organization: src.buyer ?? "",
        deadline_date: src.deadline ?? null,
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
          buyer_organization: src.buyer ?? "",
          deadline_date: src.deadline ?? null,
          estimated_value: src.value === null || src.value === undefined || src.value === "" ? null : String(src.value),
          status: "Intake",
        },
        prefer: "return=representation",
      });
    } catch (e) {
      await rest("DELETE", "rfqs", { query: `?id=eq.${rfqRow.id}&user_id=eq.${auth.userId}` }).catch(() => {});
      throw e;
    }
    const copy = toOpportunity(oppRow);
    await audit(auth.userId, copy.id, "duplicate", { from: src.id });
    return NextResponse.json({ opportunity: copy }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Could not duplicate the opportunity: ");
  }
}
