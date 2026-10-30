import { NextResponse } from "next/server";
import { authCall, DbError, errorResponse, isConfigured, rest } from "@/lib/db";
import { issueEmailCode, consumeEmailCode, hasTwoFactor } from "@/lib/email/authCodes";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/session";

export async function POST(req: Request) {
  if (!isConfigured()) return errorResponse(new DbError("Supabase is not configured.", 500, "not_configured"));
  let body: { email?: unknown; password?: unknown; code?: unknown; challengeId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  try {
    if (typeof body.challengeId === "string" && typeof body.code === "string") {
      if (!email || !password || !/^\d{6}$/.test(body.code)) return NextResponse.json({ error: "That code is not valid or has expired." }, { status: 400 });
      const login = await authCall("POST", "/token?grant_type=password", { email, password });
      if (!login.ok || login.data?.user?.id !== body.challengeId) return NextResponse.json({ error: "Email or password is not right." }, { status: 401 });
      const validCode = await consumeEmailCode(body.challengeId, "login", body.code);
      if (!validCode) return NextResponse.json({ error: "That code is not valid or has expired." }, { status: 400 });
      const res = NextResponse.json({ ok: true, email });
      res.cookies.set(SESSION_COOKIE, await signSession(body.challengeId, email), SESSION_COOKIE_OPTIONS);
      return res;
    }
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    const login = await authCall("POST", "/token?grant_type=password", { email, password });
    if (!login.ok) return NextResponse.json({ error: "Email or password is not right." }, { status: 401 });
    const user = login.data?.user;
    if (!user?.id) return NextResponse.json({ error: "Login returned no user." }, { status: 502 });
    const security = await rest<Array<{ email_verified: boolean }>>("GET", "vf_auth_security", { query: `?user_id=eq.${user.id}&select=email_verified&limit=1` });
    if (!user.email_confirmed_at && !security[0]?.email_verified) return NextResponse.json({ error: "Verify your email before signing in." }, { status: 403 });
    if (await hasTwoFactor(user.id)) {
      await issueEmailCode(user.id, email, "login");
      return NextResponse.json({ ok: true, requiresTwoFactor: true, challengeId: user.id, email });
    }
    const res = NextResponse.json({ ok: true, email });
    res.cookies.set(SESSION_COOKIE, await signSession(user.id, user.email || email), SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) { return errorResponse(e); }
}
