// Answer library matching. Server-side helper: picks saved answers that overlap with a set of requirements.
// Simple and predictable: two or more shared meaningful words, or every word of a short question shared.

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "will", "shall", "must", "have", "been", "into", "your",
  "our", "are", "was", "not", "any", "all", "can", "which", "their", "they", "about", "such", "per", "its", "use",
  "provide", "provided", "should", "where", "when", "also", "other", "within", "under", "each", "etc",
]);

export function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
  );
}

export interface LibraryEntry {
  question: string;
  answer: string;
}

export function matchLibrary(entries: LibraryEntry[], requirementTexts: string[], max = 8): LibraryEntry[] {
  const reqWords = new Set<string>();
  requirementTexts.forEach((t) => tokens(t).forEach((w) => reqWords.add(w)));
  if (reqWords.size === 0) return [];
  const scored = entries
    .map((e) => {
      const qt = tokens(e.question);
      let shared = 0;
      qt.forEach((w) => {
        if (reqWords.has(w)) shared++;
      });
      const hit = shared >= 2 || (qt.size > 0 && shared === qt.size);
      return { e, shared, hit };
    })
    .filter((x) => x.hit)
    .sort((a, b) => b.shared - a.shared);
  return scored.slice(0, max).map((x) => x.e);
}
