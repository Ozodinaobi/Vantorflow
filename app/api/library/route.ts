// GET  /api/library: the signed-in user's saved answers.
// POST /api/library { question, answer }: save one approved answer.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  try {
    const rows = await rest<any[]>("GET", "vf_answer_library", {
      query: `?user_id=eq.${auth.userId}&select=*&order=updated_at.desc`,
    });
    return NextResponse.json({ entries: rows });
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
  const question = String(body?.question ?? "").trim().slice(0, 500);
  const answer = String(body?.answer ?? "").trim().slice(0, 5000);
  if (!question || !answer) return NextResponse.json({ error: "Both a question and an answer are required." }, { status: 400 });
  try {
    const rows = await rest<any[]>("POST", "vf_answer_library", {
      body: { user_id: auth.userId, question, answer },
      prefer: "return=representation",
    });
    return NextResponse.json({ entry: rows[0] ?? null }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
