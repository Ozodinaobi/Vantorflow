// Requirement categorisation confidence. The database stores no model score, so this is a transparent,
// deterministic check: how many category keywords appear in the requirement text.
// high = 2+ matches for the chosen category, medium = 1 match, low = none (the category is a guess).
import { CATEGORIES } from "./types";

const KEYWORDS: Record<string, RegExp> = {
  Technical: /\b(api|system|software|integrat\w*|architecture|database|security|server|cloud|interface|platform|data|code|module|hardware|network|technical|specification|performance)\b/gi,
  Commercial: /\b(price|pricing|cost|fee|payment|invoice|budget|value|currency|commercial|rate|discount|tender|contract value|quote|warranty)\b/gi,
  Compliance: /\b(comply|compliance|regulat\w*|certif\w*|iso|gdpr|policy|policies|legal|audit|standard|mandatory|law|insurance|accreditation)\b/gi,
  Delivery: /\b(deliver\w*|timeline|schedule|milestone|deadline|onsite|on-site|install\w*|training|support|sla|mobilis\w*|mobiliz\w*|lead time|days|weeks)\b/gi,
};

export type ConfidenceLevel = "high" | "medium" | "low";

export function categoryConfidence(text: string, category: string): { level: ConfidenceLevel; matches: number } {
  if (!CATEGORIES.includes(category) || category === "Other" || !KEYWORDS[category]) {
    return { level: "low", matches: 0 };
  }
  const found = text.match(KEYWORDS[category]) ?? [];
  const matches = found.length;
  return { level: matches >= 2 ? "high" : matches === 1 ? "medium" : "low", matches };
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: "High match",
  medium: "Medium match",
  low: "Low match",
};
