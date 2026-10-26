// PATCH  /api/templates/[id]: update name, kind or content.
// DELETE /api/templates/[id]: remove a template.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";

const KINDS = ["letterhead", "proposal"];

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
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body?.name === "string") patch.name = body.name.trim().slice(0, 120);
  if (KINDS.includes(body?.kind)) patch.kind = body.kind;
  if (typeof body?.content === "string") patch.content = body.content.slice(0, 20000);
  try {
    const rows = await rest<any[]>("PATCH", "vf_templates", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}`,
      body: patch,
      prefer: "return=representation",
    });
    if (!rows.length) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json({ template: rows[0] });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    await rest("DELETE", "vf_templates", { query: `?id=eq.${params.id}&user_id=eq.${auth.userId}` });
    return NextResponse.json({ removed: true });
  } catch (e) {
    return errorResponse(e);
  }
}
