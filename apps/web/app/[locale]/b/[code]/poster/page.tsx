import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { PrintButton } from '@/components/booths/PrintButton';
import { LogoMark } from '@/components/ui/Logo';
import { getBooth } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';
import { boothQrDataUri, boothUrl } from '@/lib/qr';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/b/[code]/poster'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { code } = await params;
  const booth = await getBooth(code);
  return booth ? { title: localName(booth.name, locale), robots: { index: false } } : {};
}

/** Q02 / B13.06: an A4 poster to print and display at the booth. */
export default async function PosterPage({ params }: PageProps<'/[locale]/b/[code]/poster'>) {
  const locale = await pageLocale(params);
  const { code } = await params;
  const booth = await getBooth(code);
  if (!booth) notFound();
  const t = await getTranslations('booth');
  const qr = await boothQrDataUri(booth.public_code);

  return (
    <main className="min-h-dvh bg-mist py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-6 flex max-w-[210mm] justify-end px-4">
        <PrintButton label={t('posterPrint')} />
      </div>
      <article className="mx-auto flex aspect-[210/297] max-w-[210mm] flex-col items-center justify-between bg-white px-[14mm] py-[16mm] text-center shadow-[var(--shadow-float)] print:shadow-none">
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2">
            <LogoMark size={36} />
            <span className="display text-2xl">
              Electra<span className="text-saffron">Lens</span>
            </span>
          </span>
          {booth.is_synthetic && (
            <span className="display rounded-full bg-saffron px-4 py-1 text-sm text-ink">
              {t('demoWatermark')}
            </span>
          )}
        </div>
        <div>
          <p className="eyebrow">{t('posterTitle')}</p>
          <h1 className="mt-4 text-[2.25rem] leading-tight">{localName(booth.name, locale)}</h1>
          <p className="mt-3 text-lg text-muted">{localName(booth.address, locale)}</p>
        </div>
        <img
          src={qr}
          alt={boothUrl(booth.public_code)}
          width={300}
          height={300}
          className="h-[86mm] w-[86mm]"
        />
        <div>
          <p className="text-xl font-bold">{t('posterScan')}</p>
          <p className="hash mt-2 text-base text-muted">{boothUrl(booth.public_code)}</p>
        </div>
        <p className="max-w-[150mm] text-sm text-muted">{t('posterNotice')}</p>
      </article>
    </main>
  );
}
