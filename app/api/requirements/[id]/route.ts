// PATCH /api/requirements/[id]: map one requirement to a response section (or clear it).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";
import { SECTIONS } from "@/lib/types";
import { toRequirements } from "@/lib/mappers";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const section = body.section === null || body.section === "" ? null : body.section;
  if (section !== null && !SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Unknown response section." }, { status: 400 });
  }
  try {
    const rows = await rest<any[]>("PATCH", "requirements", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}`,
      body: { section },
      prefer: "return=representation",
    });
    if (!rows.length) return NextResponse.json({ error: "Mapping was NOT saved: requirement not found." }, { status: 404 });
    // Number and coverage come from the whole opportunity's requirement list.
    const all = await rest<any[]>("GET", "requirements", {
      query: `?opportunity_id=eq.${rows[0].opportunity_id}&user_id=eq.${auth.userId}&select=*`,
    });
    const numbered = toRequirements(all).find((r) => r.id === params.id);
    return NextResponse.json({ requirement: numbered ?? toRequirements(rows)[0] });
  } catch (e) {
    return errorResponse(e, "Mapping was NOT saved: ");
  }
}
