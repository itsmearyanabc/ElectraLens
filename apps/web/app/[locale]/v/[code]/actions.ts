'use server';

import { publicDb } from '@/lib/supabase/public';
import { VOTER_CARD_CODE } from '@/lib/data/public';

export interface Participation {
  election: string;
  year: number;
  voted: boolean;
}

export type HistoryState =
  | { status: 'idle' | 'wrong' | 'locked' | 'failed' }
  | { status: 'ok'; participation: Participation[] };

/** The card's synthetic participation history, only with its PIN (checked in the database). */
export async function showHistory(_previous: HistoryState, form: FormData): Promise<HistoryState> {
  const code = String(form.get('code') ?? '');
  const pin = String(form.get('pin') ?? '').trim();
  if (!VOTER_CARD_CODE.test(code) || !/^[0-9]{4}$/.test(pin)) return { status: 'wrong' };
  const { data, error } = await publicDb().rpc('demo_voter_history', { p_code: code, p_pin: pin });
  if (error) return { status: 'failed' };
  const result = data as { locked?: boolean; participation?: Participation[] } | null;
  if (!result) return { status: 'wrong' };
  if (result.locked) return { status: 'locked' };
  return { status: 'ok', participation: result.participation ?? [] };
}
