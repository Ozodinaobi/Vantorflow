// POST /api/opportunities/[id]/price-check { bidPrice, competitorAverage, marginPct, minMarginPct }
// Stores the real numbers and returns the pricing score (1 to 5) with reasons.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, ownsOpportunity, UUID_RE } from "@/lib/db";
import { audit } from "@/lib/audit";
import { scorePricing } from "@/lib/knowledge";

type Ctx = { params: { id: string } };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const nums = { bidPrice: Number(b?.bidPrice ?? 0), competitorAverage: Number(b?.competitorAverage ?? 0), marginPct: Number(b?.marginPct ?? 0), minMarginPct: Number(b?.minMarginPct ?? 15) };
  for (const [k, v] of Object.entries(nums)) if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: `${k} must be a number of 0 or more.` }, { status: 400 });
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const result = scorePricing(nums);
    await audit(auth.userId, params.id, "price_check", { score: result.score, ...nums });
    return NextResponse.json({ inputs: nums, ...result });
  } catch (e) {
    return errorResponse(e);
  }
}
