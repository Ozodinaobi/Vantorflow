// GET   /api/notifications: your notifications, newest first, plus unread count. Runs deadline checks on load.
// PATCH /api/notifications { ids?: string[], all?: boolean }: mark read.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest, UUID_RE } from "@/lib/db";
import { deadlineReminders, lagosToday } from "@/lib/notify";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    await deadlineReminders(auth.userId, lagosToday());
    const rows = await rest<any[]>("GET", "vf_notifications", {
      query: `?user_id=eq.${auth.userId}&select=*&order=created_at.desc&limit=100`,
    });
    const unread = rows.filter((r) => !r.read).length;
    return NextResponse.json({ notifications: rows, unread });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  try {
    if (body?.all === true) {
      await rest("PATCH", "vf_notifications", { query: `?user_id=eq.${auth.userId}&read=eq.false`, body: { read: true } });
    } else if (Array.isArray(body?.ids)) {
      const ids = body.ids.filter((x: unknown) => typeof x === "string" && UUID_RE.test(x)).slice(0, 200);
      if (ids.length) {
        await rest("PATCH", "vf_notifications", { query: `?user_id=eq.${auth.userId}&id=in.(${ids.join(",")})`, body: { read: true } });
      }
    } else {
      return NextResponse.json({ error: "Send ids or all." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
