// POST /api/email-in: placeholder ingest for forwarded RFQ emails.
// Auth: header x-vf-ingest-secret must equal EMAIL_IN_SECRET. Writes go to the owner in EMAIL_IN_OWNER_ID
// (the webhook has no session; multi-tenant routing comes with real multi-tenancy).
// Body: { from: string, subject: string, body: string }. Creates an rfq + opportunity, like POST /api/opportunities.
import { NextResponse } from "next/server";
import { errorResponse, isConfigured, rest } from "@/lib/db";
import { toOpportunity } from "@/lib/mappers";
import { parseBuyer } from "@/lib/emailIn";

export async function POST(req: Request) {
  const secret = process.env.EMAIL_IN_SECRET;
  const ownerId = process.env.EMAIL_IN_OWNER_ID;
  if (!secret || !ownerId) {
    return NextResponse.json({ error: "Email ingest is not configured yet." }, { status: 503 });
  }
  if (req.headers.get("x-vf-ingest-secret") !== secret) {
    return NextResponse.json({ error: "Invalid ingest secret." }, { status: 401 });
  }
  if (!isConfigured()) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const from = typeof body?.from === "string" ? body.from.trim().slice(0, 300) : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 300) : "";
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 50000) : "";
  if (!subject) return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  if (text.length < 20) return NextResponse.json({ error: "Email body is too short to be an RFQ." }, { status: 400 });

  const buyer = parseBuyer(from, subject);
  try {
    const [rfqRow] = await rest<any[]>("POST", "rfqs", {
      body: {
        user_id: ownerId,
        title: subject,
        buyer_organization: buyer,
        deadline_date: null,
        status: "Intake",
        rfq_text: text,
      },
      prefer: "return=representation",
    });
    let oppRow: any;
    try {
      [oppRow] = await rest<any[]>("POST", "opportunities", {
        body: {
          user_id: ownerId,
          rfq_id: rfqRow.id,
          title: subject,
          buyer_organization: buyer,
          deadline_date: null,
          status: "Intake",
        },
        prefer: "return=representation",
      });
    } catch (e) {
      await rest("DELETE", "rfqs", { query: `?id=eq.${rfqRow.id}&user_id=eq.${ownerId}` }).catch(() => {});
      throw e;
    }
    return NextResponse.json({ opportunity: toOpportunity(oppRow), buyer }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Could not create the opportunity from email: ");
  }
}
