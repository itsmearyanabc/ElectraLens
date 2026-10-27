import { getTranslations } from 'next-intl/server';

import { OpsHeader, Panel } from '@/components/ops/OpsUi';
import { WorkflowForm } from '@/components/ops/WorkflowForm';
import { requireStaff } from '@/lib/auth';
import { pageLocale } from '@/lib/locale';

const ROLES = [
  'data_steward',
  'analyst',
  'reviewer',
  'publisher',
  'security_auditor',
  'sysadmin',
] as const;

/** O20: invitations need the admin key and run in the API; granting a role to an existing user runs here. */
export default async function InviteStaff({ params }: PageProps<'/[locale]/ops/staff/invite'>) {
  const locale = await pageLocale(params);
  await requireStaff(locale);
  const t = await getTranslations('ops');
  return (
    <>
      <OpsHeader title={t('staff.invite')} />
      <Panel title={t('staff.invite')}>
        <p className="mb-4 text-sm text-muted">{t('staff.inviteNote')}</p>
        <WorkflowForm op="invite_staff" submitLabel={t('staff.inviteSubmit')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="invite-email">
                {t('staff.email')}
              </label>
              <input id="invite-email" name="email" type="email" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="invite-role">
                {t('c.role')}
              </label>
              <select id="invite-role" name="role" className="field">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </WorkflowForm>
      </Panel>
      <Panel title={t('staff.grant')} className="mt-6">
        <WorkflowForm op="grant_role" submitLabel={t('staff.grant')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="user">
                {t('c.user')} (UUID)
              </label>
              <input
                id="user"
                name="user"
                required
                pattern="[0-9a-f-]{36}"
                className="field font-mono"
              />
            </div>
            <div>
              <label className="label" htmlFor="role">
                {t('c.role')}
              </label>
              <select id="role" name="role" className="field">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </WorkflowForm>
      </Panel>
    </>
  );
}
