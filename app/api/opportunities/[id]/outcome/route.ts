// PUT /api/opportunities/[id]/outcome { result: "Won" | "Lost", reason, notes }
// Records the win/loss outcome, and moves the stage to Outcome.
// Records the win/loss outcome on the opportunity row itself (legacy table, new columns from the FEATURES MIGRATION).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";
import { OUTCOME_REASONS } from "@/lib/intelligence";
import { toOpportunity } from "@/lib/mappers";

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
  if (body?.result !== "Won" && body?.result !== "Lost") {
    return NextResponse.json({ error: "Result must be Won or Lost." }, { status: 400 });
  }
  const reason = body?.reason ? String(body.reason) : null;
  if (reason && !(OUTCOME_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json({ error: "Pick a reason from the list." }, { status: 400 });
  }
  const notes = typeof body?.notes === "string" ? body.notes.slice(0, 2000) : null;

  try {
    const rows = await rest<any[]>("PATCH", "opportunities", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}`,
      body: {
        outcome_result: body.result,
        outcome_reason: reason,
        outcome_notes: notes,
        outcome_at: new Date().toISOString(),
        status: "Outcome",
        updated_at: new Date().toISOString(),
      },
      prefer: "return=representation",
    });
    if (!rows.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    return NextResponse.json({ opportunity: toOpportunity(rows[0]) });
  } catch (e) {
    return errorResponse(e);
  }
}
