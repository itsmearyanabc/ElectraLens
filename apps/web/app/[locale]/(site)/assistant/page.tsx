import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { VoiceControls } from '@/components/assistant/VoiceControls';
import { Icon } from '@/components/ui/Icon';
import { ExternalLink, PageHeader } from '@/components/ui/Page';
import { getPathname, Link } from '@/i18n/navigation';
import { pageLocale } from '@/lib/locale';
import { OFFICIAL } from '@/lib/official';
import { oneOf } from '@/lib/params';

// B12.01: a fixed decision tree. No language model, no free text, nothing about the person stored.
type StepId =
  | 'start'
  | 'check'
  | 'apply'
  | 'form6'
  | 'form8'
  | 'form7'
  | 'form6a'
  | 'booth'
  | 'change'
  | 'claim';

interface StepDef {
  options?: StepId[];
  official?: ('portal' | 'search')[];
  internal?: [href: string, key: string][];
  parent?: StepId;
}

const STEPS: Record<StepId, StepDef> = {
  start: { options: ['check', 'apply', 'booth', 'change', 'claim'] },
  check: { official: ['search'], parent: 'start' },
  apply: { options: ['form6', 'form8', 'form7', 'form6a'], parent: 'start' },
  form6: { official: ['portal'], parent: 'apply' },
  form8: { official: ['portal'], parent: 'apply' },
  form7: { official: ['portal'], parent: 'apply' },
  form6a: { official: ['portal'], parent: 'apply' },
  booth: { official: ['search'], internal: [['/booths', 'browse']], parent: 'start' },
  change: {
    internal: [
      ['/compare', 'compare'],
      ['/findings', 'findings'],
    ],
    parent: 'start',
  },
  claim: { internal: [['/claims', 'go']], parent: 'start' },
};
const STEP_IDS = Object.keys(STEPS) as StepId[];
const OFFICIAL_URL = { portal: OFFICIAL.votersPortal, search: OFFICIAL.electoralSearch } as const;

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/assistant'>): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'assistant' });
  return { title: t('metaTitle') };
}

export default async function AssistantPage({
  params,
  searchParams,
}: PageProps<'/[locale]/assistant'>) {
  const locale = await pageLocale(params);
  const t = await getTranslations();
  const stepId = oneOf(await searchParams, 'step', STEP_IDS) ?? 'start';
  const step = STEPS[stepId];
  const base = `assistant.steps.${stepId}`;
  const question = t(`${base}.question`);
  const body = t.has(`${base}.body`) ? t(`${base}.body`) : null;
  const options = (step.options ?? []).map((id) => ({
    id,
    label: t(`${base}.options.${id}`),
    href: getPathname({ href: { pathname: '/assistant', query: { step: id } }, locale }),
  }));

  return (
    <>
      <PageHeader
        eyebrow={t('assistant.eyebrow')}
        title={t('assistant.title')}
        lede={t('assistant.lede')}
      />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="step-title" className="card-float p-7 sm:p-10">
          {step.parent && (
            <Link
              href={{
                pathname: '/assistant',
                query: step.parent === 'start' ? {} : { step: step.parent },
              }}
              className="mb-6 inline-flex items-center gap-1 text-sm font-bold no-underline"
            >
              ← {t('common.back')}
            </Link>
          )}
          <h2 id="step-title" className="text-[2rem] sm:text-[2.5rem]">
            {question}
          </h2>
          {body && <p className="mt-4 max-w-2xl text-lg text-muted">{body}</p>}

          {options.length > 0 && (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {options.map((option, index) => (
                <li key={option.id}>
                  <Link
                    href={{ pathname: '/assistant', query: { step: option.id } }}
                    className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-white p-5 font-bold text-ink no-underline transition-all hover:-translate-y-0.5 hover:border-saffron hover:shadow-[var(--shadow-soft)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-tint font-mono text-sm text-orange-ink">
                      {index + 1}
                    </span>
                    <span className="flex-1">{option.label}</span>
                    <Icon
                      name="arrow"
                      size={18}
                      className="text-subtle transition-transform group-hover:translate-x-1 group-hover:text-saffron"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {(step.official || step.internal) && (
            <div className="mt-8 flex flex-wrap gap-3">
              {step.internal?.map(([href, key]) => (
                <Link key={href} href={href} className="btn btn-primary">
                  {t(`${base}.${key}`)} <Icon name="arrow" size={18} />
                </Link>
              ))}
              {step.official?.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center rounded-full border border-line px-5 py-3"
                >
                  <ExternalLink
                    href={OFFICIAL_URL[key]}
                    official
                    externalLabel={t('common.external')}
                    officialLabel={t('common.official')}
                  >
                    {t(`officialLinks.${key}`)}
                  </ExternalLink>
                </span>
              ))}
            </div>
          )}

          <div className="mt-10">
            <VoiceControls text={[question, body].filter(Boolean).join('. ')} options={options} />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card p-6">
            <p className="mono-label">{t('common.official')}</p>
            <p className="mt-3">{t('assistant.officialNote')}</p>
            <a href={OFFICIAL.helpline} className="btn btn-blue btn-sm mt-5">
              {t('assistant.helpline')}
            </a>
          </div>
          {stepId !== 'start' && (
            <Link href="/assistant" className="btn btn-outline w-full">
              {t('assistant.startOver')}
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
