// Company profile: the details a bid is submitted under (legal name, summary, certifications, insurance,
// case studies). Stored as JSON inside the existing vf_companies.notes column, so no migration is needed.
// Older rows that hold plain notes text still work: they decode to an empty profile with the text kept as notes.
// Client and server safe (no imports from server-only modules).

export interface CaseStudy {
  title: string;
  client: string;
  summary: string;
}

export interface Insurance {
  publicLiability: string; // e.g. "GBP 5,000,000 any one occurrence"
  employersLiability: string;
  professionalIndemnity: string;
  other: string;
}

export interface CompanyProfile {
  legalName: string;
  summary: string;
  certifications: string[]; // e.g. "ISO 9001:2015 (BSI, cert no. 12345, valid to 2027)"
  insurance: Insurance;
  caseStudies: CaseStudy[];
}

export const EMPTY_PROFILE: CompanyProfile = {
  legalName: "",
  summary: "",
  certifications: [],
  insurance: { publicLiability: "", employersLiability: "", professionalIndemnity: "", other: "" },
  caseStudies: [],
};

const MAX = { legalName: 200, summary: 2000, cert: 200, insurance: 200, caseTitle: 200, caseClient: 200, caseSummary: 1000, certs: 30, cases: 20 };

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Cleans untrusted input (from the request body or the stored JSON) into a valid profile.
export function sanitizeProfile(input: unknown): CompanyProfile {
  const p = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const ins = (p.insurance && typeof p.insurance === "object" ? p.insurance : {}) as Record<string, unknown>;
  const certs = Array.isArray(p.certifications) ? p.certifications : [];
  const cases = Array.isArray(p.caseStudies) ? p.caseStudies : [];
  return {
    legalName: str(p.legalName, MAX.legalName),
    summary: str(p.summary, MAX.summary),
    certifications: certs.map((c) => str(c, MAX.cert)).filter(Boolean).slice(0, MAX.certs),
    insurance: {
      publicLiability: str(ins.publicLiability, MAX.insurance),
      employersLiability: str(ins.employersLiability, MAX.insurance),
      professionalIndemnity: str(ins.professionalIndemnity, MAX.insurance),
      other: str(ins.other, MAX.insurance),
    },
    caseStudies: cases
      .map((c: any) => ({
        title: str(c?.title, MAX.caseTitle),
        client: str(c?.client, MAX.caseClient),
        summary: str(c?.summary, MAX.caseSummary),
      }))
      .filter((c) => c.title || c.summary)
      .slice(0, MAX.cases),
  };
}

// The stored notes column: JSON with the profile and free notes. Plain text notes are kept as-is in `text`.
export interface StoredNotes {
  profile: CompanyProfile;
  text: string;
}

export function decodeNotes(raw: string | null | undefined): StoredNotes {
  const text = raw ?? "";
  if (text.trimStart().startsWith("{")) {
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === "object" && obj.__vf === 1) {
        return { profile: sanitizeProfile(obj.profile), text: str(obj.text, 2000) };
      }
    } catch {
      // Not our JSON, fall through to plain text.
    }
  }
  return { profile: { ...EMPTY_PROFILE }, text };
}

export function encodeNotes(profile: CompanyProfile, text: string): string {
  return JSON.stringify({ __vf: 1, profile: sanitizeProfile(profile), text: text.slice(0, 2000) });
}

// True when the profile has anything in it worth putting into a draft.
export function hasProfile(p: CompanyProfile): boolean {
  return Boolean(
    p.legalName ||
      p.summary ||
      p.certifications.length ||
      Object.values(p.insurance).some(Boolean) ||
      p.caseStudies.length
  );
}

// Plain-text lines describing the company, used for the drafting prompt and the credentials block.
export function profileLines(p: CompanyProfile): string[] {
  const out: string[] = [];
  if (p.legalName) out.push(`Legal name: ${p.legalName}`);
  if (p.summary) out.push(`About the company: ${p.summary}`);
  if (p.certifications.length) out.push(`Certifications: ${p.certifications.join("; ")}`);
  const ins: string[] = [];
  if (p.insurance.publicLiability) ins.push(`public liability ${p.insurance.publicLiability}`);
  if (p.insurance.employersLiability) ins.push(`employers' liability ${p.insurance.employersLiability}`);
  if (p.insurance.professionalIndemnity) ins.push(`professional indemnity ${p.insurance.professionalIndemnity}`);
  if (p.insurance.other) ins.push(p.insurance.other);
  if (ins.length) out.push(`Insurance: ${ins.join("; ")}`);
  for (const c of p.caseStudies) {
    out.push(`Case study: ${c.title}${c.client ? ` (client: ${c.client})` : ""}${c.summary ? `. ${c.summary}` : ""}`);
  }
  return out;
}
