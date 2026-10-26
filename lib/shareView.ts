// Plain-language readiness line for the public share page.
export function readinessTone(score: number): string {
  if (score >= 80) return "Response is nearly complete.";
  if (score >= 50) return "Response is well under way.";
  return "Response is still being prepared.";
}
