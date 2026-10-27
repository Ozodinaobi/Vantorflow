// Bid knowledge base. Pure rules derived from published bid guides. No AI calls.
// Sources are listed in SOURCES so the platform can show where each rule came from.

export const SOURCES = [
  { id: "da-academy", title: "Bid / No-Bid Decision Checklist (Defense Sales Academy)", url: "https://defensesalesacademy.com/wp-content/uploads/2025/12/BID-NO-BID-DECISION-CHECKLIST-v2.pdf", used: "weighted scoring model, thresholds" },
  { id: "midwinter", title: "Bid-or-No-Bid Assessment Checklist (Julian Midwinter)", url: "https://www.julianmidwinter.com.au/wp-content/uploads/2014/12/jma-bid-no-bid-checklist.pdf", used: "20-item checklist, core items, true-count bands" },
  { id: "pr-gov", title: "Government Bid/No-Bid Checklist (Federal Contracting Center)", url: "https://docs.pr.gov/files/DDEC/FeCC/ToolKit/Bid_No_Bid_Checklist.pdf", used: "six-section gate structure" },
  { id: "openasset", title: "Strategic Go-No-Go (OpenAsset)", url: "https://openasset.com/wp-content/uploads/2025/06/061325_OA_Go-No-GoGuide_eBook.pdf", used: "top-tier go factors: expertise, strategic fit, client history" },
  { id: "visiblethread", title: "Ultimate Guide to Bid / No Bid (VisibleThread)", url: "https://www.visiblethread.com/wp-content/uploads/2024/04/VisibleThread-Ultimate-Guide-to-Bid-No-Bid-Decision-Making-2024.pdf", used: "budget, timeline, decision-maker conversations" },
  { id: "quin", title: "Go/No-Go Decision Tool (Quin-zcon)", url: "https://quin-zcon.com/wp-content/uploads/2026/03/3.-Standalone-Go_No-Go-Decision-Tool.pdf", used: "eligibility gate: any No requires mitigation or stop" },
  { id: "nz-procurement", title: "Decide on your evaluation methodology (NZ Government Procurement)", url: "https://www.procurement.govt.nz/guides/guide-to-procurement/plan-your-procurement/evaluation-methodology/", used: "rank criteria, weight them, score, weight, total" },
  { id: "uk-bid-eval", title: "Bid evaluation guidance note (UK Cabinet Office, May 2021)", url: "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/987130/Bid_evaluation_guidance_note_May_2021.pdf", used: "distinct criteria, non-linear scoring bands to avoid bid bunching" },
  { id: "qld-pqm", title: "Price Quality Method guide note (Queensland Government)", url: "https://www.forgov.qld.gov.au/__data/assets/pdf_file/0031/377905/guide-note-price-quality-method-for-evaluating-tenders.pdf.pdf", used: "non-price score below 2.5 of 5 can make a tender ineligible" },
  { id: "proposit", title: "Compliance matrix: what it is and how to create one (Proposit)", url: "https://www.getproposit.com/guides/compliance-matrix", used: "compliance matrix columns" },
  { id: "responsive", title: "Proposal Compliance Matrix Guide (Responsive)", url: "https://www.responsive.io/blog/proposal-compliance-matrix", used: "fully / partially / not compliant with location references" },
  { id: "ociwins", title: "Proposal Win Themes Checklist (OCI)", url: "https://ociwins.com/c43-proposal-writing/proposal-win-themes-checklist/", used: "win themes max 25 words, separate themes/discriminators/hot buttons/ghosts" },
  { id: "apmp-leitner", title: "Winning Proposal Writing Tips (APMP, Leitner)", url: "https://apmp-western.org/wp-content/uploads/2019/10/Winning-Proposal-Writing-Tips-Leitner.pdf", used: "win themes tied to evaluation factors as customer benefits" },
  { id: "rocketdocs", title: "How to Write an RFP Executive Summary (RocketDocs)", url: "https://rocketdocs.com/resources/blog/rfp-executive-summary-guide", used: "keep price out of the executive summary, anchor on buyer need" },
  { id: "govdash", title: "Federal Bid Pricing Guide (GovDash)", url: "https://www.govdash.com/blog/how-to-price-federal-bids-guide-government-contractors", used: "price floor and ceiling, avoid undercutting by 20%, 15% premium needs differentiation" },
  { id: "enable", title: "How to Calculate Price to Win (Enable)", url: "https://enable.consulting/resources/how-to-calculate-price-to-win", used: "price-to-win order, buyer scoring model first, cliff-edge/linear/stepped price scoring" },
] as const;

