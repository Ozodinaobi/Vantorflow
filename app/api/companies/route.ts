// GET  /api/companies: the signed-in user's companies and contractors registry.
// POST /api/companies { name, kind, contact, notes }: add one.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";

const KINDS = ["Company", "Contractor", "Subcontractor", "Partner"];

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const rows = await rest<any[]>("GET", "vf_companies", {
      query: `?user_id=eq.${auth.userId}&select=*&order=name.asc`,
    });
    return NextResponse.json({ companies: rows });
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
  const name = String(body?.name ?? "").trim().slice(0, 200);
  if (!name) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  const kind = KINDS.includes(body?.kind) ? body.kind : "Company";
  try {
    const rows = await rest<any[]>("POST", "vf_companies", {
      body: {
        user_id: auth.userId,
        name,
        kind,
        contact: String(body?.contact ?? "").trim().slice(0, 300) || null,
        notes: String(body?.notes ?? "").trim().slice(0, 2000) || null,
      },
      prefer: "return=representation",
    });
    return NextResponse.json({ company: rows[0] ?? null }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
