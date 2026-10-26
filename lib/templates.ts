// Template wrappers for generated documents. Placeholders: {{title}} {{buyer}} {{deadline}} {{company}} {{date}}.
export interface TemplateVars {
  title: string;
  buyer: string;
  deadline: string;
  company?: string;
}

// Replace each {{key}} with its value. Unknown placeholders are left visible so nothing silently disappears.
export function fillTemplate(content: string, vars: TemplateVars): string {
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric" }).format(new Date());
  const map: Record<string, string> = {
    title: vars.title,
    buyer: vars.buyer,
    deadline: vars.deadline,
    company: vars.company ?? "",
    date,
  };
  return content.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, key: string) => {
    const k = key.toLowerCase();
    return k in map ? map[k] : whole;
  });
}

// Splits a template at the {{content}} marker: lines before it are the letterhead, lines after it the footer.
// Without a marker the whole template is treated as letterhead.
export function splitWrapper(content: string, vars: TemplateVars): { header: string[]; footer: string[] } {
  const filled = fillTemplate(content, vars);
  const idx = filled.indexOf("{{content}}");
  const before = idx >= 0 ? filled.slice(0, idx) : filled;
  const after = idx >= 0 ? filled.slice(idx + "{{content}}".length) : "";
  const clean = (t: string) => t.split(/\n/).map((l) => l.trimEnd());
  return { header: clean(before).filter((l, i, a) => l !== "" || (i > 0 && i < a.length - 1)), footer: clean(after).filter((l) => l !== "") };
}
