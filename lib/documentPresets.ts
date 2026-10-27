// Document templates for the response (PDF and .docx). Client and server safe.
// A preset changes the cover page, the order of the sections, the tone the drafts are written in,
// and the heading colour of the output. "Plain" (no preset) keeps the original layout.
import { SECTIONS } from "./types";

export const COMPANY_CREDENTIALS = "__company_credentials__";

export const PRESET_IDS = ["standard", "quality", "price"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export interface DocPreset {
  id: PresetId;
  name: string;
  blurb: string;
  coverLabel: string;
  // Section order. Contains each of SECTIONS once, plus COMPANY_CREDENTIALS where the credentials block goes.
  order: readonly string[];
  // Written into the drafting prompt so the wording matches the template.
  tone: string;
  // Heading colour, as hex (for .docx) and 0-1 RGB (for pdf-lib).
  accentHex: string;
  accentRgb: [number, number, number];
  // Cover extras: "certifications" lists the company certifications on the cover, "contents" lists the section order.
  coverExtra: "none" | "certifications" | "contents";
}

export const PLAIN_ACCENT_HEX = "0F7350";
export const PLAIN_ACCENT_RGB: [number, number, number] = [0.06, 0.45, 0.32];

export const PRESETS: Record<PresetId, DocPreset> = {
  standard: {
    id: "standard",
    name: "Standard tender response",
    blurb: "Formal and complete. Sections in the buyer's usual order, credentials before the appendix.",
    coverLabel: "Response to tender",
    order: [...SECTIONS.slice(0, 4), SECTIONS[4], COMPANY_CREDENTIALS],
    tone: "Formal, neutral and complete. Answer each requirement in order and keep every claim specific and checkable.",
    accentHex: "1E3A5F",
    accentRgb: [0.12, 0.23, 0.37],
    coverExtra: "none",
  },
  quality: {
    id: "quality",
    name: "Quality-led",
    blurb: "Leads with assurance, certifications and evidence. Credentials right after the summary.",
    coverLabel: "Quality and assurance response",
    order: ["Executive Summary", COMPANY_CREDENTIALS, "Compliance", "Technical Solution", "Delivery Plan", "Pricing"],
    tone: "Measured and evidence-led. Lead with quality, assurance and the controls, standards and track record behind each claim. Name the certification or case study where it supports a point.",
    accentHex: "0F7350",
    accentRgb: [0.06, 0.45, 0.32],
    coverExtra: "certifications",
  },
  price: {
    id: "price",
    name: "Price-led",
    blurb: "Leads with value for money and the commercial case. Pricing comes straight after the summary.",
    coverLabel: "Commercial response",
    order: ["Executive Summary", "Pricing", "Delivery Plan", "Technical Solution", "Compliance", COMPANY_CREDENTIALS],
    tone: "Concise and commercial. Lead with value for money, transparent pricing logic and cost-efficient delivery. No padding, no marketing language.",
    accentHex: "8A5410",
    accentRgb: [0.54, 0.33, 0.06],
    coverExtra: "contents",
  },
};

export function isPresetId(v: unknown): v is PresetId {
  return typeof v === "string" && (PRESET_IDS as readonly string[]).includes(v);
}

// Section order for a preset, or the original order when no preset is chosen.
export function orderFor(preset: PresetId | null): readonly string[] {
  return preset ? PRESETS[preset].order : SECTIONS;
}
