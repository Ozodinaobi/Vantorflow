import { createHash, randomUUID } from "crypto";
import type { GeminiUsage } from "./gemini";
import { rest } from "./db";

export const AI_MONTHLY_REQUEST_CAP = 300;
export const AI_REQUESTS_PER_MINUTE = 10;

// Reservations count toward both limits before calling Gemini, preventing parallel requests from exceeding the cap.
type RpcResult = { allowed: boolean; reason?: string; used?: number; cap?: number; retry_after_seconds?: number };

export class AiAccessError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter?: number) {
    super(message);
    this.name = "AiAccessError";
  }
}

export function makeAiRequestId() { return randomUUID(); }
export function hashClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip")?.trim();
  const salt = process.env.AI_USAGE_IP_HASH_SALT;
  return ip && salt ? createHash("sha256").update(`${salt}:${ip}`).digest("hex") : null;
}

export async function reserveAiRequest(userId: string, feature: string, requestId: string, ipHash: string | null) {
  let result: RpcResult[];
  try {
    result = await rest<RpcResult[]>("POST", "rpc/ai_usage_reserve", { body: {
      p_user_id: userId, p_feature: feature, p_request_id: requestId, p_ip_hash: ipHash,
      p_rate_limit: AI_REQUESTS_PER_MINUTE, p_default_monthly_cap: AI_MONTHLY_REQUEST_CAP,
    } });
  } catch {
    throw new AiAccessError(503, "ai_controls_unavailable", "AI access controls are temporarily unavailable.");
  }
  const d = result?.[0];
  if (!d) throw new AiAccessError(503, "ai_controls_unavailable", "AI access check returned no decision.");
  if (d.allowed) return;
  if (d.reason === "suspended") throw new AiAccessError(403, "account_suspended", "AI access is disabled for this account.");
  if (d.reason === "terminated") throw new AiAccessError(403, "account_terminated", "This account is closed.");
  if (d.reason === "monthly_cap") throw new AiAccessError(429, "ai_monthly_cap_reached", `Monthly AI request cap reached (${d.used ?? 0}/${d.cap ?? AI_MONTHLY_REQUEST_CAP}).`);
  if (d.reason === "rate_limited") throw new AiAccessError(429, "ai_rate_limited", "Too many AI requests. Please wait and try again.", d.retry_after_seconds);
  throw new AiAccessError(503, "ai_controls_unavailable", "AI access check returned an invalid decision.");
}

export async function recordAiOutcome(args: { userId: string; requestId: string; ipHash: string | null; outcome: "success" | "error"; usage?: GeminiUsage }) {
  try {
    await rest("PATCH", "ai_usage_events", {
      query: `?user_id=eq.${args.userId}&request_id=eq.${args.requestId}`,
      body: { tokens_input: args.usage?.input ?? 0, tokens_output: args.usage?.output ?? 0,
        tokens_total: args.usage?.total ?? 0, outcome: args.outcome, ip_hash: args.ipHash, metadata: {} },
      prefer: "return=minimal",
    });
  } catch { /* reservation row already accounts for cap/rate enforcement */ }
}

export async function withAiUsage<T>(args: { userId: string; feature: string; req: Request; operation: (onUsage: (usage: GeminiUsage) => void) => Promise<T> }): Promise<T> {
  const requestId = makeAiRequestId();
  const ipHash = hashClientIp(args.req);
  await reserveAiRequest(args.userId, args.feature, requestId, ipHash);
  let usage: GeminiUsage | undefined;
  try {
    const result = await args.operation((next) => { usage = next; });
    await recordAiOutcome({ userId: args.userId, requestId, ipHash, outcome: "success", usage });
    return result;
  } catch (e) {
    await recordAiOutcome({ userId: args.userId, requestId, ipHash, outcome: "error", usage });
    throw e;
  }
}

export function aiAccessErrorResponse(e: unknown) {
  if (!(e instanceof AiAccessError)) return null;
  const headers: Record<string, string> = {};
  if (e.retryAfter) headers["Retry-After"] = String(e.retryAfter);
  return Response.json({ error: e.message, code: e.code }, { status: e.status, headers });
}
