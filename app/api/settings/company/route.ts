import { NextResponse } from "next/server";
import { authCall, DbError, errorResponse } from "@/lib/db";
import { requireUser } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if ("error" in user) return NextResponse.json({ error: user.error }, { status: 401 });
  const response = await authCall("GET", `/admin/users/${encodeURIComponent(user.userId)}`);
  if (!response.ok) return errorResponse(new DbError("Could not load company profile.", response.status, null));
  return NextResponse.json({ profile: response.data?.user?.user_metadata?.vf_company_profile ?? { name: "", sector: "", website: "" } });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if ("error" in user) return NextResponse.json({ error: user.error }, { status: 401 });
  let body: { name?: unknown; sector?: unknown; website?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 }); }
  const profile = {
    name: typeof body.name === "string" ? body.name.trim().slice(0, 120) : "",
    sector: typeof body.sector === "string" ? body.sector.trim().slice(0, 120) : "",
    website: typeof body.website === "string" ? body.website.trim().slice(0, 240) : "",
  };
  const existing = await authCall("GET", `/admin/users/${encodeURIComponent(user.userId)}`);
  if (!existing.ok) return errorResponse(new DbError("Could not load company profile.", existing.status, null));
  const metadata = existing.data?.user?.user_metadata ?? {};
  const saved = await authCall("PATCH", `/admin/users/${encodeURIComponent(user.userId)}`, { user_metadata: { ...metadata, vf_company_profile: profile } });
  if (!saved.ok) return errorResponse(new DbError("Could not save company profile.", saved.status, null));
  return NextResponse.json({ profile });
}
