// Email-in helpers. Buyer comes from the sender's display name, else the sender's company domain, else the subject.
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "ac", "edu", "ltd", "sch"]);

export function parseBuyer(from: string, subject: string): string {
  const named = from.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/);
  if (named && named[1].trim()) return named[1].trim();
  const domain = from.match(/@([a-z0-9.-]+)/i);
  if (domain) {
    const parts = domain[1].toLowerCase().split(".").filter(Boolean);
    // shell.co.uk -> shell; acme.com -> acme
    let idx = parts.length - 2;
    if (idx > 0 && SECOND_LEVEL.has(parts[idx]) && parts[parts.length - 1].length === 2) idx -= 1;
    const name = parts[Math.max(idx, 0)] ?? parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  // "RFQ for Dangote Group office chairs" -> Dangote Group (capitalised words only, max 3)
  const fromSubject = subject.match(/\b(?:from|for)\s+((?:[A-Z][\w&.-]*)(?:\s+[A-Z][\w&.-]*){0,2})/);
  return fromSubject ? fromSubject[1].trim() : "Unknown buyer";
}
