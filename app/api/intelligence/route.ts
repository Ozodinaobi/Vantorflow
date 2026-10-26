// GET /api/intelligence: pipeline counts, requirement categories, stage bottlenecks, win/loss, monthly trend.
// Computed from the signed-in user's real rows only. Read-only.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";
import { computeIntelligence } from "@/lib/intelligence";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const [opps, reqs] = await Promise.all([
      rest<any[]>("GET", "opportunities", {
        query: `?user_id=eq.${auth.userId}&select=id,status,updated_at,deadline,outcome_result,outcome_reason,outcome_at`,
      }),
      rest<any[]>("GET", "requirements", {
        query: `?user_id=eq.${auth.userId}&select=opportunity_id,category`,
      }),
    ]);
    return NextResponse.json(computeIntelligence(opps, reqs));
  } catch (e) {
    return errorResponse(e);
  }
}
