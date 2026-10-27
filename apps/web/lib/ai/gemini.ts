import 'server-only';

// The AI explainer's model, called from the server only: keys never reach a browser. Gemini when
// GEMINI_API_KEY is set, otherwise an NVIDIA-hosted model when NVIDIA_API_KEY is set (its API is
// OpenAI-compatible). With neither key the feature reports itself unavailable.

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
const NVIDIA = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_CALLS_PER_MINUTE = 30;
// Short, so an overloaded model hands over to the next one quickly.
const MODEL_TIMEOUT_MS = 12_000;

export class GeminiUnavailable extends Error {}

const calls: number[] = [];

/** Models to try in order: the configured one, then lighter Flash models when it is overloaded. */
function candidates(): string[] {
  if (process.env.GEMINI_API_KEY) {
    const preferred = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';
    return [...new Set([preferred, 'gemini-flash-lite-latest', 'gemini-2.5-flash'])];
  }
  if (process.env.NVIDIA_API_KEY) return [process.env.NVIDIA_MODEL ?? 'meta/llama-3.1-8b-instruct'];
  return [];
}

/** Overloaded, rate-limited, retired or briefly failing: worth trying the next model. */
const RETRYABLE = /^status (404|410|429|500|502|503|504)\b/;

/** One generation: a fixed system instruction and one user message. Plain text and its model. */
export async function generate(
  system: string,
  prompt: string,
): Promise<{ text: string; model: string }> {
  const models = candidates();
  if (models.length === 0) throw new GeminiUnavailable('not configured');

  const now = Date.now();
  while (calls.length && now - (calls[0] ?? now) > 60_000) calls.shift();
  if (calls.length >= MAX_CALLS_PER_MINUTE) throw new GeminiUnavailable('busy');
  calls.push(now);

  for (const model of models) {
    try {
      const text = process.env.GEMINI_API_KEY
        ? await gemini(model, process.env.GEMINI_API_KEY, system, prompt)
        : await nvidia(model, process.env.NVIDIA_API_KEY ?? '', system, prompt);
      if (text) return { text, model };
      console.warn(`AI explainer: ${model} returned an empty answer`);
    } catch (error) {
      // The reason only (status or network error), never the key or the prompt.
      const reason = (error as Error).message;
      console.warn(`AI explainer: ${model} failed: ${reason}`);
      if (error instanceof GeminiUnavailable && !RETRYABLE.test(reason)) throw error;
    }
  }
  throw new GeminiUnavailable('every model failed');
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
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });
  if (!response.ok)
    throw new GeminiUnavailable(
      `status ${response.status}: ${(await response.text()).slice(0, 200)}`,
    );
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
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });
  if (!response.ok)
    throw new GeminiUnavailable(
      `status ${response.status}: ${(await response.text()).slice(0, 200)}`,
    );
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  // Reasoning models may prefix their thinking in <think> tags; only the answer is shown.
  return (body.choices?.[0]?.message?.content ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .trim();
}
