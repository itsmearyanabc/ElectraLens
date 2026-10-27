'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';

import { checkClaim, type CheckState } from '@/app/[locale]/(site)/claims/actions';
import { Link } from '@/i18n/navigation';

export interface AreaOption {
  code: string;
  label: string;
}

const METRICS = ['additions', 'deletions', 'corrections', 'net_change', 'electors_target'] as const;
const COMPARATORS = ['about', 'more_than', 'less_than'] as const;

const VERDICT_STYLE = {
  consistent: 'border-blue bg-blue-tint',
  contradicted: 'border-danger bg-danger-tint',
  disputed: 'border-saffron bg-saffron-tint',
  cannot_establish: 'border-line bg-mist',
} as const;

export function ClaimForm({ areas }: { areas: AreaOption[] }) {
  const t = useTranslations('claimForm');
  const [state, action, pending] = useActionState<CheckState, FormData>(checkClaim, {
    status: 'idle',
  });
  const [claimType, setClaimType] = useState<'quantity' | 'cause_or_intent'>('quantity');
  const number = (value: number) => new Intl.NumberFormat('en-IN').format(value);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <form action={action} className="card space-y-5 p-6" noValidate>
        <fieldset>
          <legend className="label">{t('typeLegend')}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(['quantity', 'cause_or_intent'] as const).map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border-2 p-3 ${claimType === type ? 'border-blue bg-blue-tint' : 'border-line'}`}
              >
                <input
                  type="radio"
                  name="claimType"
                  value={type}
                  checked={claimType === type}
                  onChange={() => setClaimType(type)}
                  className="mt-1.5 accent-[#1546b0]"
                />
                <span>
                  <span className="block font-semibold text-navy">{t(`type.${type}`)}</span>
                  <span className="text-sm text-muted">{t(`typeHelp.${type}`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="claim-area" className="label">
            {t('area')}
          </label>
          <select
            id="claim-area"
            name="area"
            required
            className="field"
            defaultValue={areas[0]?.code}
          >
            {areas.map((area) => (
              <option key={area.code} value={area.code}>
                {area.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="claim-metric" className="label">
              {t('metric')}
            </label>
            <select id="claim-metric" name="metric" className="field" defaultValue="deletions">
              {METRICS.map((metric) => (
                <option key={metric} value={metric}>
                  {t(`metrics.${metric}`)}
                </option>
              ))}
            </select>
          </div>
          {claimType === 'quantity' ? (
            <div>
              <label htmlFor="claim-comparator" className="label">
                {t('comparator')}
              </label>
              <select
                id="claim-comparator"
                name="comparator"
                className="field"
                defaultValue="about"
              >
                {COMPARATORS.map((comparator) => (
                  <option key={comparator} value={comparator}>
                    {t(`comparators.${comparator}`)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="comparator" value="about" />
          )}
        </div>

        {claimType === 'quantity' && (
          <div>
            <label htmlFor="claim-value" className="label">
              {t('value')}
            </label>
            <input
              id="claim-value"
              name="value"
              inputMode="numeric"
              required
              className="field"
              placeholder="1500"
              autoComplete="off"
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? t('checking') : t('check')}
        </button>
        <p className="text-sm text-muted">{t('privacy')}</p>
      </form>

      <div aria-live="polite" role="status">
        {state.status === 'invalid' && (
          <div className="rounded-lg border-l-4 border-danger bg-danger-tint p-4 font-semibold text-danger">
            {t('invalid')}
          </div>
        )}
        {state.status === 'done' && (
          <div
            className={`rounded-[var(--radius-card)] border-2 p-6 ${VERDICT_STYLE[state.result.verdict]}`}
          >
            <p className="text-sm font-bold tracking-wide text-muted uppercase">
              {t('verdictLabel')}
            </p>
            <p className="mt-1 text-2xl font-bold text-navy">
              {t(`verdict.${state.result.verdict}`)}
            </p>
            <p className="mt-3">{t(`reason.${state.result.reason}`)}</p>
            {state.result.published !== null && (
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="font-semibold text-muted">{t('yourFigure')}</dt>
                <dd className="tabular-nums">
                  {t(`comparators.${state.claim.comparator}`)} {number(state.claim.value)}
                </dd>
                <dt className="font-semibold text-muted">{t('publishedFigure')}</dt>
                <dd className="font-bold tabular-nums text-navy">
                  {number(state.result.published)}
                </dd>
                <dt className="font-semibold text-muted">{t('tolerance')}</dt>
                <dd className="tabular-nums">± {number(state.result.tolerance ?? 0)}</dd>
                <dt className="font-semibold text-muted">{t('method')}</dt>
                <dd className="hash">{state.result.method}</dd>
              </dl>
            )}
            {state.result.publicationId && (
              <Link
                href={`/publications/${state.result.publicationId}`}
                className="mt-4 inline-block font-semibold"
              >
                {t('source', {
                  series: state.result.series ?? '',
                  sequence: state.result.sequence ?? 0,
                })}{' '}
                →
              </Link>
            )}
          </div>
        )}
        {state.status === 'idle' && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-mist p-6 text-muted">
            {t('idle')}
          </div>
        )}
      </div>
    </div>
  );
}
