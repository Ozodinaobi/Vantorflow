// GET  /api/opportunities/[id]/comments: comments on one opportunity, oldest first.
// POST /api/opportunities/[id]/comments { body }: add a comment (max 2000 chars). @mentions are highlighted by the UI.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { audit } from "@/lib/audit";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const rows = await rest<any[]>("GET", "vf_comments", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*&order=created_at.asc&limit=500`,
    });
    return NextResponse.json({ comments: rows });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ error: "Write a comment first." }, { status: 400 });
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const [row] = await rest<any[]>("POST", "vf_comments", {
      body: { user_id: auth.userId, opportunity_id: params.id, body: text },
      prefer: "return=representation",
    });
    await audit(auth.userId, params.id, "comment", { preview: text.slice(0, 80) });
    return NextResponse.json({ comment: row }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Comment was NOT saved: ");
  }
}
