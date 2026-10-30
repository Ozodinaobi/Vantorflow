import { NextResponse } from "next/server";
import { errorResponse, rest } from "@/lib/db";
import { requireUser } from "@/lib/serverAuth";
export async function DELETE(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Passkey id is required." }, { status: 400 });
    await rest("DELETE", "vf_passkeys", { query: `?credential_id=eq.${encodeURIComponent(id)}&user_id=eq.${auth.userId}` });
    return NextResponse.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
