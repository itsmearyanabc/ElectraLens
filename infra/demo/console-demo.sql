-- Demonstration content for every staff-console panel: complaints from fictional citizens with
-- replies, claims waiting for moderation, job history, audit and security events and incidents.
-- Synthetic only. The citizen accounts have no password and cannot sign in. Fixed ids and
-- "on conflict do nothing" make it safe to run more than once.
--   npx supabase db query --linked -f infra/demo/console-demo.sql
begin;

-- Six fictional citizens (no password: they exist only as authors).
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change, email_change_token_current, phone_change,
  phone_change_token, reauthentication_token)
select id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, '',
  now(), '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('display_name', name), now() - interval '20 days', now(), '', '', '', '', '', '', '', ''
from (values
  ('00000000-0000-4000-8000-00000000c001', 'citizen1@demo.electralens.invalid', 'Ritu Saini'),
  ('00000000-0000-4000-8000-00000000c002', 'citizen2@demo.electralens.invalid', 'Arjun Mehta'),
  ('00000000-0000-4000-8000-00000000c003', 'citizen3@demo.electralens.invalid', 'Fatima Sheikh'),
  ('00000000-0000-4000-8000-00000000c004', 'citizen4@demo.electralens.invalid', 'Gurpreet Singh'),
  ('00000000-0000-4000-8000-00000000c005', 'citizen5@demo.electralens.invalid', 'Meena Kumari'),
  ('00000000-0000-4000-8000-00000000c006', 'citizen6@demo.electralens.invalid', 'Sanjay Rawat')
) as c(id, email, name)
on conflict (id) do nothing;

update public.profiles p set display_name = u.raw_user_meta_data ->> 'display_name'
from auth.users u
where u.id = p.user_id and u.email like '%@demo.electralens.invalid' and p.display_name is null;

insert into public.citizen_verifications (user_id, method, verified_name, aadhaar_last4, verified_at)
select u.id, 'demo_ekyc', u.raw_user_meta_data ->> 'display_name', lpad((1000 + row_number() over (order by u.id) * 1111 % 9000)::text, 4, '0'),
  now() - interval '15 days'
from auth.users u
where u.email like 'citizen_@demo.electralens.invalid'
on conflict (user_id) do nothing;

-- Complaints across areas and states.
insert into public.complaints (id, reference, user_id, jurisdiction_id, category, title, summary, status, created_at, updated_at)
select c.id::uuid, c.reference, c.user_id::uuid, j.id, c.category, c.title, c.summary, c.status,
  now() - c.age, now() - c.age / 3
from (values
  ('00000000-0000-4000-8000-0000000c0001', 'CMP-DEMO0001', '00000000-0000-4000-8000-00000000c001', 'DEMO-HR-AC901-P001', 'wrongful_deletion',
   'My family''s names were removed from Part 1',
   'My name and my parents'' names were on the earlier roll of Part 1 but are missing from the new roll. We have lived at the same house for twelve years and did not ask for any change.',
   'in_review', interval '6 days'),
  ('00000000-0000-4000-8000-0000000c0002', 'CMP-DEMO0002', '00000000-0000-4000-8000-00000000c002', 'DEMO-HR-AC901', 'name_missing',
   'Applied with Form 6 but my name is not on the roll',
   'I turned 18 last year and applied with Form 6 in March. I received an acknowledgement number but my name does not appear in the new roll for my constituency.',
   'submitted', interval '2 days'),
  ('00000000-0000-4000-8000-0000000c0003', 'CMP-DEMO0003', '00000000-0000-4000-8000-00000000c003', 'DEMO-HR-AC902', 'wrong_details',
   'My age and father''s name are printed wrongly',
   'My entry shows my age as 61 instead of 41 and my father''s name is misspelt. I want both corrected before the election.',
   'resolved', interval '12 days'),
  ('00000000-0000-4000-8000-0000000c0004', 'CMP-DEMO0004', '00000000-0000-4000-8000-00000000c004', 'DEMO-HR-AC903', 'booth_issue',
   'Polling booth moved without notice',
   'Our booth used to be in the primary school on our street. The new roll lists a station 4 km away and nobody in our lane was told.',
   'in_review', interval '4 days'),
  ('00000000-0000-4000-8000-0000000c0005', 'CMP-DEMO0005', '00000000-0000-4000-8000-00000000c005', 'DEMO-HR-AC903', 'accessibility',
   'No ramp at the polling station for my mother',
   'My mother uses a wheelchair. The polling station has steps at the entrance and no ramp. We need an accessible entrance or a ground-floor booth.',
   'submitted', interval '1 day'),
  ('00000000-0000-4000-8000-0000000c0006', 'CMP-DEMO0006', '00000000-0000-4000-8000-00000000c006', 'DEMO-HR-AC902', 'voter_card',
   'Lost voter card, need a replacement',
   'I lost my voter card while moving house. I would like to know how to get a replacement and whether I can still vote with another ID.',
   'closed', interval '20 days'),
  ('00000000-0000-4000-8000-0000000c0007', 'CMP-DEMO0007', '00000000-0000-4000-8000-00000000c002', 'DEMO-HR-AC901-P016', 'wrongful_deletion',
   'Neighbours deleted as "shifted" though they still live here',
   'Three families in my lane of Part 16 are marked as shifted in the new roll, but they still live here. Nobody visited to check.',
   'submitted', interval '3 hours')
) as c(id, reference, user_id, area, category, title, summary, status, age)
join public.jurisdictions j on j.code = c.area
on conflict (id) do nothing;

