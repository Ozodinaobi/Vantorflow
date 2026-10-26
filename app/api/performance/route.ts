// GET /api/performance: your bid performance numbers for the shareable card.
//   winRate = Won / (Won + Lost) as a percent. bidsRun = opportunities in Submitted, Outcome, or with an outcome.
//   avgReadiness = average readiness (mapped requirements / total) across opportunities, 0 when none.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const opps = await rest<any[]>("GET", "opportunities", {
      query: `?user_id=eq.${auth.userId}&select=id,status,outcome_result`,
    });
    const reqs = await rest<any[]>("GET", "requirements", {
      query: `?user_id=eq.${auth.userId}&select=opportunity_id,section`,
    });
    const won = opps.filter((o) => o.outcome_result === "Won").length;
    const lost = opps.filter((o) => o.outcome_result === "Lost").length;
    const bidsRun = opps.filter((o) => o.status === "Submitted" || o.status === "Outcome" || o.outcome_result).length;
    const byOpp: Record<string, { total: number; mapped: number }> = {};
    for (const r of reqs) {
      const b = (byOpp[r.opportunity_id] ??= { total: 0, mapped: 0 });
      b.total += 1;
      if (r.section) b.mapped += 1;
    }
    const readiness = Object.values(byOpp).filter((b) => b.total > 0).map((b) => b.mapped / b.total);
    const avgReadiness = readiness.length ? Math.round((readiness.reduce((a, b) => a + b, 0) / readiness.length) * 100) : 0;
    const winRate = won + lost === 0 ? null : Math.round((won / (won + lost)) * 100);
    return NextResponse.json({ winRate, won, lost, bidsRun, avgReadiness, opportunities: opps.length });
  } catch (e) {
    return errorResponse(e);
  }
}
