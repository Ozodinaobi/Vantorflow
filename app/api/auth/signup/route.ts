// POST /api/auth/signup. Creates a user requiring email verification before sign-in.
import { NextResponse } from "next/server";
import { authCall, DbError, errorResponse, isConfigured, rest } from "@/lib/db";
import { consumeEmailCode, issueEmailCode, pendingUserForEmail } from "@/lib/email/authCodes";

export async function POST(req: Request) {
  if (!isConfigured()) return errorResponse(new DbError("Supabase is not configured.", 500, "not_configured"));
  let body: { email?: unknown; password?: unknown; code?: unknown; verifyEmail?: unknown; resendVerification?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (body.resendVerification === true) {
    if (!email) return NextResponse.json({ error: "Enter your email address." }, { status: 400 });
    try {
      const userId = await pendingUserForEmail(email, "verify");
      if (userId) await issueEmailCode(userId, email, "verify");
      return NextResponse.json({ ok: true, message: "If this account needs verification, a new code has been sent." });
    } catch (e) { return errorResponse(e); }
  }
  if (body.verifyEmail === true) {
    const code = typeof body.code === "string" ? body.code : "";
    if (!email || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter your email and 6-digit code." }, { status: 400 });
    try {
      const userId = await pendingUserForEmail(email, "verify");
      if (!userId || !(await consumeEmailCode(userId, "verify", code))) return NextResponse.json({ error: "That code is not valid or has expired." }, { status: 400 });
      const confirmed = await authCall("PUT", `/admin/users/${userId}`, { email_confirm: true });
      if (!confirmed.ok) return NextResponse.json({ error: "Could not verify your email. Try again." }, { status: 502 });
      await rest("POST", "vf_auth_security", { body: { user_id: userId, email_verified: true, two_factor_enabled: false }, prefer: "resolution=merge-duplicates" });
      return NextResponse.json({ ok: true, verified: true });
    } catch (e) { return errorResponse(e); }
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  try {
    const created = await authCall("POST", "/admin/users", { email, password, email_confirm: false });
    if (!created.ok) {
      const msg: string = created.data?.msg || created.data?.message || "Could not create the account.";
      const taken = /already|registered|exists/i.test(msg);
      return NextResponse.json(
        { error: taken ? "An account with this email already exists. Log in instead." : msg },
        { status: taken ? 409 : 400 }
      );
    }
    const uid: string = created.data?.id;
    if (!uid) return NextResponse.json({ error: "Account was created but no id came back." }, { status: 502 });


  try {
    await issueEmailCode(uid, email, "verify");
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not send verification code." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, requiresVerification: true, email });
  } catch (e) {
    return errorResponse(e);
  }
}
