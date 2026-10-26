// GET /api/search?q=...: searches your opportunities, requirements, library answers and companies (ilike, user-scoped).
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";
import { errorResponse, rest } from "@/lib/db";

// Escape the characters PostgREST and ilike treat specially so user input stays literal.
function pattern(q: string): string {
  return `%${q.replace(/[%_*,()]/g, " ").trim()}%`;
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ q, results: [] });
  const p = pattern(q);
  const uid = `user_id=eq.${auth.userId}`;
  try {
    const [opps, reqs, lib, companies] = await Promise.all([
      rest<any[]>("GET", "opportunities", { query: `?${uid}&select=id,title,buyer,status&or=(title.ilike.${p},buyer.ilike.${p})&limit=20` }),
      rest<any[]>("GET", "requirements", { query: `?${uid}&select=id,opportunity_id,text,category&text=ilike.${p}&limit=20` }),
      rest<any[]>("GET", "vf_answer_library", { query: `?${uid}&select=id,question,answer&or=(question.ilike.${p},answer.ilike.${p})&limit=20` }),
      rest<any[]>("GET", "vf_companies", { query: `?${uid}&select=id,name,kind&name=ilike.${p}&limit=20` }),
    ]);
    const results = [
      ...opps.map((o) => ({ type: "opportunity", id: o.id, title: o.title, subtitle: `${o.buyer ?? ""} ${o.status ? "· " + o.status : ""}`.trim(), href: `/dashboard/${o.id}` })),
      ...reqs.map((r) => ({ type: "requirement", id: r.id, title: `Requirement: ${r.text}`, subtitle: r.category, href: `/dashboard/${r.opportunity_id}` })),
      ...lib.map((a) => ({ type: "library", id: a.id, title: a.question, subtitle: String(a.answer).slice(0, 120), href: "/dashboard/library" })),
      ...companies.map((c) => ({ type: "company", id: c.id, title: c.name, subtitle: c.kind, href: "/dashboard/companies" })),
    ];
    return NextResponse.json({ q, results });
  } catch (e) {
    return errorResponse(e);
  }
}
