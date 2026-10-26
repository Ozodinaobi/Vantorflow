// Pure qualification rules. Shared by client (live preview) and server (saved verdict).
// Seven fields are scored 1 to 5, where 5 is always the better outcome (so for risk fields 5 means lowest risk).
// The eighth field, notes, is free text.

export const QUAL_FIELDS = [
  { key: "capability_fit", label: "Capability fit", hint: "Can we deliver this scope with what we already do?" },
  { key: "past_performance", label: "Past performance", hint: "Have we delivered similar work for this kind of buyer?" },
  { key: "resources", label: "Resources", hint: "People, time and equipment we can commit before the deadline." },
  { key: "compliance_risk", label: "Compliance risk", hint: "5 = lowest risk. Mandatory certifications, legal and regulatory conditions." },
  { key: "relationship", label: "Relationship", hint: "Existing relationship with the buyer, or with the incumbent." },
  { key: "pricing_position", label: "Pricing position", hint: "Can we price competitively and still make margin?" },
  { key: "known_risks", label: "Known risks", hint: "5 = few known risks. Delivery, dependency and scope risks." },
] as const;

export type QualKey = (typeof QUAL_FIELDS)[number]["key"];
export const QUAL_KEYS: string[] = QUAL_FIELDS.map((f) => f.key);

export type Verdict = "Qualified" | "Review" | "Declined";

export interface QualificationResult {
  verdict: Verdict;
  average: number; // 1 to 5, one decimal
  lowest: number;
  reason: string; // one plain sentence explaining the verdict
}

// Rules (kept simple so the owner can read them):
//   Declined  if any field is 1, or the average is below 2.5
//   Qualified if the average is 3.8 or more and no field is below 3
//   Review    otherwise
export function computeVerdict(scores: Record<QualKey, number>): QualificationResult {
  const values = QUAL_FIELDS.map((f) => scores[f.key]);
  const sum = values.reduce((a, b) => a + b, 0);
  const average = Math.round((sum / values.length) * 10) / 10;
  const lowest = Math.min(...values);
  const weakest = QUAL_FIELDS.find((f) => scores[f.key] === lowest)!.label;

  if (lowest === 1 || average < 2.5) {
    return {
      verdict: "Declined",
      average,
      lowest,
      reason: `Average ${average} with a weak area (${weakest}). Declining is the safer call.`,
    };
  }
  if (average >= 3.8 && lowest >= 3) {
    return { verdict: "Qualified", average, lowest, reason: `Average ${average}, no area below 3. Go ahead.` };
  }
  return {
    verdict: "Review",
    average,
    lowest,
    reason: `Average ${average}. Check ${weakest} (score ${lowest}) before committing.`,
  };
}
