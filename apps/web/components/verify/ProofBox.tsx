import { getTranslations } from 'next-intl/server';

/** B10.07: what a MATCH proves and what it doesn't, next to every verification. */
export async function ProofBox() {
  const t = await getTranslations('verify');
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card border-t-4 border-t-blue p-5">
        <h2 className="text-lg">{t('proves')}</h2>
        <ul className="mt-3 space-y-2">
          {(['proves1', 'proves2', 'proves3'] as const).map((key) => (
            <li key={key} className="flex gap-2">
              <span aria-hidden="true" className="font-bold text-blue">
                ✓
              </span>
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
      <div className="card border-t-4 border-t-saffron p-5">
        <h2 className="text-lg">{t('doesNotProve')}</h2>
        <ul className="mt-3 space-y-2">
          {(['doesNotProve1', 'doesNotProve2', 'doesNotProve3'] as const).map((key) => (
            <li key={key} className="flex gap-2">
              <span aria-hidden="true" className="font-bold text-orange-ink">
                ✕
              </span>
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
