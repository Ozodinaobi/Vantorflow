// SERVER ONLY. Branded transactional email template (HTML + plain-text alternative).
export const APP_URL = "https://vantorflow.com.ng";
export const LOGO_URL = `${APP_URL}/logo.png`;

export type EmailContent = {
  subject: string;
  heading: string;
  body: string; // plain text; blank lines separate paragraphs
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderHtml(c: EmailContent, unsubscribeUrl: string): string {
  const paragraphs = c.body
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#d4d4d8;">${esc(p.trim()).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const cta =
    c.ctaLabel && c.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;"><tr><td style="border-radius:10px;background:#10b981;"><a href="${esc(c.ctaUrl)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#050505;text-decoration:none;">${esc(c.ctaLabel)}</a></td></tr></table>`
      : "";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#050505;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b0b0c;border:1px solid #1f1f22;border-radius:16px;">
<tr><td style="padding:28px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO_URL}" alt="Vantorflow" width="36" height="36" style="display:block;border:0;border-radius:9px;"/></td>
<td style="vertical-align:middle;padding-left:12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#ffffff;letter-spacing:0.2px;">Vantorflow</td>
</tr></table>
</td></tr>
<tr><td style="padding:20px 32px 0 32px;">
<h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:24px;line-height:1.3;color:#ffffff;">${esc(c.heading)}</h1>
${paragraphs}
${cta}
</td></tr>
<tr><td style="padding:24px 32px 28px 32px;border-top:1px solid #1f1f22;margin-top:24px;">
<p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#71717a;">${esc(c.footerNote ?? "You are receiving this because of your relationship with Vantorflow.")}</p>
<p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">Vantorflow · <a href="${APP_URL}" style="color:#10b981;text-decoration:none;">vantorflow.com.ng</a> · <a href="${esc(unsubscribeUrl)}" style="color:#71717a;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function renderText(c: EmailContent, unsubscribeUrl: string): string {
  const parts = [c.heading, "", c.body.trim()];
  if (c.ctaLabel && c.ctaUrl) parts.push("", `${c.ctaLabel}: ${c.ctaUrl}`);
  parts.push(
    "",
    "--",
    c.footerNote ?? "You are receiving this because of your relationship with Vantorflow.",
    `Vantorflow · ${APP_URL}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  );
  return parts.join("\n");
}
