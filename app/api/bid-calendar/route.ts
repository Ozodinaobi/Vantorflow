import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    let opportunities: any[] = [];
    let migrationRequired = false;
    try {
      opportunities = await rest<any[]>("GET", "opportunities", { query: `?user_id=eq.${auth.userId}&select=id,title,buyer_organization,deadline,deadline_date,status` });
    } catch (error) {
      if (!isMissingColumn(error)) throw error;
      migrationRequired = true;
      try {
        opportunities = await rest<any[]>("GET", "opportunities", { query: `?user_id=eq.${auth.userId}&select=id,title,buyer_organization,deadline_date,status` });
      } catch (fallbackError) {
        if (!isMissingColumn(fallbackError)) throw fallbackError;
        opportunities = await rest<any[]>("GET", "opportunities", { query: `?user_id=eq.${auth.userId}&select=id,title,buyer_organization,status` });
      }
    }
    opportunities.sort((a, b) => String(a.deadline ?? a.deadline_date ?? "9999").localeCompare(String(b.deadline ?? b.deadline_date ?? "9999")));
    let milestones: any[] = [];
    try {
      milestones = await rest<any[]>("GET", "bid_milestones", { query: `?user_id=eq.${auth.userId}&select=id,opportunity_id,title,due_date&order=due_date.asc` });
    } catch (error) {
      if (!isMissingTable(error)) throw error;
      migrationRequired = true;
    }
    return NextResponse.json({
      opportunities: opportunities.map((o) => ({ id: o.id, title: o.title, buyer: o.buyer_organization ?? "", deadline: o.deadline ?? o.deadline_date ?? null, status: o.status })),
      milestones: milestones.map((m) => ({ id: m.id, opportunityId: m.opportunity_id, title: m.title, date: m.due_date })),
      migrationRequired,
    });
  } catch (error) { return errorResponse(error); }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.opportunityId !== "string" || typeof body.title !== "string" || !body.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.date ?? "")) {
    return NextResponse.json({ error: "Add an opportunity, milestone name and date." }, { status: 400 });
  }
  try {
    const owned = await rest<any[]>("GET", "opportunities", { query: `?id=eq.${body.opportunityId}&user_id=eq.${auth.userId}&select=id&limit=1` });
    if (!owned.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const rows = await rest<any[]>("POST", "bid_milestones", { body: { user_id: auth.userId, opportunity_id: body.opportunityId, title: body.title.trim().slice(0, 120), due_date: body.date }, prefer: "return=representation" });
    return NextResponse.json({ milestone: { id: rows[0].id, opportunityId: rows[0].opportunity_id, title: rows[0].title, date: rows[0].due_date } }, { status: 201 });
  } catch (error) {
    if (isMissingTable(error)) return NextResponse.json({ error: "Apply the Phase 1 database migration to save milestones.", migrationRequired: true }, { status: 503 });
    return errorResponse(error, "Milestone was not saved: ");
  }
}

function isMissingColumn(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && ["PGRST204", "PGRST200", "42703"].includes(String((error as any).code)));
}
function isMissingTable(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as any).code === "PGRST205");
}
