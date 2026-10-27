'use server';

import { answer, MAX_QUESTION, type ChatReply, type ChatTurn } from '@/lib/ai/assistant';
import { routing } from '@/i18n/routing';

/** The chat assistant's next reply. The conversation lives in the visitor's browser only. */
export async function askAssistant(turns: ChatTurn[], locale: string): Promise<ChatReply> {
  if (!(routing.locales as readonly string[]).includes(locale) || !Array.isArray(turns)) {
    return { status: 'invalid' };
  }
  const clean = turns
    .slice(-6)
    .filter(
      (turn): turn is ChatTurn =>
        (turn?.role === 'user' || turn?.role === 'assistant') && typeof turn.text === 'string',
    )
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, MAX_QUESTION * 3) }));
  const last = clean.at(-1);
  if (!last || last.role !== 'user' || last.text.length > MAX_QUESTION)
    return { status: 'invalid' };
  return answer(clean, locale);
}
