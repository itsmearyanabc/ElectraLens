'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { callApi } from '@/lib/api';
import { isUuid } from '@/lib/data/public';

export interface UploadTicket {
  path: string;
  signed_url: string;
  max_bytes: number;
}

/** B03.02: a signed URL into this version's quarantine folder, issued by the API. */
export async function requestUpload(versionId: string): Promise<UploadTicket | { error: string }> {
  if (!isUuid(versionId)) return { error: 'generic' };
  const reply = await callApi<UploadTicket>(`/staff/datasets/${versionId}/upload-url`, {
    method: 'POST',
    body: { format: 'csv' },
  });
  return reply.ok ? reply.data : { error: reply.code };
}

/** The upload finished: the database checks the path and queues ingestion for the worker. */
export async function confirmUpload(versionId: string, path: string): Promise<{ error?: string }> {
  if (!isUuid(versionId)) return { error: 'generic' };
  const reply = await callApi(`/staff/datasets/${versionId}/uploaded`, {
    method: 'POST',
    body: { path },
  });
  revalidatePath('/[locale]/ops/datasets/[id]', 'page');
  return reply.ok ? {} : { error: reply.code };
}

/** B07.09: open restricted evidence through the API's 5-minute signed link (audit-logged). */
export async function openEvidence(form: FormData): Promise<void> {
  const id = String(form.get('id') ?? '');
  if (!isUuid(id)) return;
  const reply = await callApi<{ url: string }>(`/staff/findings/${id}/evidence`);
  if (reply.ok) redirect(reply.data.url);
}