-- The threads: the citizen's account, then replies and status notes from the responsible staff.
insert into public.complaint_messages (id, complaint_id, author_id, author_role, body, created_at)
select m.id::uuid, m.complaint::uuid, case m.role when 'citizen' then c.user_id else staff.user_id end,
  m.role, coalesce(m.body, c.summary), c.created_at + m.after
from (values
  ('00000000-0000-4000-8000-0000000d0001', '00000000-0000-4000-8000-0000000c0001', 'citizen', null, interval '0'),
  ('00000000-0000-4000-8000-0000000d0002', '00000000-0000-4000-8000-0000000c0001', 'system', 'Status: in_review — Checking the deletion record with the booth level officer', interval '1 day'),
  ('00000000-0000-4000-8000-0000000d0003', '00000000-0000-4000-8000-0000000c0001', 'staff', 'Thank you. Part 1 shows an unusually high deletion rate in the published analysis, so we have asked the booth level officer for the Form 7 records behind these deletions. We will update you within 5 days.', interval '1 day 2 hours'),
  ('00000000-0000-4000-8000-0000000d0004', '00000000-0000-4000-8000-0000000c0002', 'citizen', null, interval '0'),
  ('00000000-0000-4000-8000-0000000d0005', '00000000-0000-4000-8000-0000000c0003', 'citizen', null, interval '0'),
  ('00000000-0000-4000-8000-0000000d0006', '00000000-0000-4000-8000-0000000c0003', 'staff', 'Please submit Form 8 on voters.eci.gov.in with a document showing your date of birth; select "Correction of entries". We have flagged your entry for the booth level officer.', interval '2 days'),
  ('00000000-0000-4000-8000-0000000d0007', '00000000-0000-4000-8000-0000000c0003', 'citizen', 'Done, I submitted Form 8 yesterday with my school certificate.', interval '4 days'),
  ('00000000-0000-4000-8000-0000000d0008', '00000000-0000-4000-8000-0000000c0003', 'system', 'Status: resolved — Correction approved in the supplementary list', interval '9 days'),
  ('00000000-0000-4000-8000-0000000d0009', '00000000-0000-4000-8000-0000000c0004', 'citizen', null, interval '0'),
  ('00000000-0000-4000-8000-0000000d0010', '00000000-0000-4000-8000-0000000c0004', 'system', 'Status: in_review', interval '1 day'),
  ('00000000-0000-4000-8000-0000000d0011', '00000000-0000-4000-8000-0000000c0005', 'citizen', null, interval '0'),
  ('00000000-0000-4000-8000-0000000d0012', '00000000-0000-4000-8000-0000000c0006', 'citizen', null, interval '0'),
  ('00000000-0000-4000-8000-0000000d0013', '00000000-0000-4000-8000-0000000c0006', 'staff', 'You can apply for a replacement EPIC with Form 8 on voters.eci.gov.in. On polling day you can also vote with another approved photo ID such as Aadhaar, passport or driving licence, as long as your name is on the roll.', interval '1 day'),
  ('00000000-0000-4000-8000-0000000d0014', '00000000-0000-4000-8000-0000000c0006', 'system', 'Status: closed — Information given', interval '2 days'),
  ('00000000-0000-4000-8000-0000000d0015', '00000000-0000-4000-8000-0000000c0007', 'citizen', null, interval '0')
) as m(id, complaint, role, body, after)
join public.complaints c on c.id = m.complaint::uuid
left join lateral (
  select a.user_id from public.staff_assignments a
  where a.revoked_at is null and a.role in ('reviewer', 'sysadmin')
  order by (a.role = 'reviewer') desc limit 1
) staff on true
on conflict (id) do nothing;

