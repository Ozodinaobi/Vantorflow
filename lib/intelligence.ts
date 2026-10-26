// Pure aggregation for the Insights and Intelligence pages. Server computes it from real rows; nothing is invented.
import { CATEGORIES, STAGES } from "./types";
import { APP_TIMEZONE } from "./time";

export const OUTCOME_REASONS = [
  "Price",
  "Technical strength",
  "Compliance",
  "Relationship",
  "Past performance",
  "Delivery plan",
  "Missed deadline",
  "Scope mismatch",
  "Other",
] as const;

export interface IntelOpp {
  id: string;
  status: string;
  updated_at: string | null;
  outcome_result: string | null;
  outcome_reason: string | null;
  outcome_at: string | null;
}

export interface IntelReq {
  opportunity_id: string;
  category: string | null;
}

export function computeIntelligence(opps: IntelOpp[], reqs: IntelReq[], now: Date = new Date()) {
  const stages = STAGES.map((stage) => ({ stage, count: opps.filter((o) => o.status === stage).length }));

  const categories = CATEGORIES.map((category) => ({
    category,
    count: reqs.filter((r) => (r.category ?? "Other") === category).length,
  }));

  // Bottleneck: days since the last update, for opportunities still open, grouped by the stage they sit in.
  // This is "time since last change", because the database keeps no stage history.
  const open = opps.filter((o) => o.status !== "Outcome");
  const bottlenecks = STAGES.filter((s) => s !== "Outcome")
    .map((stage) => {
      const inStage = open.filter((o) => o.status === stage && o.updated_at);
      const days = inStage.map((o) => Math.max(0, Math.round((now.getTime() - new Date(o.updated_at as string).getTime()) / 86400000)));
      const avg = days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null;
      return { stage, count: inStage.length, avg_days: avg };
    })
    .filter((b) => b.count > 0);

  const won = opps.filter((o) => o.outcome_result === "Won");
  const lost = opps.filter((o) => o.outcome_result === "Lost");
  const rate = won.length + lost.length === 0 ? null : Math.round((won.length / (won.length + lost.length)) * 100);

  const reasonMap = new Map<string, { won: number; lost: number }>();
  for (const o of [...won, ...lost]) {
    const key = o.outcome_reason || "Other";
    const row = reasonMap.get(key) ?? { won: 0, lost: 0 };
    if (o.outcome_result === "Won") row.won++;
    else row.lost++;
    reasonMap.set(key, row);
  }
  const byReason = [...reasonMap.entries()]
    .map(([reason, v]) => ({ reason, ...v }))
    .sort((a, b) => b.won + b.lost - (a.won + a.lost));

  // Monthly trend, bucketed by the Lagos calendar month of the outcome date.
  const monthFmt = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit" });
  const trendMap = new Map<string, { won: number; lost: number }>();
  for (const o of [...won, ...lost]) {
    if (!o.outcome_at) continue;
    const month = monthFmt.format(new Date(o.outcome_at));
    const row = trendMap.get(month) ?? { won: 0, lost: 0 };
    if (o.outcome_result === "Won") row.won++;
    else row.lost++;
    trendMap.set(month, row);
  }
  const trend = [...trendMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, ...v, rate: Math.round((v.won / (v.won + v.lost)) * 100) }));

  return {
    totals: { opportunities: opps.length, open: open.length, won: won.length, lost: lost.length, rate },
    stages,
    categories,
    bottlenecks,
    byReason,
    trend,
  };
}
