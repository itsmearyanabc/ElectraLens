import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AccountShell } from '@/components/account/AccountShell';
import { DeleteAccountForm, ProfileForm } from '@/components/account/SettingsForms';
import { requireUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { pageLocale } from '@/lib/locale';
import { sessionDb } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account/settings'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('settingsTitle'), robots: { index: false } };
}

export default async function SettingsPage({ params }: PageProps<'/[locale]/account/settings'>) {
  const locale = await pageLocale(params);
  const user = await requireUser(locale);
  const t = await getTranslations('account');
  const db = await sessionDb();
  const { data } = await db
    .from('profiles')
    .select('display_name, preferred_language, notify_email')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <AccountShell user={user} title={t('settingsTitle')}>
      <div className="space-y-8">
        <ProfileForm
          profile={data ?? { display_name: null, preferred_language: locale, notify_email: false }}
        />
        <DeleteAccountForm available={env.apiInternalUrl() !== null} />
      </div>
    </AccountShell>
  );
}
