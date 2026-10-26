// PATCH /api/companies/[id]: edit one company. DELETE: remove it. Owner only.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";

const KINDS = ["Company", "Contractor", "Subcontractor", "Partner"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body?.name === "string") patch.name = body.name.trim().slice(0, 200);
  if (KINDS.includes(body?.kind)) patch.kind = body.kind;
  if (typeof body?.contact === "string") patch.contact = body.contact.trim().slice(0, 300) || null;
  if (typeof body?.notes === "string") patch.notes = body.notes.trim().slice(0, 2000) || null;
  if (patch.name === "") return NextResponse.json({ error: "A name is required." }, { status: 400 });
  try {
    const rows = await rest<any[]>("PATCH", "vf_companies", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}`,
      body: patch,
      prefer: "return=representation",
    });
    if (!rows.length) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ company: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    await rest("DELETE", "vf_companies", { query: `?id=eq.${params.id}&user_id=eq.${auth.userId}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
