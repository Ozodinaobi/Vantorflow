// GET  /api/opportunities/[id]/audit: the history for one opportunity, newest first.
// POST /api/opportunities/[id]/audit { action, detail }: record a client-side event (extraction, generation).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { audit } from "@/lib/audit";

type Ctx = { params: { id: string } };
const ALLOWED = new Set(["extraction", "generation", "mapping", "approval", "stage", "create", "draft", "outcome", "requirements_saved", "comment", "attachment", "checklist", "go_no_go"]);

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) {
      return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    }
    const rows = await rest<any[]>("GET", "vf_audit", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*&order=created_at.desc&limit=200`,
    });
    return NextResponse.json({ events: rows });
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
  const action = typeof body?.action === "string" ? body.action : "";
  if (!ALLOWED.has(action)) return NextResponse.json({ error: "Unknown audit action." }, { status: 400 });
  if (!(await ownsOpportunity(auth.userId, params.id))) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }
  const detail = body?.detail && typeof body.detail === "object" ? body.detail : {};
  await audit(auth.userId, params.id, action, detail);
  return NextResponse.json({ ok: true }, { status: 201 });
}
