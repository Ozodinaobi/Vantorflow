// PATCH /api/requirements/bulk { ids: string[], section: string | null }: remap many requirements at once.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";
import { SECTIONS } from "@/lib/types";

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string" && UUID_RE.test(x)) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Select at least one requirement." }, { status: 400 });
  if (ids.length > 500) return NextResponse.json({ error: "Too many requirements in one change (max 500)." }, { status: 400 });
  const section = body.section === null || body.section === "" ? null : body.section;
  if (section !== null && !SECTIONS.includes(section)) return NextResponse.json({ error: "Unknown response section." }, { status: 400 });
  try {
    const rows = await rest<any[]>("PATCH", "requirements", {
      query: `?id=in.(${ids.join(",")})&user_id=eq.${auth.userId}&select=id`,
      body: { section },
      prefer: "return=representation",
    });
    return NextResponse.json({ updated: rows.length });
  } catch (e) {
    return errorResponse(e, "Bulk mapping was NOT saved: ");
  }
}
