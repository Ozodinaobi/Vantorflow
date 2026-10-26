// /api/account. GET: current profile. PATCH: update display name, or change password (needs the current password).
// Uses GoTrue admin endpoints via the service key, and checks the current password before any password change.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { DbError, errorResponse, isConfigured, authCall } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isConfigured()) return errorResponse(new DbError("Supabase is not configured.", 500, "not_configured"));
  try {
    const res = await authCall("GET", `/admin/users/${auth.userId}`);
    if (!res.ok) return NextResponse.json({ error: "Could not load your profile." }, { status: 502 });
    const u = res.data ?? {};
    return NextResponse.json({
      email: u.email ?? auth.email,
      name: u.user_metadata?.full_name ?? "",
      created_at: u.created_at ?? null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!isConfigured()) return errorResponse(new DbError("Supabase is not configured.", 500, "not_configured"));

  let body: { name?: unknown; current_password?: unknown; new_password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  try {
    // Profile: display name only.
    if (typeof body.name === "string" && body.new_password === undefined) {
      const name = body.name.trim().slice(0, 120);
      const res = await authCall("PUT", `/admin/users/${auth.userId}`, { user_metadata: { full_name: name } });
      if (!res.ok) return NextResponse.json({ error: "Could not save your profile." }, { status: 502 });
      return NextResponse.json({ ok: true, name });
    }

    // Password change: verify the current password first, then set the new one.
    if (typeof body.new_password === "string") {
      const current = typeof body.current_password === "string" ? body.current_password : "";
      const next = body.new_password;
      if (!current) return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
      if (next.length < 8) return NextResponse.json({ error: "The new password must be at least 8 characters." }, { status: 400 });
      if (next === current) return NextResponse.json({ error: "The new password must be different from the current one." }, { status: 400 });

      const check = await authCall("POST", "/token?grant_type=password", { email: auth.email, password: current });
      if (!check.ok) return NextResponse.json({ error: "Your current password is not right." }, { status: 401 });

      const res = await authCall("PUT", `/admin/users/${auth.userId}`, { password: next });
      if (!res.ok) return NextResponse.json({ error: "Could not change your password. Try again." }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}
