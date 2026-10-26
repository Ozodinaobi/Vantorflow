// Signed session cookie. Works in both the Edge runtime (middleware) and Node (route handlers).
// The cookie holds {uid, email, exp} plus an HMAC-SHA256 signature. The key is derived from the
// service role key on the server, so the browser can read nothing useful and cannot forge a session.
export const SESSION_COOKIE = "vf_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  uid: string;
  email: string;
  exp: number; // unix seconds
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("vantorflow-session-v1:" + secret));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function toB64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Copies bytes into a plain ArrayBuffer (fixes TypeScript's BufferSource typing).
function buf(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

export async function signSession(uid: string, email: string): Promise<string> {
  const payload: SessionPayload = { uid, email, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const body = toB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), buf(new TextEncoder().encode(body))));
  return `${body}.${toB64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      buf(fromB64url(sig)),
      buf(new TextEncoder().encode(body))
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload;
    if (!payload.uid || !payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Structure and expiry only (no signature). Safe in Edge middleware, which cannot read the server secret.
export function looksLikeSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))) as SessionPayload;
    return !!payload.uid && !!payload.exp && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: MAX_AGE_SECONDS,
};
