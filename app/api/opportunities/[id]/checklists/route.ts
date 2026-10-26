// GET   /api/opportunities/[id]/checklists: checklists for one opportunity. Seeds the standard template on first load.
// PATCH /api/opportunities/[id]/checklists { id, items } : save ticked items. items: [{text, done}]
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";

type Ctx = { params: { id: string } };

const STANDARD_CHECKLIST = {
  title: "Standard bid checklist",
  items: [
    "Compliance certificate attached",
    "Company documents attached (registration, tax, insurance)",
    "Signed forms completed",
    "Pricing sheet completed and checked",
  ],
};

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    let rows = await rest<any[]>("GET", "vf_checklists", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*&order=created_at.asc`,
    });
    if (rows.length === 0) {
      // Seed the standard checklist once per opportunity.
      const seeded = await rest<any[]>("POST", "vf_checklists", {
        body: {
          user_id: auth.userId,
          opportunity_id: params.id,
          title: STANDARD_CHECKLIST.title,
          items: STANDARD_CHECKLIST.items.map((text) => ({ text, done: false })),
        },
        prefer: "return=representation",
      });
      rows = seeded;
    }
    return NextResponse.json({ checklists: rows });
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
  if (!UUID_RE.test(String(body?.id ?? ""))) return NextResponse.json({ error: "Checklist not found." }, { status: 404 });
  if (!Array.isArray(body.items)) return NextResponse.json({ error: "items must be a list." }, { status: 400 });
  const items = body.items
    .filter((x: any) => x && typeof x.text === "string")
    .slice(0, 100)
    .map((x: any) => ({ text: String(x.text).slice(0, 300), done: x.done === true }));
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const rows = await rest<any[]>("PATCH", "vf_checklists", {
      query: `?id=eq.${body.id}&opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}`,
      body: { items, updated_at: new Date().toISOString() },
      prefer: "return=representation",
    });
    if (!rows.length) return NextResponse.json({ error: "Checklist not found." }, { status: 404 });
    return NextResponse.json({ checklist: rows[0] });
  } catch (e) {
    return errorResponse(e, "Checklist was NOT saved: ");
  }
}
