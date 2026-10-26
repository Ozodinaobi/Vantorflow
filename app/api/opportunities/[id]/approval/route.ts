import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";
// GET  /api/opportunities/[id]/approval: the latest approval request for this opportunity, or null.
// POST /api/opportunities/[id]/approval: request approval { note }. Opens a new request.
// PATCH /api/opportunities/[id]/approval: decide the open request { decision: "Approved" | "Rejected", signature, note }.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";

type Ctx = { params: { id: string } };

async function latest(userId: string, oppId: string) {
  const rows = await rest<any[]>("GET", "vf_approvals", {
    query: `?opportunity_id=eq.${oppId}&user_id=eq.${userId}&select=*&order=requested_at.desc&limit=1`,
  });
  return rows[0] ?? null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    return NextResponse.json({ approval: await latest(auth.userId, params.id) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) {
      return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    }
    const current = await latest(auth.userId, params.id);
    if (current && current.status === "Requested") {
      return NextResponse.json({ error: "An approval is already waiting for a decision." }, { status: 409 });
    }
    const [row] = await rest<any[]>("POST", "vf_approvals", {
      body: { user_id: auth.userId, opportunity_id: params.id, status: "Requested", request_note: note },
      prefer: "return=representation",
    });
    await notify({ userId: auth.userId, title: "Approval requested", body: note, kind: "approval", dedupeKey: `approval-req:${row.id}` });
    await audit(auth.userId, params.id, "approval_requested", { note });
    return NextResponse.json({ approval: row }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Approval was NOT requested: ");
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
  if (body.decision !== "Approved" && body.decision !== "Rejected") {
    return NextResponse.json({ error: "Decision must be Approved or Rejected." }, { status: 400 });
  }
  const signature = typeof body.signature === "string" ? body.signature.trim().slice(0, 120) : "";
  if (signature.length < 2) {
    return NextResponse.json({ error: "Type your name as the signature." }, { status: 400 });
  }
  const decisionNote = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  try {
    const current = await latest(auth.userId, params.id);
    if (!current || current.status !== "Requested") {
      return NextResponse.json({ error: "There is no open approval request to decide." }, { status: 409 });
    }
    const [row] = await rest<any[]>("PATCH", "vf_approvals", {
      query: `?id=eq.${current.id}&user_id=eq.${auth.userId}`,
      body: {
        status: body.decision,
        decided_by: signature,
        decision_note: decisionNote,
        decided_at: new Date().toISOString(),
      },
      prefer: "return=representation",
    });
    await notify({ userId: auth.userId, title: `Approval ${body.decision.toLowerCase()}`, body: decisionNote, kind: "approval", dedupeKey: `approval-dec:${current.id}` });
    await audit(auth.userId, params.id, "approval_decided", { decision: body.decision });
    return NextResponse.json({ approval: row });
  } catch (e) {
    return errorResponse(e, "Decision was NOT saved: ");
  }
}
