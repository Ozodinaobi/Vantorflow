// Builds the response document as a .docx file in the browser, using the "docx" npm package.
import { Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageNumber, Paragraph, TextRun, AlignmentType, TabStopPosition, TabStopType } from "docx";
import { formatDate } from "./time";
import { SECTIONS, Opportunity, Requirement, ResponseSection } from "./types";

async function loadLogo(): Promise<Uint8Array> {
  const response = await fetch("/logo.png");
  if (!response.ok) throw new Error("The Vantorflow logo could not be loaded.");
  return new Uint8Array(await response.arrayBuffer());
}

export async function buildDocx(
  opp: Opportunity,
  drafts: ResponseSection[],
  reqs: Requirement[],
  template: "branded" | "plain" = "branded"
): Promise<Blob> {
  const children: Paragraph[] = [];

  // Cover details
  children.push(new Paragraph({ text: opp.title, heading: HeadingLevel.TITLE }));
  if (template === "branded") {
    children.push(new Paragraph({ children: [new TextRun({ text: "Vantorflow Branded Proposal", bold: true, color: "10B981" })] }));
  }
  children.push(new Paragraph({ children: [new TextRun({ text: `Buyer: ${opp.buyer}`, bold: true })] }));
  children.push(new Paragraph({ text: `Deadline: ${formatDate(opp.deadline)}` }));

  // One heading per response section, then the draft text (split into paragraphs)
  for (const section of SECTIONS) {
    children.push(new Paragraph({ text: section, heading: HeadingLevel.HEADING_1 }));
    const draft = drafts.find((d) => d.section === section)?.draft?.trim();
    if (!draft) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: "[Draft not generated yet]", italics: true })] })
      );
      continue;
    }
    for (const para of draft.split(/\n\s*\n/)) {
      if (para.trim()) children.push(new Paragraph({ text: para.trim() }));
    }
  }

  // Appendix: every requirement and the section it was mapped to
  children.push(new Paragraph({ text: "Appendix: Requirement traceability", heading: HeadingLevel.HEADING_1 }));
  for (const r of [...reqs].sort((a, b) => a.number - b.number)) {
    children.push(
      new Paragraph({
        text: `Requirement ${r.number} (${r.category}): ${r.text}. Mapped to: ${r.section ?? "not mapped"}.`,
      })
    );
  }

  const logoBytes = template === "branded" ? await loadLogo() : undefined;
  const header = template === "branded" && logoBytes ? new Header({
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      border: { bottom: { color: "10B981", size: 8, space: 6, style: "single" } },
      children: [new ImageRun({ data: logoBytes, transformation: { width: 42, height: 42 } })],
    })],
  }) : undefined;
  const footer = template === "branded" ? new Footer({
    children: [new Paragraph({
      border: { top: { color: "10B981", size: 4, space: 6, style: "single" } },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: "Vantorflow", color: "10B981", bold: true }),
        new TextRun({ text: " Page " }),
        new TextRun({ children: [PageNumber.CURRENT] }),
      ],
    })],
  }) : undefined;
  const doc = new Document({ sections: [{ headers: header ? { default: header } : undefined, footers: footer ? { default: footer } : undefined, children }] });
  // Packer resolves only after all ZIP entries are finalized. Convert the completed
  // Blob to bytes before returning so the download never races object-URL cleanup.
  const packed = await Packer.toBlob(doc);
  const bytes = await packed.arrayBuffer();
  if (!bytes.byteLength) throw new Error("Document generation returned no data.");
  return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export async function buildPdf(
  opp: Opportunity,
  drafts: ResponseSection[],
  reqs: Requirement[],
  template: "branded" | "plain" = "branded"
): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = rgb(16 / 255, 185 / 255, 129 / 255);
  const margin = 56;
  const fontSize = 10;
  const lineHeight = 15;
  let page = pdf.addPage();
  let y = page.getHeight() - margin;
  const ensureSpace = (height: number) => {
    if (y - height < margin) {
      page = pdf.addPage();
      y = page.getHeight() - margin;
    }
  };
  const linesFor = (text: string, maxWidth: number, face = font) => {
    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (face.widthOfTextAtSize(candidate, fontSize) > maxWidth && line) {
          lines.push(line);
          line = word;
        } else line = candidate;
      }
      lines.push(line);
    }
    return lines;
  };
  const addText = (text: string, options: { heading?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    const face = options.heading ? bold : font;
    const size = options.heading ? 15 : fontSize;
    const lines = linesFor(text, page.getWidth() - margin * 2, face);
    for (const line of lines) {
      ensureSpace(options.heading ? 24 : lineHeight);
      page.drawText(line, { x: margin, y, size, font: face, color: options.color ?? rgb(0.08, 0.08, 0.08) });
      y -= options.heading ? 22 : lineHeight;
    }
    y -= options.heading ? 6 : 3;
  };
  addText(opp.title, { heading: true, color: accent });
  if (template === "branded") addText("Vantorflow Branded Proposal", { heading: true, color: accent });
  addText(`Buyer: ${opp.buyer}`);
  addText(`Deadline: ${formatDate(opp.deadline)}`);
  for (const section of SECTIONS) {
    addText(section, { heading: true, color: accent });
    const draft = drafts.find((item) => item.section === section)?.draft?.trim();
    if (draft) addText(draft.replace(/\\r/g, ""));
    else addText("Draft not generated yet");
  }
  addText("Appendix: Requirement traceability", { heading: true, color: accent });
  for (const requirement of [...reqs].sort((a, b) => a.number - b.number)) {
    addText(`Requirement ${requirement.number} (${requirement.category}): ${requirement.text}. Mapped to: ${requirement.section ?? "not mapped"}.`);
  }
  const bytes = await pdf.save({ useObjectStreams: false });
  if (!bytes.byteLength) throw new Error("PDF generation returned no data.");
  const pdfBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(pdfBuffer).set(bytes);
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

// Triggers a browser download of a Blob.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
