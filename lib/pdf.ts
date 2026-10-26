// Builds the response document as a PDF in the browser, using pdf-lib (same content as the .docx).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SECTIONS, Opportunity, Requirement, ResponseSection } from "./types";
import { formatDate } from "./time";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;
const LINE = 15;

// Wraps text to a width using the font's measured widths (WinAnsi only, so non-Latin characters are replaced).
function wrap(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxW: number): string[] {
  const clean = text.replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "?");
  const out: string[] = [];
  for (const para of clean.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

export async function buildPdf(opp: Opportunity, drafts: ResponseSection[], reqs: Requirement[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const maxW = PAGE_W - MARGIN * 2;

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensure = (h: number) => {
    if (y - h < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };
  const write = (text: string, font: typeof serif, size: number, color = rgb(0.05, 0.05, 0.05), gap = 4) => {
    for (const line of wrap(text, font, size, maxW)) {
      ensure(LINE);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color });
      y -= LINE;
    }
    y -= gap;
  };

  write(opp.title, serifBold, 22, rgb(0.04, 0.04, 0.04), 8);
  write(`Buyer: ${opp.buyer}`, sans, 11, rgb(0.2, 0.2, 0.2), 2);
  write(`Deadline: ${formatDate(opp.deadline)}`, sans, 11, rgb(0.2, 0.2, 0.2), 14);

  for (const section of SECTIONS) {
    write(section, serifBold, 15, rgb(0.06, 0.45, 0.32), 6);
    const draft = drafts.find((d) => d.section === section)?.draft?.trim();
    if (!draft) {
      write("[Draft not generated yet]", serif, 11, rgb(0.4, 0.4, 0.4), 10);
      continue;
    }
    for (const para of draft.split(/\n\s*\n/)) {
      if (para.trim()) write(para.trim(), serif, 11, rgb(0.1, 0.1, 0.1), 8);
    }
    y -= 6;
  }

  write("Appendix: Requirement traceability", serifBold, 15, rgb(0.06, 0.45, 0.32), 6);
  for (const r of [...reqs].sort((a, b) => a.number - b.number)) {
    write(`Requirement ${r.number} (${r.category}): ${r.text}. Mapped to: ${r.section ?? "not mapped"}.`, sans, 9.5, rgb(0.2, 0.2, 0.2), 4);
  }

  const bytes = await pdf.save();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "application/pdf" });
}
