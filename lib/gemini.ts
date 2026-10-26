// Thin wrapper around the Gemini REST API (generativelanguage.googleapis.com).
// The key is read from GEMINI_API_KEY on the server only.
// gemini-2.0-flash and 2.5-flash return 404 for current keys. 3.5-flash was verified to answer on this key.
const MODEL = "gemini-3.5-flash";

export async function callGemini(prompt: string, expectJson = false): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        // When JSON is expected, ask Gemini to return raw JSON (no markdown fences).
        ...(expectJson ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini request failed (HTTP ${res.status}).`);
  }

  // The answer text is spread across one or more "parts"; join them back together.
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text || "").join("").trim();
  if (!text) {
    throw new Error("Gemini returned an empty response. Try again.");
  }
  return text;
}
