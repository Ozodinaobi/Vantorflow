import { NextResponse } from "next/server";
import { rest, errorResponse } from "@/lib/db";
import { requireUser } from "@/lib/serverAuth";
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const rows = await rest<Array<{ two_factor_enabled: boolean }>>("GET", "vf_auth_security", { query: `?user_id=eq.${auth.userId}&select=two_factor_enabled&limit=1` });
    const passkeys = await rest<Array<{ credential_id: string; created_at: string; device_type: string | null }>>("GET", "vf_passkeys", { query: `?user_id=eq.${auth.userId}&select=credential_id,created_at,device_type&order=created_at.desc` });
    return NextResponse.json({ twoFactorEnabled: rows[0]?.two_factor_enabled ?? false, passkeys });
  } catch (e) { return errorResponse(e); }
}
export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const body = await req.json();
    if (typeof body.twoFactorEnabled !== "boolean") return NextResponse.json({ error: "Choose whether to turn email two-step verification on or off." }, { status: 400 });
    await rest("POST", "vf_auth_security", { body: { user_id: auth.userId, email_verified: true, two_factor_enabled: body.twoFactorEnabled, updated_at: new Date().toISOString() }, prefer: "resolution=merge-duplicates" });
    return NextResponse.json({ ok: true, twoFactorEnabled: body.twoFactorEnabled });
  } catch (e) { return errorResponse(e); }
}
