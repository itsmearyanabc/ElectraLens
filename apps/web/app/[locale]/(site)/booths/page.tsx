import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SyntheticBadge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, PageHeader } from '@/components/ui/Page';
import { Link } from '@/i18n/navigation';
import { boothsInArea, getArea, getChildAreas, getTopAreas } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';
import { one } from '@/lib/params';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/booths'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'booths' });
  return { title: t('metaTitle') };
}

const ACCESS_KEYS = ['ramp', 'ground_floor', 'wheelchair', 'drinking_water', 'toilet'] as const;

export default async function BoothsPage({ params, searchParams }: PageProps<'/[locale]/booths'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const code = one(await searchParams, 'area')?.toUpperCase();

  // Districts and their constituencies, for the area picker. There is no search by person (B13.04).
  const groups: { label: string; options: { code: string; label: string }[] }[] = [];
  for (const state of await getTopAreas()) {
    for (const district of await getChildAreas(state.id)) {
      const acs = await getChildAreas(district.id);
      groups.push({
        label: `${localName(district.name, locale)}, ${localName(state.name, locale)}`,
        options: [
          {
            code: district.code,
            label: `${localName(district.name, locale)} (${t('level.district')})`,
          },
          ...acs.map((ac) => ({ code: ac.code, label: localName(ac.name, locale) })),
        ],
      });
    }
  }

  const area = code ? await getArea(code) : null;
  const acIds =
    area?.level === 'ac'
      ? [area.id]
      : area?.level === 'district'
        ? (await getChildAreas(area.id)).map((ac) => ac.id)
        : [];
  const booths = await boothsInArea(acIds);

  return (
    <>
      <PageHeader eyebrow={t('booths.eyebrow')} title={t('booths.title')} lede={t('booths.lede')}>
        <form
          method="get"
          className="card-float mt-10 flex max-w-2xl flex-col gap-3 p-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 px-2 pt-2 sm:pb-1">
            <label htmlFor="booth-area" className="mono-label">
              {t('booths.chooseArea')}
            </label>
            <select
              id="booth-area"
              name="area"
              defaultValue={area?.code ?? ''}
              className="mt-1 w-full bg-transparent py-1.5 text-lg font-semibold text-ink focus-visible:outline-offset-4"
            >
              <option value="" disabled>
                {t('booths.empty')}
              </option>
              {groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            <Icon name="search" size={18} /> {t('booths.show')}
          </button>
        </form>
      </PageHeader>

      <div className="container-page py-12">
        {!area ? (
          <EmptyState title={t('booths.empty')} />
        ) : booths.length === 0 ? (
          <EmptyState title={t('booths.none')} />
        ) : (
          <>
            <p role="status" className="display text-2xl text-ink">
              {t('booths.results', { count: booths.length, area: localName(area.name, locale) })}
            </p>
            <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {booths.map((booth) => {
                const access = (booth.accessibility ?? {}) as Record<string, boolean>;
                return (
                  <li key={booth.id} className="card flex flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="mono-label">{booth.public_code}</span>
                      {booth.is_synthetic && <SyntheticBadge />}
                    </div>
                    <h2 className="mt-3 !font-sans text-lg font-bold">
                      {localName(booth.name, locale)}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{localName(booth.address, locale)}</p>
                    <p className="mt-3 text-sm font-semibold">
                      {t('booths.parts', { parts: booth.parts_served.join(', ') })}
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t('booths.accessible')}>
                      {ACCESS_KEYS.filter((key) => access[key]).map((key) => (
                        <li
                          key={key}
                          className="rounded-full bg-blue-tint px-2.5 py-0.5 text-xs font-semibold text-blue-deep"
                        >
                          {t(`booth.access.${key}`)}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex gap-2 pt-5">
                      <a href={`/b/${booth.public_code}`} className="btn btn-blue btn-sm">
                        {t('booths.open')}
                      </a>
                      <a href={`/b/${booth.public_code}/poster`} className="btn btn-ghost btn-sm">
                        {t('booths.poster')}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <p className="mt-10">
          <Link href="/official-links" className="font-bold">
            {t('booth.checkOfficial')} →
          </Link>
        </p>
      </div>
    </>
  );
}
