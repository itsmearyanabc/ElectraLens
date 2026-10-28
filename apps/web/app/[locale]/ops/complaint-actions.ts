'use server';

import { redirect } from 'next/navigation';

import type { FileState } from '@/app/[locale]/(site)/account/complaints/actions';
import { isLocale } from '@/i18n/routing';
import { isUuid } from '@/lib/data/public';
import { sessionDb } from '@/lib/supabase/server';

const STATUSES = ['in_review', 'resolved', 'closed'] as const;
const localeOf = (form: FormData) => {
  const value = form.get('locale');
  return isLocale(value) ? value : 'en';
};

/** Staff reply on a complaint in their area; the database decides who may write. */
export async function staffReply(_previous: FileState, form: FormData): Promise<FileState> {
  const id = String(form.get('id') ?? '');
  const body = String(form.get('body') ?? '').trim();
  if (!isUuid(id) || body.length < 1 || body.length > 4000) {
    return { status: 'error', message: 'messageInvalid' };
  }
  const db = await sessionDb();
  const { error } = await db.rpc('add_complaint_message', { p_complaint: id, p_body: body });
  if (error) {
    return { status: 'error', message: error.message.includes('closed') ? 'closed' : 'failed' };
  }
  redirect(`/${localeOf(form)}/ops/complaints/${id}`);
}

export async function setComplaintStatus(_previous: FileState, form: FormData): Promise<FileState> {
  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '');
  const note = String(form.get('note') ?? '')
    .trim()
    .slice(0, 500);
  if (!isUuid(id) || !(STATUSES as readonly string[]).includes(status)) {
    return { status: 'error', message: 'failed' };
  }
  const db = await sessionDb();
  const { error } = await db.rpc('set_complaint_status', {
    p_complaint: id,
    p_status: status,
    p_note: note,
  });
  if (error) return { status: 'error', message: 'failed' };
  redirect(`/${localeOf(form)}/ops/complaints/${id}`);
}
