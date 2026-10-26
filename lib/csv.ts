// Minimal CSV parser for requirement import: handles quoted fields, escaped quotes, CRLF, and blank lines.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export const REQ_CATEGORIES = ["Technical", "Commercial", "Compliance", "Delivery", "Other"] as const;

// Turns "number,description,category" rows into requirement drafts. Header row is optional.
export function requirementsFromCsv(text: string): { requirements: { number: number; text: string; category: string }[]; skipped: number } {
  const rows = parseCsv(text);
  let skipped = 0;
  const out: { number: number; text: string; category: string }[] = [];
  rows.forEach((cols, i) => {
    const [num, desc, cat] = cols.map((c) => c.trim());
    if (i === 0 && /^(number|no\.?|#)$/i.test(num ?? "") && /^(description|requirement|text)$/i.test(desc ?? "")) return;
    if (!desc) { skipped++; return; }
    const category = REQ_CATEGORIES.find((c) => c.toLowerCase() === (cat ?? "").toLowerCase()) ?? "Other";
    out.push({ number: Number(num) || out.length + 1, text: desc, category });
  });
  return { requirements: out, skipped };
}
