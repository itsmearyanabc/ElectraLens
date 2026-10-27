import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

/** Previous / next links that keep the current filters. */
export async function Pagination({
  pathname,
  query,
  page,
  pages,
}: {
  pathname: string;
  query: Record<string, string | undefined>;
  page: number;
  pages: number;
}) {
  if (pages <= 1) return null;
  const t = await getTranslations('common');
  const href = (target: number) => ({
    pathname,
    query: Object.fromEntries(
      Object.entries({ ...query, page: target > 1 ? String(target) : undefined }).filter(
        (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '',
      ),
    ),
  });
  return (
    <nav
      aria-label={t('pageOf', { page, pages })}
      className="mt-8 flex items-center justify-between gap-4"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline" rel="prev">
          ← {t('previous')}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">{t('pageOf', { page, pages })}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-outline" rel="next">
          {t('next')} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
