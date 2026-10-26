// ONE shared readiness calculation.
// Every place that shows a readiness number (dashboard cards, opportunity page header) calls this function,
// so the number can never disagree between views.
//
// Definition:
//   mappedPct  = requirements mapped to a response section / total requirements
//   draftedPct = response sections with a non-empty draft / total sections (5)
//   score      = average of the two, rounded to a whole percent
import { SECTIONS } from "./types";

export interface ReadinessInput {
  requirements: { section: string | null }[];
  drafts: { section: string; draft: string }[];
}

export interface Readiness {
  score: number; // 0 to 100, the headline number
  total: number; // total requirements
  mapped: number; // requirements mapped to a section
  mappedPct: number;
  sectionCount: number; // always SECTIONS.length
  drafted: number; // sections with a draft
  draftedPct: number;
}

export function computeReadiness(input: ReadinessInput): Readiness {
  const total = input.requirements.length;
  const validSections = SECTIONS as readonly string[];

  // Count requirements that point at a real section name.
  const mapped = input.requirements.filter((r) => !!r.section && validSections.includes(r.section)).length;

  // Count sections that have some draft text.
  const drafted = SECTIONS.filter((s) =>
    input.drafts.some((d) => d.section === s && d.draft.trim().length > 0)
  ).length;

  const mappedFraction = total === 0 ? 0 : mapped / total;
  const draftedFraction = drafted / SECTIONS.length;
  const score = Math.round(((mappedFraction + draftedFraction) / 2) * 100);

  return {
    score,
    total,
    mapped,
    mappedPct: Math.round(mappedFraction * 100),
    sectionCount: SECTIONS.length,
    drafted,
    draftedPct: Math.round(draftedFraction * 100),
  };
}