// Weighted Go/No-Go model (Defense Sales Academy). Each factor scored 1 to 5, weights sum to 100.
export const GO_FACTORS = [
  { key: "customer_access", label: "Customer access", weight: 20, hint: "Do we know the decision makers and their priorities?" },
  { key: "technical_fit", label: "Technical fit", weight: 25, hint: "Can we meet 80% or more of the requirements?" },
  { key: "competition", label: "Competitive position", weight: 15, hint: "Who is the incumbent and how strong are they?" },
  { key: "pricing", label: "Pricing realism", weight: 20, hint: "Can we price competitively and still make margin?" },
  { key: "capacity", label: "Capacity", weight: 10, hint: "Staff, time and expertise available before the deadline." },
  { key: "strategic_fit", label: "Strategic fit", weight: 10, hint: "Does this support long-term goals?" },
] as const;

export type GoKey = (typeof GO_FACTORS)[number]["key"];

export const GO_THRESHOLDS = { clearBid: 80, leadershipReview: 65 } as const;

export interface GoScore {
  percent: number; // 0 to 100, one decimal
  band: "CLEAR BID" | "LEADERSHIP REVIEW" | "NO-BID";
  recommendation: string;
  weakest: string; // label of the lowest scored factor
}

// percent = sum(score * weight) / (5 * sum(weight)) * 100. Weights sum to 100, so this is score/5 weighted.
export function scoreGo(scores: Record<GoKey, number>): GoScore {
  const totalWeight = GO_FACTORS.reduce((a, f) => a + f.weight, 0);
  const weighted = GO_FACTORS.reduce((a, f) => a + scores[f.key] * f.weight, 0);
  const percent = Math.round((weighted / (5 * totalWeight)) * 1000) / 10;
  const lowest = Math.min(...GO_FACTORS.map((f) => scores[f.key]));
  const weakest = GO_FACTORS.find((f) => scores[f.key] === lowest)!.label;
  if (percent >= GO_THRESHOLDS.clearBid) {
    return { percent, band: "CLEAR BID", recommendation: "Strong case. Bid, and keep the weakest area under watch.", weakest };
  }
  if (percent >= GO_THRESHOLDS.leadershipReview) {
    return { percent, band: "LEADERSHIP REVIEW", recommendation: `Borderline. Take it to leadership and address ${weakest} before committing.`, weakest };
  }
  return { percent, band: "NO-BID", recommendation: `Below 65%. Recommend no-bid unless ${weakest} can be fixed.`, weakest };
}

// Midwinter 20-item checklist. Core items (must-have before a bid) are numbers 1-7 per the source.
export const CHECKLIST = [
  { id: 1, core: true, text: "We can't afford not to put in a bid." },
  { id: 2, core: true, text: "The work is financially and/or strategically important to our firm." },
  { id: 3, core: true, text: "The work aligns with our core business." },
  { id: 4, core: true, text: "We meet the minimum threshold/requirements of the RFT/RFP." },
  { id: 5, core: true, text: "We can invest appropriate time and resources to produce a credible bid." },
  { id: 6, core: true, text: "We know the potential revenue/profit if we win." },
  { id: 7, core: true, text: "We know the direct and indirect costs of bidding." },
  { id: 8, core: false, text: "We understand the buyer's reasons for going to market and their pain points." },
  { id: 9, core: false, text: "Winning this will not jeopardise current or future clients or opportunities." },
  { id: 10, core: false, text: "We are incumbents." },
  { id: 11, core: false, text: "We have relevant experience in this area." },
  { id: 12, core: false, text: "We have done work for this buyer in the recent past." },
  { id: 13, core: false, text: "We have a good existing relationship with the buyer." },
  { id: 14, core: false, text: "We know who our competitors will be." },
  { id: 15, core: false, text: "We know how many firms will be appointed." },
  { id: 16, core: false, text: "We have no conflicts of interest." },
  { id: 17, core: false, text: "We have the support of our key decision-maker(s)." },
  { id: 18, core: false, text: "We are ready to start the response straight away." },
  { id: 19, core: false, text: "We have, or can acquire, the resources to deliver if we win." },
  { id: 20, core: false, text: "If we win, we are ready to put a client relationship plan in place." },
] as const;

