import 'server-only';

import { findBannedTerm } from '@electralens/i18n';

import { COMPLAINT_CATEGORIES, isCategory, type ComplaintDraft } from '@/lib/complaints';

import type { ChatTurn } from './assistant';
import { generate, GeminiUnavailable } from './gemini';

export type IntakeReply =
  | { status: 'ok'; text: string; draft: ComplaintDraft | null }
  | { status: 'unavailable' | 'refused' | 'invalid' };

const LANGUAGE: Record<string, string> = { en: 'English', hi: 'Hindi (Devanagari script)' };

const SYSTEM = `You help a citizen write a clear complaint about their electoral-roll or voting-booth problem on ElectraLens, an independent civic tool. The complaint goes to the official responsible for their area.
Ask one short question at a time until you know: what happened, which part of the roll or which booth it concerns (in general terms), when, and what they want done. Two or three questions are usually enough.
Rules:
- Be polite and neutral. Never accuse anyone, never suggest fraud or intent, never discuss parties or candidates.
- Never ask for or repeat an Aadhaar number, EPIC number, phone number or address in full; the official will ask through proper channels if needed. If the citizen offers them, tell them not to share them here.
- Mention official ECI services (voters.eci.gov.in, Forms 6/7/8, helpline 1950) when they fit the problem.
- When you know enough, propose a draft.
Answer ONLY with JSON, no markdown: {"reply": "<your message to the citizen>", "draft": null}
or, when ready: {"reply": "<short message asking them to review the draft>", "draft": {"category": "<one of: ${COMPLAINT_CATEGORIES.join(', ')}>", "title": "<5-120 characters>", "summary": "<factual summary in the first person, 40-200 words>"}}`;

function parse(text: string): { reply: string; draft: ComplaintDraft | null } | null {
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try {
    const value = JSON.parse(json) as { reply?: unknown; draft?: Record<string, unknown> | null };
    if (typeof value.reply !== 'string' || !value.reply.trim()) return null;
    const d = value.draft;
    const draft =
      d &&
      isCategory(d.category) &&
      typeof d.title === 'string' &&
      typeof d.summary === 'string' &&
      d.title.trim().length >= 5 &&
      d.summary.trim().length >= 10
        ? {
            category: d.category,
            title: d.title.trim().slice(0, 140),
            summary: d.summary.trim().slice(0, 4000),
          }
        : null;
    return { reply: value.reply.trim(), draft };
  } catch {
    return null;
  }
}

/** The intake assistant's next turn: a question, or a draft complaint to review. */
export async function intakeTurn(turns: ChatTurn[], locale: string): Promise<IntakeReply> {
  const recent = turns.slice(-10);
  if (recent.at(-1)?.role !== 'user') return { status: 'invalid' };
  const transcript = recent
    .map((turn) => `${turn.role === 'user' ? 'Citizen' : 'Assistant'}: ${turn.text}`)
    .join('\n');
  let answer: { text: string };
  try {
    answer = await generate(
      SYSTEM,
      `Write "reply" (and the draft) in ${LANGUAGE[locale] ?? 'English'}.\n\nConversation:\n${transcript}`,
    );
  } catch (error) {
    if (error instanceof GeminiUnavailable) return { status: 'unavailable' };
    throw error;
  }
  const parsed = parse(answer.text);
  if (!parsed) return { status: 'unavailable' };
  const everything = [parsed.reply, parsed.draft?.title ?? '', parsed.draft?.summary ?? ''].join(
    ' ',
  );
  if (findBannedTerm(everything)) return { status: 'refused' };
  return { status: 'ok', text: parsed.reply, draft: parsed.draft };
}
