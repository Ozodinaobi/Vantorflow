import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";

type Ctx = { params: { id: string } };
const criteria = ["fit", "capacity", "margin", "relationship"] as const;

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const rows = await rest<any[]>("GET", "opportunities", { query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=id,gonogo&limit=1` });
    if (!rows.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    return NextResponse.json({ gonogo: rows[0].gonogo ?? null });
  } catch (e) {
    if (isMissingColumn(e)) return NextResponse.json({ gonogo: null, migrationRequired: true });
    return errorResponse(e);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body?.scores || criteria.some((key) => !Number.isInteger(body.scores[key]) || body.scores[key] < 1 || body.scores[key] > 5)) {
    return NextResponse.json({ error: "Score fit, capacity, margin and relationship from 1 to 5." }, { status: 400 });
  }
  const scores = Object.fromEntries(criteria.map((key) => [key, body.scores[key]]));
  const total = criteria.reduce((sum, key) => sum + body.scores[key], 0);
  const gonogo = { scores, total, recommendation: total >= 15 ? "go" : total >= 10 ? "review" : "no-go", rationale: typeof body.rationale === "string" ? body.rationale.slice(0, 2000) : "", updatedAt: new Date().toISOString() };
  try {
    const rows = await rest<any[]>("PATCH", "opportunities", { query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=id,gonogo`, body: { gonogo }, prefer: "return=representation" });
    if (!rows.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    return NextResponse.json({ gonogo: rows[0].gonogo ?? gonogo, saved: true });
  } catch (e) {
    if (isMissingColumn(e)) return NextResponse.json({ error: "Apply the deadline migration to save the go/no-go scores.", migrationRequired: true }, { status: 503 });
    return errorResponse(e, "Scores were not saved: ");
  }
}

function isMissingColumn(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as any).code === "PGRST204");
}