-- Claims waiting for moderation.
insert into public.claim_submissions (id, submitter_id, text, structured, language, status, created_at)
values
  ('00000000-0000-4000-8000-0000000e0001', '00000000-0000-4000-8000-00000000c004',
   'Over 1,000 names were deleted in Gurugram DEMO-1 this year.',
   '{"area_code": "DEMO-HR-AC901", "metric": "deletions", "comparator": "more_than", "value": 1000, "claim_type": "quantity"}',
   'en', 'in_moderation', now() - interval '5 hours'),
  ('00000000-0000-4000-8000-0000000e0002', '00000000-0000-4000-8000-00000000c005',
   'फ़रीदाबाद में नए मतदाताओं की संख्या घटाने से ज़्यादा है।',
   '{"area_code": "DEMO-HR-D02", "metric": "net_change", "comparator": "more_than", "value": 0, "claim_type": "quantity"}',
   'hi', 'in_moderation', now() - interval '1 day'),
  ('00000000-0000-4000-8000-0000000e0003', '00000000-0000-4000-8000-00000000c006',
   'About 200 voters were added in Gurugram DEMO-2.',
   '{"area_code": "DEMO-HR-AC902", "metric": "additions", "comparator": "about", "value": 200, "claim_type": "quantity"}',
   'en', 'in_moderation', now() - interval '2 days')
on conflict (id) do nothing;

-- Job history (finished jobs only, so the worker never picks these up).
insert into public.jobs (id, kind, status, payload, input_hash, attempts, last_error, result, created_at, updated_at)
select j.id::uuid, j.kind::public.job_kind, j.status::public.job_status,
  jsonb_build_object('kind', j.kind, 'demo', true), md5(j.id) || md5(j.id || 'x'),
  j.attempts, j.err, j.res::jsonb, now() - j.age, now() - j.age + interval '3 minutes'
from (values
  ('00000000-0000-4000-8000-0000000f0001', 'ingest', 'succeeded', 1, null, '{"rows": 111365, "rejected": 12}', interval '9 days'),
  ('00000000-0000-4000-8000-0000000f0002', 'ingest', 'succeeded', 1, null, '{"rows": 117025, "rejected": 9}', interval '9 days'),
  ('00000000-0000-4000-8000-0000000f0003', 'analyze', 'succeeded', 1, null, '{"findings": 25, "tests": 3120}', interval '8 days'),
  ('00000000-0000-4000-8000-0000000f0004', 'publish_prepare', 'succeeded', 1, null, '{"artifacts": 3}', interval '7 days'),
  ('00000000-0000-4000-8000-0000000f0005', 'ots_stamp', 'succeeded', 1, null, '{"calendars": 3}', interval '7 days'),
  ('00000000-0000-4000-8000-0000000f0006', 'ots_upgrade', 'failed', 2, 'calendar not yet confirmed in a Bitcoin block; will retry', null, interval '6 days'),
  ('00000000-0000-4000-8000-0000000f0007', 'notify', 'succeeded', 1, null, '{"emails": 14}', interval '5 days'),
  ('00000000-0000-4000-8000-0000000f0008', 'retention', 'succeeded', 1, null, '{"removed": 0}', interval '1 day'),
  ('00000000-0000-4000-8000-0000000f0009', 'benchmark', 'dead', 3, 'synthetic benchmark set missing for state MP', null, interval '3 days')
) as j(id, kind, status, attempts, err, res, age)
on conflict (id) do nothing;

-- Audit log and security events (append-only tables: inserted once, guarded by a marker).
do $$
declare
  admin uuid := (select user_id from public.staff_assignments where role = 'sysadmin' and revoked_at is null limit 1);
  reviewer uuid := (select user_id from public.staff_assignments where role = 'reviewer' and revoked_at is null limit 1);
  steward uuid := (select user_id from public.staff_assignments where role = 'data_steward' and revoked_at is null limit 1);
  publisher uuid := (select user_id from public.staff_assignments where role = 'publisher' and revoked_at is null limit 1);
