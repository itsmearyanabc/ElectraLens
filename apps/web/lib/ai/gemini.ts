import 'server-only';

// The AI explainer's model, called from the server only: keys never reach a browser. Gemini when
// GEMINI_API_KEY is set, otherwise an NVIDIA-hosted model when NVIDIA_API_KEY is set (its API is
// OpenAI-compatible). With neither key the feature reports itself unavailable.

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
const NVIDIA = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_CALLS_PER_MINUTE = 30;

export class GeminiUnavailable extends Error {}

const calls: number[] = [];

/** The model that will answer, for the label under the text; null when none is configured. */
export function modelName(): string | null {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_MODEL ?? 'gemini-flash-latest';
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_MODEL ?? 'meta/llama-3.3-70b-instruct';
  return null;
}

/** One generation: a fixed system instruction and one user message. Returns plain text. */
export async function generate(system: string, prompt: string): Promise<string> {
  const model = modelName();
  if (!model) throw new GeminiUnavailable('not configured');

  const now = Date.now();
  while (calls.length && now - (calls[0] ?? now) > 60_000) calls.shift();
  if (calls.length >= MAX_CALLS_PER_MINUTE) throw new GeminiUnavailable('busy');
  calls.push(now);

  const text = process.env.GEMINI_API_KEY
    ? await gemini(model, process.env.GEMINI_API_KEY, system, prompt)
    : await nvidia(model, process.env.NVIDIA_API_KEY ?? '', system, prompt);
  if (!text) throw new GeminiUnavailable('empty answer');
  return text;
}

async function gemini(model: string, key: string, system: string, prompt: string) {
  const response = await fetch(`${GEMINI}/${encodeURIComponent(model)}:generateContent`, {
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
  return (body.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

async function nvidia(model: string, key: string, system: string, prompt: string) {
  const response = await fetch(NVIDIA, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new GeminiUnavailable(`status ${response.status}`);
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  // Reasoning models may prefix their thinking in <think> tags; only the answer is shown.
  return (body.choices?.[0]?.message?.content ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .trim();
}
