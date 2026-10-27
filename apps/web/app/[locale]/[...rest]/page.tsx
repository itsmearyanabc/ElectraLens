import { notFound } from 'next/navigation';

import { pageLocale } from '@/lib/locale';

// Unknown paths under a locale render the localised 404 page.
export default async function CatchAll({ params }: PageProps<'/[locale]/[...rest]'>) {
  await pageLocale(params);
  notFound();
}
