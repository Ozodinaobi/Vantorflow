import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import { rest } from "@/lib/db";
import { renderHtml, renderText, APP_URL } from "@/lib/email/template";
import { senderAddress, SENDER_NAME } from "@/lib/email/senders";

function digestCode(code: string): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret) throw new Error("Email verification is temporarily unavailable.");
  return createHmac("sha256", secret).update(code).digest();
}
export async function issueEmailCode(userId: string, email: string, purpose: "verify" | "login") {
  if (!process.env.RESEND_API_KEY) throw new Error("Email verification is temporarily unavailable.");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await rest("DELETE", "vf_auth_codes", { query: `?user_id=eq.${encodeURIComponent(userId)}&purpose=eq.${purpose}` });
  await rest("POST", "vf_auth_codes", { body: { user_id: userId, email, purpose, code_hash: digestCode(code).toString("hex"), expires_at: new Date(Date.now() + 10 * 60_000).toISOString() } });
  const subject = purpose === "verify" ? "Your Vantorflow verification code" : "Your Vantorflow sign-in code";
  const content = { subject, heading: purpose === "verify" ? "Verify your email" : "Confirm it's you", body: `Your ${purpose === "verify" ? "email verification" : "sign-in"} code is:\n\n${code}\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.` };
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: `${SENDER_NAME} <${senderAddress("admin")}>`, to: [email], subject, html: renderHtml(content, `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`), text: renderText(content, `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`) }), cache: "no-store" });
  if (!response.ok) { await rest("DELETE", "vf_auth_codes", { query: `?user_id=eq.${encodeURIComponent(userId)}&purpose=eq.${purpose}` }).catch(() => undefined); throw new Error("Could not send the email code. Try again."); }
}
export async function consumeEmailCode(userId: string, purpose: "verify" | "login", code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const rows = await rest<Array<{ code_hash: string; expires_at: string }>>("GET", "vf_auth_codes", { query: `?user_id=eq.${encodeURIComponent(userId)}&purpose=eq.${purpose}&select=code_hash,expires_at&limit=1` });
  const row = rows[0];
  if (!row || Date.parse(row.expires_at) <= Date.now()) return false;
  const expected = Buffer.from(row.code_hash, "hex"), actual = digestCode(code);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  await rest("DELETE", "vf_auth_codes", { query: `?user_id=eq.${encodeURIComponent(userId)}&purpose=eq.${purpose}` });
  return true;
}
export async function hasTwoFactor(userId: string): Promise<boolean> {
  const rows = await rest<Array<{ two_factor_enabled: boolean }>>("GET", "vf_auth_security", { query: `?user_id=eq.${encodeURIComponent(userId)}&select=two_factor_enabled&limit=1` });
  return Boolean(rows[0]?.two_factor_enabled);
}
export async function pendingUserForEmail(email: string, purpose: "verify" | "login"): Promise<string | null> {
  const codes = await rest<Array<{ user_id: string }>>("GET", "vf_auth_codes", { query: `?email=eq.${encodeURIComponent(email)}&purpose=eq.${purpose}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=user_id&limit=1` });
  return codes[0]?.user_id || null;
}
