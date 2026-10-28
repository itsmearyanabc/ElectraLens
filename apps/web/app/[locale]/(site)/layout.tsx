import { getTranslations } from 'next-intl/server';

import { ChatWidget } from '@/components/assistant/ChatWidget';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { pageLocale } from '@/lib/locale';

export default async function SiteLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'chat' });
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <ChatWidget
        locale={locale}
        text={{
          open: t('open'),
          close: t('close'),
          title: t('title'),
          subtitle: t('subtitle'),
          placeholder: t('placeholder'),
          send: t('send'),
          thinking: t('thinking'),
          notice: t('notice'),
          unavailable: t('unavailable'),
          refused: t('refused'),
          invalid: t('invalid'),
          suggestions: t.raw('suggestions') as string[],
          talk: t('talk'),
          stopTalk: t('stopTalk'),
          mic: t('mic'),
          listening: t('listening'),
          speaking: t('speaking'),
          stopSpeaking: t('stopSpeaking'),
          replay: t('replay'),
          voiceNote: t('voiceNote'),
          voiceDenied: t('voiceDenied'),
          voiceNoSpeech: t('voiceNoSpeech'),
          voiceFailed: t('voiceFailed'),
        }}
      />
    </>
  );
}
