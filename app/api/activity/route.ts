// GET /api/activity: audit events across all your opportunities, newest first, with the opportunity title.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const events = await rest<any[]>("GET", "vf_audit", {
      query: `?user_id=eq.${auth.userId}&select=*&order=created_at.desc&limit=300`,
    });
    const oppIds = Array.from(new Set(events.map((e) => e.opportunity_id).filter(Boolean)));
    const titles: Record<string, string> = {};
    if (oppIds.length) {
      const opps = await rest<any[]>("GET", "opportunities", {
        query: `?user_id=eq.${auth.userId}&id=in.(${oppIds.join(",")})&select=id,title`,
      });
      for (const o of opps) titles[o.id] = o.title ?? "Untitled";
    }
    return NextResponse.json({
      events: events.map((e) => ({ ...e, opportunity_title: e.opportunity_id ? titles[e.opportunity_id] ?? null : null })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
