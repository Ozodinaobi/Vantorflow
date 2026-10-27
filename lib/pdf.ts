// Builds the response document as a PDF in the browser, using pdf-lib (same content as the .docx).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Opportunity, Requirement, ResponseSection } from "./types";
import { buildPlan } from "./documentPlan";
import { PresetId } from "./documentPresets";
import { CompanyProfile } from "./companyProfile";
import { formatDate } from "./time";
import { splitWrapper } from "./templates";
import { cleanForClient } from "./clean";

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

export async function buildPdf(
  opp: Opportunity,
  drafts: ResponseSection[],
  reqs: Requirement[],
  template?: { content: string } | null,
  preset: PresetId | null = null,
  company: { name: string; profile: CompanyProfile | null } | null = null
): Promise<Blob> {
  const plan = buildPlan(opp, drafts, reqs, preset, company);
  const accent = rgb(plan.accentRgb[0], plan.accentRgb[1], plan.accentRgb[2]);
  const pdf = await PDFDocument.create();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const maxW = PAGE_W - MARGIN * 2;

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

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

  // Cover page, only when a preset is chosen.
  if (plan.cover) {
    const c = plan.cover;
    y = PAGE_H - 220;
    write(c.label.toUpperCase(), sans, 10, accent, 12);
    write(c.title, serifBold, 26, rgb(0.04, 0.04, 0.04), 12);
    write(`Buyer: ${c.buyer}`, sans, 12, rgb(0.2, 0.2, 0.2), 2);
    write(`Deadline: ${c.deadline}`, sans, 12, rgb(0.2, 0.2, 0.2), 2);
    if (c.company) write(`Submitted by: ${c.company}`, sans, 12, rgb(0.2, 0.2, 0.2), 14);
    if (c.certifications.length) {
      write("Certifications", serifBold, 12, accent, 4);
      for (const cert of c.certifications) write(cert, serif, 11, rgb(0.1, 0.1, 0.1), 2);
      y -= 10;
    }
    if (c.contents.length) {
      write("Contents", serifBold, 12, accent, 4);
      c.contents.forEach((t, i) => write(`${i + 1}. ${t}`, serif, 11, rgb(0.1, 0.1, 0.1), 2));
    }
    newPage();
  } else {
    write(plan.heading.title, serifBold, 22, rgb(0.04, 0.04, 0.04), 8);
    write(`Buyer: ${plan.heading.buyer}`, sans, 11, rgb(0.2, 0.2, 0.2), 2);
    write(`Deadline: ${plan.heading.deadline}`, sans, 11, rgb(0.2, 0.2, 0.2), 14);
  }

  for (const block of plan.blocks) {
    if (block.kind === "credentials") {
      write(block.title, serifBold, 15, accent, 6);
      for (const line of block.lines) write(line, serif, 11, rgb(0.1, 0.1, 0.1), 4);
      y -= 6;
      continue;
    }
    write(block.title, serifBold, 15, accent, 6);
    if (block.missing) {
      write("This section will be provided in the final submission.", serif, 11, rgb(0.4, 0.4, 0.4), 10);
      continue;
    }
    for (const para of block.paragraphs) write(para, serif, 11, rgb(0.1, 0.1, 0.1), 8);
    y -= 6;
  }

  write("Appendix: Requirement traceability", serifBold, 15, accent, 6);
  for (const line of plan.appendix) write(line, sans, 9.5, rgb(0.2, 0.2, 0.2), 4);

  const bytes = await pdf.save();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: "application/pdf" });
}
