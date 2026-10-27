// Builds the response document as a .docx file in the browser, using the "docx" npm package.
import { Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from "docx";
import { Opportunity, Requirement, ResponseSection } from "./types";
import { buildPlan } from "./documentPlan";
import { PresetId } from "./documentPresets";
import { CompanyProfile } from "./companyProfile";
import { formatDate } from "./time";
import { splitWrapper, TemplateVars } from "./templates";
import { cleanForClient } from "./clean";

export async function buildDocx(
  opp: Opportunity,
  drafts: ResponseSection[],
  reqs: Requirement[],
  template?: { content: string } | null,
  preset: PresetId | null = null,
  company: { name: string; profile: CompanyProfile | null } | null = null
): Promise<Blob> {
  const plan = buildPlan(opp, drafts, reqs, preset, company);
  const children: Paragraph[] = [];

  // Optional letterhead from a template: lines before {{content}} go at the top
  const wrap = template ? splitWrapper(template.content, { title: opp.title, buyer: opp.buyer, deadline: plan.heading.deadline }) : null;
  for (const line of wrap?.header ?? []) children.push(new Paragraph({ text: line }));

  const color = plan.accentHex;
  if (plan.cover) {
    const c = plan.cover;
    children.push(new Paragraph({ children: [new TextRun({ text: c.label.toUpperCase(), bold: true, color, size: 20 })], spacing: { before: 2400, after: 240 } }));
    children.push(new Paragraph({ text: c.title, heading: HeadingLevel.TITLE }));
    children.push(new Paragraph({ children: [new TextRun({ text: `Buyer: ${c.buyer}`, bold: true })] }));
    children.push(new Paragraph({ text: `Deadline: ${c.deadline}` }));
    if (c.company) children.push(new Paragraph({ text: `Submitted by: ${c.company}` }));
    if (c.certifications.length) {
      children.push(new Paragraph({ children: [new TextRun({ text: "Certifications", bold: true, color })], spacing: { before: 240 } }));
      for (const cert of c.certifications) children.push(new Paragraph({ text: cert }));
    }
    if (c.contents.length) {
      children.push(new Paragraph({ children: [new TextRun({ text: "Contents", bold: true, color })], spacing: { before: 240 } }));
      c.contents.forEach((t, i) => children.push(new Paragraph({ text: `${i + 1}. ${t}` })));
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  } else {
    children.push(new Paragraph({ text: plan.heading.title, heading: HeadingLevel.TITLE }));
    children.push(new Paragraph({ children: [new TextRun({ text: `Buyer: ${plan.heading.buyer}`, bold: true })] }));
    children.push(new Paragraph({ text: `Deadline: ${plan.heading.deadline}` }));
  }

  const heading = (text: string) =>
    new Paragraph({ children: [new TextRun({ text, bold: true, color })], heading: HeadingLevel.HEADING_1 });

  for (const block of plan.blocks) {
    if (block.kind === "credentials") {
      children.push(heading(block.title));
      for (const line of block.lines) children.push(new Paragraph({ text: line }));
      continue;
    }
    children.push(heading(block.title));
    if (block.missing) {
      children.push(new Paragraph({ children: [new TextRun({ text: "This section will be provided in the final submission.", italics: true })] }));
      continue;
    }
    for (const para of block.paragraphs) children.push(new Paragraph({ text: para }));
  }

  children.push(heading("Appendix: Requirement traceability"));
  for (const line of plan.appendix) children.push(new Paragraph({ text: line }));

  for (const line of wrap?.footer ?? []) children.push(new Paragraph({ text: line }));
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

// Triggers a browser download of a Blob. Throws if the file is empty or the browser blocks the download,
// so callers can show an error instead of failing silently.
export function downloadBlob(blob: Blob, filename: string): void {
  if (!blob || blob.size === 0) throw new Error("the file came out empty");
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
