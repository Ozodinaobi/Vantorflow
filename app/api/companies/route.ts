// GET  /api/companies: the signed-in user's companies and contractors registry.
// POST /api/companies { name, kind, contact, notes }: add one.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";
import { decodeNotes, encodeNotes, sanitizeProfile } from "@/lib/companyProfile";

const KINDS = ["Company", "Contractor", "Subcontractor", "Partner"];

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const rows = await rest<any[]>("GET", "vf_companies", {
      query: `?user_id=eq.${auth.userId}&select=*&order=name.asc`,
    });
    // Expose the decoded profile on each row; `notes` stays as the free-text part only.
    const companies = rows.map((r) => {
      const d = decodeNotes(r.notes);
      return { ...r, notes: d.text || null, profile: d.profile };
    });
    return NextResponse.json({ companies });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const name = String(body?.name ?? "").trim().slice(0, 200);
  if (!name) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  const kind = KINDS.includes(body?.kind) ? body.kind : "Company";
  const profile = sanitizeProfile(body?.profile);
  if (!profile.legalName) profile.legalName = name;
  const freeNotes = String(body?.notes ?? "").trim().slice(0, 2000);
  try {
    const rows = await rest<any[]>("POST", "vf_companies", {
      body: {
        user_id: auth.userId,
        name,
        kind,
        contact: String(body?.contact ?? "").trim().slice(0, 300) || null,
        notes: encodeNotes(profile, freeNotes),
      },
      prefer: "return=representation",
    });
    const row = rows[0];
    const d = decodeNotes(row?.notes);
    return NextResponse.json({ company: row ? { ...row, notes: d.text || null, profile: d.profile } : null }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
