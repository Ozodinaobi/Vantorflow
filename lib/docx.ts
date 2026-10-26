// Builds the response document as a .docx file in the browser, using the "docx" npm package.
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { SECTIONS, Opportunity, Requirement, ResponseSection } from "./types";
import { formatDate } from "./time";
import { splitWrapper, TemplateVars } from "./templates";

export async function buildDocx(
  opp: Opportunity,
  drafts: ResponseSection[],
  reqs: Requirement[],
  template?: { content: string } | null
): Promise<Blob> {
  const children: Paragraph[] = [];

  // Optional letterhead from a template: lines before {{content}} go at the top
  const wrap = template ? splitWrapper(template.content, { title: opp.title, buyer: opp.buyer, deadline: formatDate(opp.deadline) }) : null;
  for (const line of wrap?.header ?? []) children.push(new Paragraph({ text: line }));

  // Cover details
  children.push(new Paragraph({ text: opp.title, heading: HeadingLevel.TITLE }));
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

  for (const line of wrap?.footer ?? []) children.push(new Paragraph({ text: line }));
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
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
