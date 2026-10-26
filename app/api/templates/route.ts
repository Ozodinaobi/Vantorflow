// GET  /api/templates: your templates.
// POST /api/templates { name, kind, content }: create a letterhead or proposal template.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";

const KINDS = ["letterhead", "proposal"];

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const rows = await rest<any[]>("GET", "vf_templates", {
      query: `?user_id=eq.${auth.userId}&select=*&order=updated_at.desc`,
    });
    return NextResponse.json({ templates: rows });
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
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  const kind = KINDS.includes(body?.kind) ? body.kind : "proposal";
  const content = typeof body?.content === "string" ? body.content.slice(0, 20000) : "";
  if (!name) return NextResponse.json({ error: "Give the template a name." }, { status: 400 });
  try {
    const [row] = await rest<any[]>("POST", "vf_templates", {
      body: { user_id: auth.userId, name, kind, content, updated_at: new Date().toISOString() },
      prefer: "return=representation",
    });
    return NextResponse.json({ template: row }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
