// POST /api/auth/login. Checks email + password with GoTrue (service key) and starts a session cookie.
import { NextResponse } from "next/server";
import { DbError, errorResponse, isConfigured, authCall } from "@/lib/db";
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
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const res0 = await authCall("POST", "/token?grant_type=password", { email, password });
    if (!res0.ok) {
      return NextResponse.json({ error: "Email or password is not right." }, { status: 401 });
    }
    const uid: string | undefined = res0.data?.user?.id;
    if (!uid) return NextResponse.json({ error: "Login returned no user." }, { status: 502 });

    const token = await signSession(uid, res0.data?.user?.email || email);
    const res = NextResponse.json({ ok: true, email });
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
