// GET  /api/opportunities/[id]/attachments: list attachments (metadata only).
// POST /api/opportunities/[id]/attachments: multipart form with a "file" field (max 10MB). Stores bytes in the private
//      'attachments' bucket and metadata in vf_attachments. If the bucket is missing, returns storageReady=false.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, isConfigured, ownsOpportunity, rest, UUID_RE } from "@/lib/db";
import { audit } from "@/lib/audit";

type Ctx = { params: { id: string } };
const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "attachments";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
}
function key(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    const rows = await rest<any[]>("GET", "vf_attachments", {
      query: `?opportunity_id=eq.${params.id}&user_id=eq.${auth.userId}&select=*&order=created_at.desc`,
    });
    return NextResponse.json({ attachments: rows, storageReady: await storageReady() });
  } catch (e) {
    return errorResponse(e);
  }
}

// True when the private bucket exists. Cached per server process.
let bucketChecked: boolean | null = null;
async function storageReady(): Promise<boolean> {
  if (bucketChecked !== null) return bucketChecked;
  if (!isConfigured()) return false;
  try {
    const res = await fetch(`${baseUrl()}/storage/v1/bucket/${BUCKET}`, {
      headers: { apikey: key(), Authorization: `Bearer ${key()}` },
      cache: "no-store",
    });
    bucketChecked = res.ok;
  } catch {
    bucketChecked = false;
  }
  return bucketChecked;
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Upload must be a form with a file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is over 10MB. Upload a smaller file." }, { status: 413 });

  try {
    if (!(await ownsOpportunity(auth.userId, params.id))) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    if (!(await storageReady())) {
      return NextResponse.json(
        { error: "File storage is not set up yet. Run the features migration (it creates the attachments bucket).", storageReady: false },
        { status: 503 }
      );
    }
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "file";
    const path = `${auth.userId}/${params.id}/${Date.now()}-${safeName}`;
    const up = await fetch(`${baseUrl()}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: key(), Authorization: `Bearer ${key()}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
      body: await file.arrayBuffer(),
      cache: "no-store",
    });
    if (!up.ok) return NextResponse.json({ error: "Upload failed. Try again." }, { status: 502 });
    const [row] = await rest<any[]>("POST", "vf_attachments", {
      body: { user_id: auth.userId, opportunity_id: params.id, path, name: file.name.slice(0, 200), size: file.size },
      prefer: "return=representation",
    });
    await audit(auth.userId, params.id, "attachment", { name: file.name, size: file.size });
    return NextResponse.json({ attachment: row }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Attachment was NOT saved: ");
  }
}
