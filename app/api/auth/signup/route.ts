// POST /api/auth/signup. Creates the user with the admin API (auto-confirmed) and starts a session.
import { NextResponse } from "next/server";
import { authCall, DbError, errorResponse, isConfigured } from "@/lib/db";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/session";

export async function POST(req: Request) {
  if (!isConfigured()) return errorResponse(new DbError("Supabase is not configured.", 500, "not_configured"));
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  try {
    // email_confirm: true means no confirmation email is needed.
    const created = await authCall("POST", "/admin/users", {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        vf_onboarding_completed: false,
        vf_onboarding_step: 0,
        vf_onboarding_completed_steps: [],
        vf_onboarding_skipped_steps: [],
        vf_onboarding_template: null,
      },
    });
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

    const token = await signSession(uid, email);
    const res = NextResponse.json({ ok: true, email });
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
