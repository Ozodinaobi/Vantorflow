// GET    /api/team: members you have invited (directory view).
// POST   /api/team: invite by email { email, role } creates a pending row. No email is sent yet.
// DELETE /api/team?id=...: remove a member.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";

const ROLES = ["owner", "bidder", "approver"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const rows = await rest<any[]>("GET", "vf_team_members", {
      query: `?owner_id=eq.${auth.userId}&select=*&order=created_at.asc`,
    });
    return NextResponse.json({ members: rows });
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
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const role = typeof body?.role === "string" && ROLES.includes(body.role) ? body.role : "bidder";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  try {
    const [row] = await rest<any[]>("POST", "vf_team_members", {
      body: { owner_id: auth.userId, member_email: email, role, status: "invited" },
      prefer: "return=representation",
    });
    return NextResponse.json({ member: row, note: "Invite saved. Invite emails ship with notifications." }, { status: 201 });
  } catch (e) {
    const msg = String((e as any)?.message ?? e);
    if (/duplicate|unique/i.test(msg)) {
      return NextResponse.json({ error: "That email is already on your team." }, { status: 409 });
    }
    return errorResponse(e, "Could not invite: ");
  }
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    await rest("DELETE", "vf_team_members", { query: `?id=eq.${id}&owner_id=eq.${auth.userId}` });
    return NextResponse.json({ removed: true });
  } catch (e) {
    return errorResponse(e);
  }
}
