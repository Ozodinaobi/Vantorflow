// GET    /api/opportunities/[id]/share: the share links for this opportunity (active first).
// POST   /api/opportunities/[id]/share: create a link { days } (default 14, max 60). Returns the token.
// DELETE /api/opportunities/[id]/share?token=...: revoke a link.
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, rest, UUID_RE } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const rows = await rest<any[]>("GET", "vf_share_links", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*&order=created_at.desc`,
    });
    return NextResponse.json({ links: rows });
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
  const days = Math.min(60, Math.max(1, Number(body?.days) || 14));
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) {
      return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    }
    const token = randomBytes(24).toString("base64url");
    const expires = new Date(Date.now() + days * 86400000).toISOString();
    const [row] = await rest<any[]>("POST", "vf_share_links", {
      body: {
        token,
        opportunity_id: params.id,
        user_id: auth.userId,
        created_by: auth.userId,
        expires_at: expires,
      },
      prefer: "return=representation",
    });
    return NextResponse.json({ link: row }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Could not create the share link: ");
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return NextResponse.json({ error: "Missing token." }, { status: 400 });
  try {
    const rows = await rest<any[]>("PATCH", "vf_share_links", {
      query: `?token=eq.${token}&opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}`,
      body: { revoked_at: new Date().toISOString() },
      prefer: "return=representation",
    });
    if (!rows.length) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    return NextResponse.json({ revoked: true });
  } catch (e) {
    return errorResponse(e);
  }
}
