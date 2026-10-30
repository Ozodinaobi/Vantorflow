import { NextResponse } from "next/server";
import { authCall, errorResponse, rest } from "@/lib/db";
import { consumeEmailCode, hasTwoFactor, issueEmailCode } from "@/lib/email/authCodes";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/session";

const rpId = () => new URL(process.env.NEXT_PUBLIC_APP_URL || "https://vantorflow.com.ng").hostname;
async function lookup(email: string) {
  const found = await authCall("GET", `/admin/users?email=${encodeURIComponent(email)}`);
  return Array.isArray(found.data?.users) ? found.data.users.find((u: any) => u.email?.toLowerCase() === email) : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return NextResponse.json({ error: "Enter your email first." }, { status: 400 });
    const user = await lookup(email);
    if (!user?.id) return NextResponse.json({ error: "No passkey is registered for that email." }, { status: 404 });
    const passkeys = await rest<Array<{ credential_id: string; transports: string[] }>>("GET", "vf_passkeys", { query: `?user_id=eq.${user.id}&select=credential_id,transports` });
    if (!passkeys.length) return NextResponse.json({ error: "No passkey is registered for that email." }, { status: 404 });
    const options = await generateAuthenticationOptions({ rpID: rpId(), allowCredentials: passkeys.map(p => ({ id: p.credential_id, transports: p.transports as any })), userVerification: "preferred" });
    await rest("POST", "vf_webauthn_challenges", { body: { user_id: user.id, purpose: "login", challenge: options.challenge, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }, prefer: "resolution=merge-duplicates" });
    return NextResponse.json(options);
  } catch (e) { return errorResponse(e); }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const response = body;
    if (typeof response?.id !== "string") return NextResponse.json({ error: "Passkey response is incomplete." }, { status: 400 });
    const rows = await rest<Array<{ user_id: string; credential_id: string; public_key: string; counter: number; transports: string[] }>>("GET", "vf_passkeys", { query: `?credential_id=eq.${encodeURIComponent(response.id)}&select=user_id,credential_id,public_key,counter,transports&limit=1` });
    const pk = rows[0];
    if (!pk) return NextResponse.json({ error: "Passkey not recognized." }, { status: 401 });
    const challenges = await rest<Array<{ challenge: string; expires_at: string }>>("GET", "vf_webauthn_challenges", { query: `?user_id=eq.${pk.user_id}&purpose=eq.login&select=challenge,expires_at&limit=1` });
    const challenge = challenges[0];
    if (!challenge || Date.parse(challenge.expires_at) <= Date.now()) return NextResponse.json({ error: "Sign-in expired. Try again." }, { status: 400 });
    const result = await verifyAuthenticationResponse({ response, expectedChallenge: challenge.challenge, expectedOrigin: process.env.NEXT_PUBLIC_APP_URL || "https://vantorflow.com.ng", expectedRPID: rpId(), credential: { id: pk.credential_id, publicKey: Buffer.from(pk.public_key, "base64url"), counter: Number(pk.counter), transports: pk.transports as any } as any });
    if (!result.verified) return NextResponse.json({ error: "Passkey sign-in failed." }, { status: 401 });
    const userResult = await authCall("GET", `/admin/users/${pk.user_id}`);
    const email = userResult.data?.email;
    const security = await rest<Array<{ email_verified: boolean }>>("GET", "vf_auth_security", { query: `?user_id=eq.${pk.user_id}&select=email_verified&limit=1` });
    if (!email || (!userResult.data?.email_confirmed_at && !security[0]?.email_verified)) return NextResponse.json({ error: "Verify your email before signing in." }, { status: 403 });
    await rest("PATCH", "vf_passkeys", { query: `?credential_id=eq.${encodeURIComponent(pk.credential_id)}`, body: { counter: result.authenticationInfo.newCounter, last_used_at: new Date().toISOString() } });
    await rest("DELETE", "vf_webauthn_challenges", { query: `?user_id=eq.${pk.user_id}&purpose=eq.login` });
    if (await hasTwoFactor(pk.user_id)) {
      await issueEmailCode(pk.user_id, email, "login");
      return NextResponse.json({ ok: true, requiresTwoFactor: true, challengeId: pk.user_id, email });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await signSession(pk.user_id, email), SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) { return errorResponse(e); }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code : "";
    const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
    if (!email || !challengeId || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "That code is not valid or has expired." }, { status: 400 });
    const rows = await rest<Array<{ user_id: string; code_hash: string }>>("GET", "vf_auth_codes", { query: `?email=eq.${encodeURIComponent(email)}&purpose=eq.login&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_id,code_hash&limit=1` });
    const expected = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY || "").update(code).digest();
    const actual = Buffer.from(rows[0]?.code_hash || "", "hex");
    if (rows[0]?.user_id !== challengeId || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "That code is not valid or has expired." }, { status: 400 });
    const userResult = await authCall("GET", `/admin/users/${challengeId}`);
    if (userResult.data?.email?.toLowerCase() !== email) return NextResponse.json({ error: "That code is not valid or has expired." }, { status: 400 });
    if (!(await consumeEmailCode(challengeId, "login", code))) return NextResponse.json({ error: "That code is not valid or has expired." }, { status: 400 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await signSession(challengeId, email), SESSION_COOKIE_OPTIONS);
    return res;
  } catch (e) { return errorResponse(e); }
}
