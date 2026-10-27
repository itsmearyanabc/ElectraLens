import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ClaimForm, type AreaOption } from '@/components/claims/ClaimForm';
import { VerdictBadge } from '@/components/claims/VerdictBadge';
import { LabelBadge } from '@/components/ui/Badge';
import { EmptyState, PageHeader, Section } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { getChildAreas, getTopAreas, listPublishedClaims } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { formatDate } from '@/lib/format';
import { pageLocale } from '@/lib/locale';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/claims'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'claims' });
  return { title: t('metaTitle') };
}

/** States, their districts and constituencies, indented, for the claim form. */
async function areaOptions(
  locale: string,
  levelNames: Record<string, string>,
): Promise<AreaOption[]> {
  const options: AreaOption[] = [];
  for (const state of await getTopAreas()) {
    options.push({
      code: state.code,
      label: `${localName(state.name, locale)} (${levelNames.state})`,
    });
    for (const district of await getChildAreas(state.id)) {
      options.push({
        code: district.code,
        label: `— ${localName(district.name, locale)} (${levelNames.district})`,
      });
      for (const ac of await getChildAreas(district.id)) {
        options.push({ code: ac.code, label: `—— ${localName(ac.name, locale)}` });
      }
    }
  }
  return options;
}

export default async function ClaimsPage({ params }: PageProps<'/[locale]/claims'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const [areas, claims] = await Promise.all([
    areaOptions(locale, { state: t('level.state'), district: t('level.district') }),
    listPublishedClaims(),
  ]);

  return (
    <>
      <PageHeader eyebrow={t('claims.eyebrow')} title={t('claims.title')} lede={t('claims.lede')} />
      <div className="container-page py-4">
        <Section>
          <ClaimForm areas={areas} />
        </Section>

        <Section title={t('claims.howTitle')} id="how">
          <ol className="grid gap-4 md:grid-cols-3">
            {(['how1', 'how2', 'how3'] as const).map((key, index) => (
              <li key={key} className="card flex gap-3 p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron font-bold text-navy">
                  {index + 1}
                </span>
                <span>{t(`claims.${key}`)}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={t('claims.recentTitle')} id="recent">
          {claims.length === 0 ? (
            <EmptyState title={t('claims.recentEmpty')} />
          ) : (
            <ul className="space-y-3">
              {claims.map((claim) => {
                const assessment = claim.claim_assessments[0];
                return (
                  <li key={claim.id} className="card p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <LabelBadge label="user_claim" />
                      {assessment && <VerdictBadge verdict={assessment.verdict} />}
                      <span className="text-sm text-muted">
                        {formatDate(locale, claim.created_at)}
                      </span>
                    </div>
                    <p className="mt-3 text-lg">
                      <Link
                        href={`/claims/${claim.id}`}
                        className="text-navy no-underline hover:underline"
                      >
                        “{claim.text}”
                      </Link>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