export interface ChecklistResult {
  trueCount: number;
  coreTrue: number;
  coreMissing: number[];
  band: "STRONG" | "BID WITH RISK REVIEW" | "NOT WORTH IT";
  recommendation: string;
}

// Midwinter rules: 17-20 true = strong; 13-16 = bid but address risks; 12 or fewer = not a good opportunity.
// Fewer than 3 core items true means reconsider regardless of total.
export function scoreChecklist(answers: Record<number, boolean>): ChecklistResult {
  const trueCount = CHECKLIST.filter((c) => answers[c.id] === true).length;
  const coreMissing = CHECKLIST.filter((c) => c.core && answers[c.id] !== true).map((c) => c.id);
  const coreTrue = CHECKLIST.filter((c) => c.core && answers[c.id] === true).length;
  if (coreTrue < 3) {
    return { trueCount, coreTrue, coreMissing, band: "NOT WORTH IT", recommendation: "Fewer than 3 core items are true. Reconsider the opportunity." };
  }
  if (trueCount >= 17) return { trueCount, coreTrue, coreMissing, band: "STRONG", recommendation: "Deep understanding and a strong position to bid." };
  if (trueCount >= 13) return { trueCount, coreTrue, coreMissing, band: "BID WITH RISK REVIEW", recommendation: "Bid, but address the open risks first." };
  return { trueCount, coreTrue, coreMissing, band: "NOT WORTH IT", recommendation: "12 or fewer true. Not a good opportunity for the firm right now." };
}

// Win theme rules (OCI, APMP, RocketDocs): max 25 words, tied to evaluation factors, customer benefit, with proof.
export function checkWinTheme(text: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) issues.push("Write the win theme.");
  if (words > 25) issues.push(`Win theme is ${words} words. Keep it to 25 or fewer.`);
  if (!/\d/.test(text)) issues.push("Add a number or proof point to back the theme.");
  return { ok: issues.length === 0, issues };
}

// Price rules (GovDash, Enable, RocketDocs): price is not in the executive summary; floor/ceiling; 20% undercut flag; 15% premium needs differentiation.
export function checkPrice(bidPrice: number, competitorAverage: number, floor: number): { flags: string[] } {
  const flags: string[] = [];
  if (competitorAverage > 0) {
    const diff = (bidPrice - competitorAverage) / competitorAverage;
    if (diff <= -0.2) flags.push("More than 20% below competitors. Evaluators may question capability.");
    if (diff >= 0.15) flags.push("More than 15% above competitors. Needs clear technical differentiation to justify it.");
  }
  if (floor > 0 && bidPrice < floor) flags.push("Below your floor (cost plus minimum profit).");
  return { flags };
}


// Pricing score from real numbers. Inputs: our bid price, the competitor average (same currency),
// our margin % on that bid, and the minimum margin we accept. Returns 1 to 5 and the reasons.
export interface PricingInput { bidPrice: number; competitorAverage: number; marginPct: number; minMarginPct: number }
export function scorePricing(input: PricingInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 5;
  const { bidPrice, competitorAverage, marginPct, minMarginPct } = input;
  if (bidPrice > 0 && competitorAverage > 0) {
    const diff = (bidPrice - competitorAverage) / competitorAverage;
    if (diff <= -0.2) { score -= 2; reasons.push("More than 20% below the competitor average."); }
    else if (diff < -0.1) { reasons.push("10 to 20% below the competitor average. Competitive."); }
    else if (diff >= 0.15) { score -= 2; reasons.push("More than 15% above the competitor average."); }
    else if (diff > 0.05) { score -= 1; reasons.push("5 to 15% above the competitor average."); }
    else reasons.push("Within 5% of the competitor average.");
  } else {
    reasons.push("No competitor average entered, so the price position is not scored.");
  }
  if (marginPct < minMarginPct) { score -= 2; reasons.push(`Margin ${marginPct}% is below your minimum ${minMarginPct}%.`); }
  else reasons.push(`Margin ${marginPct}% meets your minimum ${minMarginPct}%.`);
  return { score: Math.max(1, Math.min(5, score)), reasons };
}

// Compliance matrix columns (Proposit + Responsive): status is fully / partially / not compliant.
export const COMPLIANCE_COLUMNS = ["Requirement ID", "Requirement text (verbatim)", "Source (section/page)", "Type (mandatory/scored/admin)", "Status (fully/partially/not compliant)", "Response location", "Owner", "Evidence", "Notes"] as const;
