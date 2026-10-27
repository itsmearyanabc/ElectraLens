import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { Notice } from '@/components/ui/Page';
import { requireStaff } from '@/lib/auth';
import { getChildAreas, getTopAreas } from '@/lib/data/public';
import { localName } from '@/lib/data/types';
import { pageLocale } from '@/lib/locale';

/** O05: create the source and version; the upload itself uses a signed URL from the API. */
export default async function NewDataset({ params }: PageProps<'/[locale]/ops/datasets/new'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations();
  const areas: { id: string; label: string }[] = [];
  for (const state of await getTopAreas()) {
    areas.push({ id: state.id, label: localName(state.name, locale) });
    for (const district of await getChildAreas(state.id))
      areas.push({ id: district.id, label: `— ${localName(district.name, locale)}` });
  }
  return (
    <>
      <OpsHeader title={t('ops.datasets.new')} />
      <Panel>
        <WorkflowForm op="create_dataset" submitLabel={t('ops.datasets.create')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="source_name">
                {t('ops.datasets.newSource')}
              </label>
              <input id="source_name" name="source_name" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="publisher">
                {t('ops.datasets.publisher')}
              </label>
              <input id="publisher" name="publisher" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="basis">
                {t('ops.datasets.permission')}
              </label>
              <select id="basis" name="basis" className="field">
                {(['synthetic', 'public_official', 'authorised'] as const).map((b) => (
                  <option key={b} value={b}>
                    {t(`permission.${b}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="kind">
                {t('ops.datasets.kind')}
              </label>
              <select id="kind" name="kind" className="field">
                <option value="electoral_roll">{t('ops.datasets.kinds.electoral_roll')}</option>
                <option value="polling_stations">{t('ops.datasets.kinds.polling_stations')}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="label">
                {t('ops.datasets.label')}
              </label>
              <input id="label" name="label" required maxLength={120} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="area">
                {t('ops.datasets.area')}
              </label>
              <select id="area" name="area" className="field">
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="qualifying_date">
                {t('ops.datasets.qualifyingDate')}
              </label>
              <input id="qualifying_date" name="qualifying_date" type="date" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="stage">
                {t('ops.datasets.stage')}
              </label>
              <select id="stage" name="stage" className="field">
                {(['draft', 'final', 'supplement'] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`rollStage.${s}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </WorkflowForm>
      </Panel>
      <div className="mt-6">
        <Notice tone="caution" title={t('ops.datasets.upload')}>
          {t('ops.datasets.createdNote')} {t('ops.c.apiNeeded')}
        </Notice>
      </div>
    </>
  );
}
