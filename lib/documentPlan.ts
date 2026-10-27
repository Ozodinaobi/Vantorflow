// Turns an opportunity, its drafts, the chosen preset and the company profile into one ordered plan.
// Both the PDF and the .docx builders render this plan, so the two files always match.
// Client and server safe.
import { Opportunity, Requirement, ResponseSection } from "./types";
import { formatDate } from "./time";
import { cleanForClient } from "./clean";
import { COMPANY_CREDENTIALS, PRESETS, PresetId, PLAIN_ACCENT_HEX, PLAIN_ACCENT_RGB, orderFor } from "./documentPresets";
import { CompanyProfile, hasProfile, profileLines } from "./companyProfile";

export type PlanBlock =
  | { kind: "section"; title: string; paragraphs: string[]; missing: boolean }
  | { kind: "credentials"; title: string; lines: string[] };

export interface DocumentPlan {
  presetName: string | null;
  accentHex: string;
  accentRgb: [number, number, number];
  // Cover page. Only drawn when a preset is chosen.
  cover: null | {
    label: string;
    title: string;
    buyer: string;
    deadline: string;
    company: string;
    certifications: string[];
    contents: string[];
  };
  // Title block at the top of the document (plain layout), or the first page after the cover.
  heading: { title: string; buyer: string; deadline: string };
  blocks: PlanBlock[];
  appendix: string[];
}

export function buildPlan(
  opp: Opportunity,
  drafts: ResponseSection[],
  reqs: Requirement[],
  preset: PresetId | null,
  company: { name: string; profile: CompanyProfile | null } | null
): DocumentPlan {
  const p = preset ? PRESETS[preset] : null;
  const deadline = formatDate(opp.deadline);
  const profile = company?.profile && hasProfile(company.profile) ? company.profile : null;
  const order = orderFor(preset);

  const blocks: PlanBlock[] = [];
  for (const key of order) {
    if (key === COMPANY_CREDENTIALS) {
      if (profile) blocks.push({ kind: "credentials", title: "Company credentials", lines: profileLines(profile) });
      continue;
    }
    const draft = cleanForClient(drafts.find((d) => d.section === key)?.draft ?? "");
    blocks.push({
      kind: "section",
      title: key,
      paragraphs: draft ? draft.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : [],
      missing: !draft,
    });
  }
  // The plain layout has no preset order, so credentials go in just before the appendix.
  if (!preset && profile) blocks.push({ kind: "credentials", title: "Company credentials", lines: profileLines(profile) });

  const contents = blocks.map((b) => b.title);
  const cover = p
    ? {
        label: p.coverLabel,
        title: opp.title,
        buyer: opp.buyer,
        deadline,
        company: company?.name ?? "",
        certifications: p.coverExtra === "certifications" && profile ? profile.certifications : [],
        contents: p.coverExtra === "contents" ? contents : [],
      }
    : null;

  return {
    presetName: p ? p.name : null,
    accentHex: p ? p.accentHex : PLAIN_ACCENT_HEX,
    accentRgb: p ? p.accentRgb : PLAIN_ACCENT_RGB,
    cover,
    heading: { title: opp.title, buyer: opp.buyer, deadline },
    blocks,
    appendix: [...reqs].sort((a, b) => a.number - b.number).map((r) => `Requirement ${r.number} (${r.category}): ${r.text}.`),
  };
}
