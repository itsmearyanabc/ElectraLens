import 'server-only';

// Gemini through its REST API, from the server only: the key never reaches a browser. The key is
// GEMINI_API_KEY in the server environment; without it the feature reports itself unavailable.

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_CALLS_PER_MINUTE = 30;

export class GeminiUnavailable extends Error {}

const calls: number[] = [];

/** One generation: a fixed system instruction and one user message. Returns plain text. */
export async function generate(system: string, prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiUnavailable('not configured');

  const now = Date.now();
  while (calls.length && now - (calls[0] ?? now) > 60_000) calls.shift();
  if (calls.length >= MAX_CALLS_PER_MINUTE) throw new GeminiUnavailable('busy');
  calls.push(now);

  const model = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // Room for the model's own reasoning as well as the short answer.
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new GeminiUnavailable(`status ${response.status}`);
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const text = (body.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new GeminiUnavailable('empty answer');
  return text;
}
