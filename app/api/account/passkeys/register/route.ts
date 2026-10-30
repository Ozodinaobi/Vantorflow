import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
function rpId() { return new URL(process.env.NEXT_PUBLIC_APP_URL || "https://vantorflow.com.ng").hostname; }
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const existing = await rest<Array<{ credential_id: string }>>("GET", "vf_passkeys", { query: `?user_id=eq.${auth.userId}&select=credential_id` });
    const options = await generateRegistrationOptions({ rpName: "Vantorflow", rpID: rpId(), userID: new TextEncoder().encode(auth.userId), userName: auth.email, attestationType: "none", excludeCredentials: existing.map(c => ({ id: c.credential_id })), authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" } });
    await rest("POST", "vf_webauthn_challenges", { body: { user_id: auth.userId, challenge: options.challenge, purpose: "register", expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }, prefer: "resolution=merge-duplicates" });
    return NextResponse.json(options);
  } catch (e) { return errorResponse(e); }
}
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const response = await req.json();
    const rows = await rest<Array<{ challenge: string; expires_at: string }>>("GET", "vf_webauthn_challenges", { query: `?user_id=eq.${auth.userId}&purpose=eq.register&select=challenge,expires_at&limit=1` });
    const row = rows[0];
    if (!row || Date.parse(row.expires_at) < Date.now()) return NextResponse.json({ error: "Passkey setup expired. Try again." }, { status: 400 });
    const verification = await verifyRegistrationResponse({ response, expectedChallenge: row.challenge, expectedOrigin: process.env.NEXT_PUBLIC_APP_URL || "https://vantorflow.com.ng", expectedRPID: rpId(), requireUserVerification: false });
    if (!verification.verified || !verification.registrationInfo) return NextResponse.json({ error: "Could not verify this passkey." }, { status: 400 });
    const info: any = verification.registrationInfo;
    const credential = info.credential || { id: info.credentialID, publicKey: info.credentialPublicKey, counter: info.counter };
    await rest("POST", "vf_passkeys", { body: { user_id: auth.userId, credential_id: credential.id, public_key: Buffer.from(credential.publicKey).toString("base64url"), counter: credential.counter, transports: response.response?.transports || [], device_type: info.credentialDeviceType || null, backed_up: Boolean(info.credentialBackedUp) } });
    await rest("DELETE", "vf_webauthn_challenges", { query: `?user_id=eq.${auth.userId}&purpose=eq.register` });
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
