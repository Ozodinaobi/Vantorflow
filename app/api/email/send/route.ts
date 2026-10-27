// POST /api/email/send. SERVER ONLY. Sends a branded email through Resend.
// Body: { from: "frank"|"admin"|"support"|"service", to: string|string[], subject, heading?, body, ctaLabel?, ctaUrl?, priority?: "high"|"normal"|"low", replyTo?, unsubscribeUrl? }
// Requires env RESEND_API_KEY (set in Vercel project settings, never in code).
import { NextResponse } from "next/server";
import { isSenderLocalpart, senderAddress, SENDER_NAME } from "@/lib/email/senders";
import { renderHtml, renderText, APP_URL, type EmailContent } from "@/lib/email/template";
import { requireUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

const RESEND_URL = "https://api.resend.com/emails";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Priority = "high" | "normal" | "low";

function priorityHeaders(p: Priority): Record<string, string> {
  if (p === "high") return { "X-Priority": "1", "X-MSMail-Priority": "High", Importance: "High" };
  if (p === "low") return { "X-Priority": "5", "X-MSMail-Priority": "Low", Importance: "Low" };
  return { "X-Priority": "3", Importance: "Normal" };
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Email sending is not configured (RESEND_API_KEY missing)." }, { status: 500 });

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (!isSenderLocalpart(b?.from)) {
    return NextResponse.json({ error: "from must be one of frank, admin, support, service." }, { status: 400 });
  }
  const toList: string[] = (Array.isArray(b.to) ? b.to : [b.to]).filter((x: unknown) => typeof x === "string");
  if (toList.length === 0 || toList.length > 50 || !toList.every((x) => EMAIL_RE.test(x))) {
    return NextResponse.json({ error: "to must be one or more valid email addresses (max 50)." }, { status: 400 });
  }
  if (typeof b.subject !== "string" || !b.subject.trim() || typeof b.body !== "string" || !b.body.trim()) {
    return NextResponse.json({ error: "subject and body are required." }, { status: 400 });
  }
  const priority: Priority = b.priority === "high" || b.priority === "low" ? b.priority : "normal";
  const from = senderAddress(b.from);
  const unsubscribeUrl: string =
    typeof b.unsubscribeUrl === "string" && /^https:\/\//.test(b.unsubscribeUrl)
      ? b.unsubscribeUrl
      : `${APP_URL}/unsubscribe?email=${encodeURIComponent(toList[0])}`;

  const content: EmailContent = {
    subject: b.subject.trim(),
    heading: typeof b.heading === "string" && b.heading.trim() ? b.heading.trim() : b.subject.trim(),
    body: b.body,
    ctaLabel: typeof b.ctaLabel === "string" ? b.ctaLabel : undefined,
    ctaUrl: typeof b.ctaUrl === "string" && /^https:\/\//.test(b.ctaUrl) ? b.ctaUrl : undefined,
    footerNote: typeof b.footerNote === "string" ? b.footerNote : undefined,
  };

  const payload: Record<string, unknown> = {
    from: `${SENDER_NAME} <${from}>`,
    to: toList,
    subject: content.subject,
    html: renderHtml(content, unsubscribeUrl),
    text: renderText(content, unsubscribeUrl),
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${from}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      ...priorityHeaders(priority),
    },
    tags: [{ name: "priority", value: priority }],
  };
  if (typeof b.replyTo === "string" && EMAIL_RE.test(b.replyTo)) payload.reply_to = b.replyTo;

  let res: Response;
  try {
    res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the email service." }, { status: 502 });
  }
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ error: data?.message || `Email send failed (HTTP ${res.status}).` }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: data?.id ?? null, from });
}
