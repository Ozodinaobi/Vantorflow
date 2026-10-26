// One-page opportunity summary PDF (title, buyer, deadline, value, stage, readiness, requirement counts).
// Browser-only, uses pdf-lib like the full response PDF.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface SummaryInput {
  title: string;
  buyer: string;
  deadline: string;
  value: string | number | null;
  stage: string;
  readiness: string;
  requirements: number;
  mapped: number;
}

// WinAnsi only: replace characters the standard font cannot draw.
function clean(s: string): string {
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

export async function buildSummaryPdf(input: SummaryInput): Promise<Blob> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.39, 0.45, 0.55);

  let y = 780;
  page.drawText("Opportunity summary", { x: 56, y, size: 11, font: regular, color: muted });
  y -= 28;
  page.drawText(clean(input.title || "Untitled"), { x: 56, y, size: 20, font: bold, color: ink, maxWidth: 483 });
  y -= 40;

  const rows: [string, string][] = [
    ["Buyer", input.buyer || "not set"],
    ["Deadline", input.deadline || "not set"],
    ["Estimated value", input.value === null || input.value === "" ? "not set" : String(input.value)],
    ["Stage", input.stage || "not set"],
    ["Readiness", input.readiness],
    ["Requirements", `${input.requirements} extracted, ${input.mapped} mapped to a section`],
  ];
  for (const [label, value] of rows) {
    page.drawText(label, { x: 56, y, size: 10, font: bold, color: muted });
    page.drawText(clean(value), { x: 200, y, size: 11, font: regular, color: ink, maxWidth: 339 });
    y -= 26;
  }

  y -= 14;
  page.drawText(`Generated ${new Date().toISOString().slice(0, 10)} by Vantorflow`, { x: 56, y, size: 9, font: regular, color: muted });

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