begin
  if exists (select 1 from public.audit_log where details ? 'demo_console') then return; end if;
  insert into public.audit_log (at, actor_id, actor_roles, action, target_type, target_id, reason, details) values
    (now() - interval '9 days', steward, '{data_steward}', 'dataset.upload_confirmed', 'dataset_version', 'roll_v1', null, '{"demo_console": true, "rows": 111365}'),
    (now() - interval '9 days', steward, '{data_steward}', 'dataset.approved', 'dataset_version', 'roll_v2', 'Validation report clean', '{"demo_console": true}'),
    (now() - interval '8 days', reviewer, '{reviewer}', 'finding.reviewed', 'finding', 'F-2027-000008', 'Deletion spike confirmed against Form 7 counts', '{"demo_console": true, "decision": "accepted"}'),
    (now() - interval '8 days', reviewer, '{reviewer}', 'finding.reviewed', 'finding', 'F-2027-000014', 'Explained by a recorded part reorganisation', '{"demo_console": true, "decision": "downgraded"}'),
    (now() - interval '7 days', publisher, '{publisher}', 'publication.approved', 'publication', 'DEMO-HR-1', null, '{"demo_console": true}'),
    (now() - interval '3 days', admin, '{sysadmin}', 'staff.role_granted', 'staff_assignment', 'reviewer', 'Area reviewer for Gurugram', '{"demo_console": true}'),
    (now() - interval '2 days', reviewer, '{reviewer}', 'claim.moderated', 'claim', 'demo', 'Matches published aggregates', '{"demo_console": true, "publish": true}'),
    (now() - interval '20 hours', reviewer, '{reviewer}', 'complaint.status', 'complaint', 'CMP-DEMO0001', 'Checking the deletion record with the booth level officer', '{"demo_console": true, "to": "in_review"}'),
    (now() - interval '6 hours', admin, '{sysadmin}', 'staff.mfa_reset', 'user', 'demo', 'Lost phone', '{"demo_console": true}'),
    (now() - interval '2 hours', reviewer, '{reviewer}', 'complaint.status', 'complaint', 'CMP-DEMO0004', null, '{"demo_console": true, "to": "in_review"}');
  insert into public.security_events (at, user_id, event_type, details) values
    (now() - interval '3 days', null, 'auth.staff_sign_in_failed', '{"demo_console": true, "stage": 0, "attempt": 1}'),
    (now() - interval '3 days', null, 'auth.staff_sign_in_failed', '{"demo_console": true, "stage": 0, "attempt": 2}'),
    (now() - interval '3 days', null, 'auth.staff_sign_in_failed', '{"demo_console": true, "stage": 0, "attempt": 3}'),
    (now() - interval '3 days', null, 'auth.staff_sign_in_locked', '{"demo_console": true, "stage": 1, "seconds": 30}'),
    (now() - interval '30 hours', null, 'turnstile.failed', '{"demo_console": true, "action": "claim_submit"}'),
    (now() - interval '20 hours', reviewer, 'auth.mfa_verified', '{"demo_console": true}'),
    (now() - interval '9 hours', null, 'rate_limit.exceeded', '{"demo_console": true, "route": "/api/v1/claims/check"}'),
    (now() - interval '4 hours', null, 'auth.staff_sign_in_failed', '{"demo_console": true, "stage": 0, "attempt": 1}'),
    (now() - interval '1 hour', admin, 'auth.mfa_verified', '{"demo_console": true}');
end $$;

insert into public.incident_records (id, opened_at, severity, title, summary, status, closed_at, public_note, created_by)
values
  ('00000000-0000-4000-8000-0000000a0001', now() - interval '6 days', 'medium',
   'Repeated failed staff sign-ins from one network',
   'Twelve failed staff sign-ins in ten minutes triggered the lockout. No account was accessed; the source network was blocked at the firewall.',
   'resolved', now() - interval '5 days', 'Lockout worked as designed; no data accessed.',
   (select user_id from public.staff_assignments where role = 'sysadmin' and revoked_at is null limit 1)),
  ('00000000-0000-4000-8000-0000000a0002', now() - interval '1 day', 'low',
   'OpenTimestamps calendar slow to confirm',
   'The OTS upgrade job failed twice because the calendar had not yet confirmed in a Bitcoin block. The anchor on Hoodi is unaffected.',
   'contained', null, null,
   (select user_id from public.staff_assignments where role = 'sysadmin' and revoked_at is null limit 1))
on conflict (id) do nothing;

commit;
