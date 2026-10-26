// SERVER ONLY. Talks to Supabase with the service role key (PostgREST + GoTrue admin).
// Never import this from a client component. The service key bypasses RLS, so every query here
// is scoped by user_id explicitly.
import { NextResponse } from "next/server";

export class DbError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
}

function serviceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function isConfigured(): boolean {
  return baseUrl().startsWith("https://") && serviceKey().length > 20;
}

function notConfigured(): DbError {
  return new DbError(
    "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the server.",
    500,
    "not_configured"
  );
}

// Table names used by the app. They must match supabase-schema.sql.
export const TABLES = ["opportunities", "rfqs", "requirements", "response_sections"] as const;

// Data access through PostgREST (/rest/v1). Always no-store so Next.js never caches user data.
export async function rest<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  table: string,
  opts: { query?: string; body?: unknown; prefer?: string } = {}
): Promise<T> {
  if (!isConfigured()) throw notConfigured();
  const key = serviceKey();
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.prefer) headers["Prefer"] = opts.prefer;
  const res = await fetch(`${baseUrl()}/rest/v1/${table}${opts.query ?? ""}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const obj = (data ?? {}) as { code?: string; message?: string };
    throw new DbError(obj.message || `Database request failed (HTTP ${res.status}).`, res.status, obj.code ?? null);
  }
  return data as T;
}

// Auth admin calls (GoTrue) with the service key.
export async function authCall(
  method: "POST",
  path: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: any }> {
  if (!isConfigured()) throw notConfigured();
  const key = serviceKey();
  const res = await fetch(`${baseUrl()}/auth/v1${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { msg: text };
  }
  return { ok: res.ok, status: res.status, data };
}

// True when the given opportunity exists and belongs to this user.
export async function ownsOpportunity(userId: string, oppId: string): Promise<boolean> {
  const rows = await rest<{ id: string }[]>("GET", "opportunities", {
    query: `?id=eq.${oppId}&user_id=eq.${userId}&select=id&limit=1`,
  });
  return rows.length > 0;
}

// Turns any thrown error into a JSON response. Missing tables become a setup_required flag.
export function errorResponse(e: unknown, prefix = "") {
  if (e instanceof DbError) {
    const missingTable = e.code === "PGRST205" || /Could not find the table/i.test(e.message);
    if (missingTable) {
      return NextResponse.json(
        { error: "The database tables are not set up yet.", setupRequired: true },
        { status: 503 }
      );
    }
    const status = e.status >= 400 && e.status < 600 ? e.status : 500;
    return NextResponse.json({ error: prefix + e.message }, { status });
  }
  return NextResponse.json(
    { error: prefix + (e instanceof Error ? e.message : "Unexpected error.") },
    { status: 500 }
  );
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
