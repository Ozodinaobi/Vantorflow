// Cleans drafted text before it goes into a client-facing document.
// Removes internal placeholders and engine wording so the client only sees the response.
export function cleanForClient(text: string): string {
  return text
    .replace(/\[TO CONFIRM[^\]]*\]/gi, "")
    .replace(/\[(?:TBC|TBD|PLACEHOLDER)[^\]]*\]/gi, "")
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

export function sectionTextForClient(text: string | undefined | null): string {
  return cleanForClient(text ?? "");
}
