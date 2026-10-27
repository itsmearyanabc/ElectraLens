import { notFound } from 'next/navigation';

import { redirect } from '@/i18n/navigation';
import { listMethodologyVersions } from '@/lib/data/public';
import { pageLocale } from '@/lib/locale';

// P07: /methodology always means the latest published version.
export default async function MethodologyIndex({ params }: PageProps<'/[locale]/methodology'>) {
  const locale = await pageLocale(params);
  const [latest] = await listMethodologyVersions();
  if (!latest) notFound();
  redirect({ href: `/methodology/${latest.version}`, locale });
}
