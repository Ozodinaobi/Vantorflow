// Shared constants and row types. Keep these in sync with supabase/migrations/0001_vantorflow_init.sql.

// Pipeline stages an opportunity moves through, in order.
export const STAGES = [
  "Intake",
  "Analysis",
  "Requirements",
  "Response",
  "Approval",
  "Submission",
  "Outcome",
] as const;
export type Stage = (typeof STAGES)[number];

// Response sections that requirements get mapped to and drafts get written for.
export const SECTIONS = [
  "Executive Summary",
  "Technical Solution",
  "Delivery Plan",
  "Pricing",
  "Compliance",
] as const;
export type Section = (typeof SECTIONS)[number];

// Requirement categories offered by the extractor and the review table.
export const CATEGORIES: string[] = ["Technical", "Commercial", "Compliance", "Delivery", "Other"];

// Row shapes as they come back from Supabase.
export interface Opportunity {
  id: string;
  user_id: string;
  title: string;
  buyer: string;
  value: number | null;
  deadline: string | null; // date, e.g. "2026-11-05"
  scope: string | null;
  status: Stage;
  created_at: string;
  updated_at: string;
}

export interface RfqRecord {
  id: string;
  opportunity_id: string;
  title: string;
  buyer: string;
  deadline: string | null;
  estimated_value: number | null;
  rfq_text: string;
  created_at: string;
}

export interface Requirement {
  id: string;
  opportunity_id: string;
  number: number;
  text: string;
  category: string;
  section: Section | null; // null = not mapped yet
}

export interface ResponseSection {
  id: string;
  opportunity_id: string;
  section: Section;
  draft: string;
  updated_at: string;
}

// Result of /api/extract. Nothing is saved until the user reviews and clicks save.
export interface ExtractedRequirement {
  number: number;
  text: string;
  category: string;
}

export interface ExtractResult {
  buyer: string | null;
  deadline: string | null;
  scope: string | null;
  requirements: ExtractedRequirement[];
}
