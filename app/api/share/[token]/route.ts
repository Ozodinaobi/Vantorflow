// GET /api/share/[token]: PUBLIC read-only proposal view. No session: the unguessable token is the credential.
// Only returns the fields a client should see: title, buyer, deadline, stage, readiness, sections, requirements.
import { NextResponse } from "next/server";
import { errorResponse, rest } from "@/lib/db";
import { toDraft, toOpportunity, toRequirements } from "@/lib/mappers";
import { computeReadiness } from "@/lib/readiness";
import { SECTIONS } from "@/lib/types";

type Ctx = { params: { token: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const token = params.token;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return NextResponse.json({ error: "Link not found." }, { status: 404 });
  try {
    const links = await rest<any[]>("GET", "vf_share_links", { query: `?token=eq.${token}&select=*&limit=1` });
    const link = links[0];
    if (!link || link.revoked_at) return NextResponse.json({ error: "This link has been revoked." }, { status: 404 });
    if (new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "This link has expired." }, { status: 410 });
    }
    const [oppRows, reqRows, draftRows] = await Promise.all([
      rest<any[]>("GET", "opportunities", { query: `?id=eq.${link.opportunity_id}&user_id=eq.${link.user_id}&select=*&limit=1` }),
      rest<any[]>("GET", "requirements", { query: `?opportunity_id=eq.${link.opportunity_id}&user_id=eq.${link.user_id}&select=*` }),
      rest<any[]>("GET", "response_sections", { query: `?opportunity_id=eq.${link.opportunity_id}&user_id=eq.${link.user_id}&select=*` }),
    ]);
    if (!oppRows.length) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    const opp = toOpportunity(oppRows[0]);
    const requirements = toRequirements(reqRows);
    const drafts = draftRows.map(toDraft);
    const readiness = computeReadiness({ requirements, drafts });
    return NextResponse.json({
      proposal: {
        title: opp.title,
        buyer: opp.buyer,
        deadline: opp.deadline,
        status: opp.status,
        readiness,
        sections: SECTIONS.map((s) => ({ section: s, draft: drafts.find((d) => d.section === s)?.draft ?? "" })),
        requirements: requirements.map((r) => ({ number: r.number, category: r.category, text: r.text, section: r.section })),
        expiresAt: link.expires_at,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
