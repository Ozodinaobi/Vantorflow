// GET /api/setup/status. Checks each app table exists by asking PostgREST for one row.
import { NextResponse } from "next/server";
import { isConfigured, rest, TABLES, DbError } from "@/lib/db";

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ ready: false, configured: false, missing: [...TABLES] });
  }
  const missing: string[] = [];
  for (const t of TABLES) {
    try {
      await rest("GET", t, { query: "?select=id&limit=1" });
    } catch (e) {
      if (e instanceof DbError && (e.code === "PGRST205" || /Could not find the table/i.test(e.message))) {
        missing.push(t);
      } else {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Check failed." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ ready: missing.length === 0, configured: true, missing });
}
