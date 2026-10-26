// GET /api/attachments/[id]: a short-lived signed download URL for one attachment (owner only).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE, isConfigured } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    const rows = await rest<any[]>("GET", "vf_attachments", {
      query: `?id=eq.${params.id}&user_id=eq.${auth.userId}&select=*&limit=1`,
    });
    if (!rows.length) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    if (!isConfigured()) return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const res = await fetch(`${base}/storage/v1/object/sign/attachments/${rows[0].path}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 300 }),
      cache: "no-store",
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data?.signedURL) return NextResponse.json({ error: "Could not prepare the download." }, { status: 502 });
    return NextResponse.json({ url: `${base}/storage/v1${data.signedURL}`, name: rows[0].name });
  } catch (e) {
    return errorResponse(e);
  }
}
