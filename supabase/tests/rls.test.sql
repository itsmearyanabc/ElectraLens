-- AC-4: who can see what. Anonymous visitors see published rows and public columns only;
-- citizens see their own rows; staff see restricted rows only with MFA (aal2) and an active role.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- ---- helpers (rolled back with the test) -------------------------------------------------
create schema tests;
create table tests.ids (name text primary key, id uuid not null);
create function tests.id(p_name text) returns uuid language sql as $$
  select id from tests.ids where name = p_name $$;
create function tests.new_user(p_name text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email) values (v, 'authenticated', 'authenticated', p_name || '@test.local');
  insert into tests.ids values (p_name, v);
  return v;
end $$;
-- Runs SQL as a role and returns 'ok' or 'SQLSTATE: message'. A failure rolls back its effects.
create function tests.try_as(p_role text, p_user uuid, p_aal text, p_sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', p_role, 'aal', p_aal)::text, true);
  perform set_config('role', p_role, true);
  execute p_sql;
  perform set_config('role', 'postgres', true);
  return 'ok';
exception when others then
  return sqlstate || ': ' || sqlerrm;
end $$;
create function tests.count_as(p_role text, p_user uuid, p_aal text, p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', p_role, 'aal', p_aal)::text, true);
  perform set_config('role', p_role, true);
  execute format('select count(*) from (%s) q', p_sql) into n;
  perform set_config('role', 'postgres', true);
  return n;
end $$;

-- ---- fixture ------------------------------------------------------------------------------
select tests.new_user(n) from unnest(array['citizen', 'citizen2', 'analyst', 'admin', 'auditor', 'revoked']) n;
insert into public.staff_assignments (user_id, role) values
  (tests.id('analyst'), 'analyst'), (tests.id('admin'), 'sysadmin'),
  (tests.id('auditor'), 'security_auditor'), (tests.id('revoked'), 'analyst');

insert into tests.ids values
  ('source', gen_random_uuid()), ('v1', gen_random_uuid()), ('v2', gen_random_uuid()),
  ('run', gen_random_uuid()), ('pub', gen_random_uuid());
insert into public.data_sources (id, name, publisher, permission_basis, is_synthetic, is_public)
values (tests.id('source'), 'Test source', 'Test', 'synthetic', true, true);
insert into public.dataset_versions (id, source_id, kind, label, qualifying_date, schema_version, jurisdiction_id,
  status, original_sha256, canonical_path, canonical_root, row_count, original_path, approved_at, is_public)
select v.id, tests.id('source'), 'electoral_roll', v.label, v.qd, 'electoral_roll_v1',
       (select id from public.jurisdictions where code = 'DEMO-HR'), 'approved', repeat('a', 64),
       'datasets-restricted/x/canonical.jsonl.gz', repeat(v.c, 64), 10, 'quarantine/x/original.csv', now(), v.pub
from (values (tests.id('v1'), 'v1', date '2026-01-01', 'b', true),
             (tests.id('v2'), 'v2', date '2027-01-01', 'c', false)) v (id, label, qd, c, pub);
insert into public.audit_runs (id, baseline_version_id, target_version_id, methodology_version, status,
  output_hash, finished_at, created_by)
values (tests.id('run'), tests.id('v1'), tests.id('v2'), '2026.1', 'ready_for_review', repeat('d', 64), now(),
        tests.id('analyst'));
insert into public.anomaly_findings (run_id, finding_code, rule_id, rule_version, jurisdiction_id,
  signal_strength, finding, restricted_evidence_path, review_status, published)
select tests.id('run'), f.code, 'R05', '1.0.0',
       (select id from public.jurisdictions where code = 'DEMO-HR-AC901-P001'), f.strength::public.signal_strength,
       jsonb_build_object('finding_id', f.code), 'datasets-restricted/run/evidence.jsonl', f.review::public.review_decision, f.pub
from (values ('F-2027-000001', 'moderate', 'accepted', true),
             ('F-2027-000002', 'weak', 'accepted', false),
             ('F-2027-000003', 'strong', 'pending', false)) f (code, strength, review, pub);
insert into public.publications (id, series_id, sequence, run_id, status, manifest, manifest_hash, published_at, created_by)
values (tests.id('pub'), 'DEMO-HR', 1, tests.id('run'), 'published', '{}', repeat('e', 64), now(), tests.id('analyst'));
insert into public.aggregate_metrics (run_id, publication_id, jurisdiction_id, metric, value, published)
values (null, tests.id('pub'), (select id from public.jurisdictions where code = 'DEMO-HR'), 'deletions', 5, true),
       (tests.id('run'), null, (select id from public.jurisdictions where code = 'DEMO-HR'), 'deletions', 5, false);
insert into public.claim_submissions (submitter_id, structured, language, status, moderated_at) values
  (null, '{}', 'en', 'published', now()),
  (tests.id('citizen'), '{}', 'hi', 'checked', null);
insert into public.saved_items (user_id, item_type, item_id) values
  (tests.id('citizen'), 'publication', tests.id('pub')), (tests.id('citizen2'), 'publication', tests.id('pub'));
insert into public.audit_log (action, target_type, target_id) values ('test.event', 'test', '1');
update public.staff_assignments set revoked_at = now(), revoked_by = tests.id('admin')
where user_id = tests.id('revoked');

-- ---- anonymous visitors -------------------------------------------------------------------
select is(tests.count_as('anon', null, '', 'select id from public.anomaly_findings'), 1::bigint,
  'anon sees only the published, non-weak finding');
select is(tests.count_as('anon', null, '', 'select id from public.dataset_versions'), 1::bigint,
  'anon sees only public dataset versions');
select is(tests.count_as('anon', null, '', 'select id from public.aggregate_metrics'), 1::bigint,
  'anon sees only published aggregates');
select is(tests.count_as('anon', null, '', 'select id from public.claim_submissions'), 1::bigint,
  'anon sees only published claims');
select is(tests.count_as('anon', null, '', 'select code from public.jurisdictions') > 0, true,
  'anon can read areas');
select alike(tests.try_as('anon', null, '', 'select restricted_evidence_path from public.anomaly_findings'),
  '42501:%', 'anon cannot read the restricted evidence column');
select alike(tests.try_as('anon', null, '', 'select original_path, salt_path from public.dataset_versions'),
  '42501:%', 'anon cannot read storage paths or salts');
select alike(tests.try_as('anon', null, '', 'select approver_id from public.publication_approvals'),
  '42501:%', 'anon cannot see who approved');
select alike(tests.try_as('anon', null, '', 'select * from public.audit_log'), '42501:%',
  'anon cannot read the audit log');
select alike(tests.try_as('anon', null, '',
  format('insert into public.saved_items (user_id, item_type, item_id) values (%L, ''booth'', %L)',
         tests.id('citizen'), gen_random_uuid())),
  '42501:%', 'anon cannot write');
select alike(tests.try_as('anon', null, '', format('select public.review_finding(%L, ''accepted'', null)', gen_random_uuid())),
  '42501:%', 'anon cannot call workflow functions');

-- ---- citizens -----------------------------------------------------------------------------
select is(tests.count_as('authenticated', tests.id('citizen'), 'aal1', 'select id from public.saved_items'), 1::bigint,
  'a citizen sees only their own saved items');
select is(tests.count_as('authenticated', tests.id('citizen'), 'aal1', 'select id from public.claim_submissions'), 2::bigint,
  'a citizen sees published claims plus their own');
select is(tests.count_as('authenticated', tests.id('citizen'), 'aal1', 'select id from public.anomaly_findings'), 1::bigint,
  'a citizen sees only published findings');
select is(tests.count_as('authenticated', tests.id('citizen'), 'aal1', 'select id from public.audit_log'), 0::bigint,
  'a citizen sees no audit log rows');
select alike(tests.try_as('authenticated', tests.id('citizen'), 'aal1',
  format('insert into public.saved_items (user_id, item_type, item_id) values (%L, ''booth'', %L)',
         tests.id('citizen2'), gen_random_uuid())),
  '42501:%', 'a citizen cannot save items for someone else');
select is(tests.try_as('authenticated', tests.id('citizen'), 'aal1',
  'update public.profiles set display_name = ''Asha'''), 'ok', 'a citizen can update their profile');
select is((select count(*) from public.profiles where display_name = 'Asha'), 1::bigint,
  'and only their own profile changed');
select alike(tests.try_as('authenticated', tests.id('citizen'), 'aal1',
  'select * from public.claim_next_job(array[''ingest''::public.job_kind], ''w'', 60)'),
  '42501:%', 'a citizen cannot call worker functions');

-- ---- staff --------------------------------------------------------------------------------
select is(tests.count_as('authenticated', tests.id('analyst'), 'aal1', 'select id from public.anomaly_findings'), 1::bigint,
  'staff without MFA see only what the public sees');
select is(tests.count_as('authenticated', tests.id('analyst'), 'aal2', 'select id from public.anomaly_findings'), 3::bigint,
  'staff with MFA see weak and unreviewed findings too');
select is(tests.count_as('authenticated', tests.id('analyst'), 'aal2', 'select id from public.dataset_versions'), 2::bigint,
  'staff with MFA see unpublished dataset versions');
select is(tests.count_as('authenticated', tests.id('revoked'), 'aal2', 'select id from public.anomaly_findings'), 1::bigint,
  'a revoked role stops working immediately');
select is(tests.count_as('authenticated', tests.id('analyst'), 'aal2', 'select id from public.audit_log'), 0::bigint,
  'an analyst cannot read the audit log');
select is(tests.count_as('authenticated', tests.id('auditor'), 'aal2', 'select id from public.audit_log') >= 1, true,
  'a security auditor can read the audit log');
select is(tests.count_as('authenticated', tests.id('auditor'), 'aal1', 'select id from public.audit_log'), 0::bigint,
  'but not without MFA');
select is(tests.count_as('authenticated', tests.id('admin'), 'aal2', 'select id from public.staff_assignments'), 4::bigint,
  'a sysadmin sees every role assignment');
select is(tests.count_as('authenticated', tests.id('analyst'), 'aal2', 'select id from public.staff_assignments'), 1::bigint,
  'other staff see only their own roles');

select * from finish();
rollback;
