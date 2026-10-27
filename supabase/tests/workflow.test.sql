-- AC-5 and DF1-DF3: the whole path from upload to publication, with every separation-of-duties
-- rule exercised. One person may hold several roles, but the database refuses to let them play
-- two parts in the same publication, or approve work they created.
begin;
create extension if not exists pgtap with schema extensions;
select plan(47);

-- ---- helpers -----------------------------------------------------------------------------
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
-- Like try_as, but returns the query's single value (or the error).
create function tests.value_as(p_role text, p_user uuid, p_aal text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', p_role, 'aal', p_aal)::text, true);
  perform set_config('role', p_role, true);
  execute format('select (%s)::text', p_sql) into v;
  perform set_config('role', 'postgres', true);
  return v;
exception when others then
  return 'ERR ' || sqlstate || ': ' || sqlerrm;
end $$;
create function tests.keep(p_name text, p_value text) returns text language plpgsql as $$
begin
  insert into tests.ids values (p_name, p_value::uuid);
  return p_value;
end $$;
create function tests.as_staff(p_name text, p_sql text) returns text language sql as $$
  select tests.try_as('authenticated', tests.id(p_name), 'aal2', p_sql) $$;
create function tests.as_service(p_sql text) returns text language sql as $$
  select tests.try_as('service_role', null, '', p_sql) $$;

-- ---- people and roles (bootstrap inserts, as the service would) ----------------------------
select tests.new_user(n)
from unnest(array['steward', 'analyst', 'reviewer', 'publisher', 'dual', 'admin', 'citizen']) n;
insert into public.staff_assignments (user_id, role, jurisdiction_id)
select tests.id(u), r::public.staff_role,
       case when u = 'admin' then null else (select id from public.jurisdictions where code = 'DEMO-HR') end
from (values ('steward', 'data_steward'), ('analyst', 'analyst'), ('analyst', 'reviewer'),
             ('analyst', 'publisher'), ('reviewer', 'reviewer'), ('publisher', 'publisher'),
             ('dual', 'reviewer'), ('dual', 'publisher'), ('admin', 'sysadmin')) a (u, r);
insert into tests.ids values ('state', (select id from public.jurisdictions where code = 'DEMO-HR'));

-- ---- DF1: datasets ---------------------------------------------------------------------------
select is(tests.try_as('authenticated', tests.id('steward'), 'aal1',
  'select public.create_data_source(''S'', ''P'', null, ''synthetic'', null, true)'),
  'P0001: auth.forbidden', 'no MFA, no staff action');
select ok(tests.keep('source', tests.value_as('authenticated', tests.id('steward'), 'aal2',
  'public.create_data_source(''Synthetic test'', ''ElectraLens'', null, ''synthetic'', null, true)')) is not null,
  'a steward creates a data source');
select ok(tests.keep('v1', tests.value_as('authenticated', tests.id('steward'), 'aal2', format(
  'public.create_dataset_version(%L, ''electoral_roll'', ''2026'', ''2026-01-01'', ''final'', %L)',
  tests.id('source'), tests.id('state')))) is not null, 'a steward creates the baseline version');
select ok(tests.keep('v2', tests.value_as('authenticated', tests.id('steward'), 'aal2', format(
  'public.create_dataset_version(%L, ''electoral_roll'', ''2027'', ''2027-01-01'', ''final'', %L)',
  tests.id('source'), tests.id('state')))) is not null, 'and the target version');
select is(tests.as_staff('steward', format('select public.mark_dataset_uploaded(%L, ''elsewhere/x.csv'')', tests.id('v1'))),
  'P0001: workflow.bad_path', 'uploads must be in the version''s quarantine folder');
select is(tests.as_staff('steward', format('select public.mark_dataset_uploaded(%L, %L)', tests.id(v),
  'quarantine/' || tests.id(v) || '/original.csv')), 'ok', 'upload recorded and ingest job queued for ' || v)
from unnest(array['v1', 'v2']) v;
select is((select count(*) from public.jobs where kind = 'ingest'), 2::bigint, 'two ingest jobs queued');
select is(tests.as_service(format(
  'select public.complete_ingestion(%L, true, ''{}'', %L, ''datasets-restricted/x'', %L, 100, ''datasets-restricted/salt'')',
  tests.id(v), repeat('a', 64), repeat(c, 64))), 'ok', 'the worker validates ' || v)
from (values ('v1', 'b'), ('v2', 'c')) x (v, c);
select is(tests.as_staff('analyst', format('select public.approve_dataset_version(%L)', tests.id('v1'))),
  'P0001: auth.forbidden', 'an analyst cannot approve datasets');
select is(tests.as_staff('steward', format('select public.approve_dataset_version(%L)', tests.id(v))), 'ok',
  'the steward approves ' || v)
from unnest(array['v1', 'v2']) v;

-- ---- DF2: the audit run ----------------------------------------------------------------------
select is(tests.as_staff('analyst', format('select public.request_audit_run(%L, %L, ''2026.1'')',
  tests.id('v2'), tests.id('v1'))), 'P0001: workflow.baseline_not_earlier', 'the baseline must be the earlier roll');
select ok(tests.keep('run', tests.value_as('authenticated', tests.id('analyst'), 'aal2',
  format('public.request_audit_run(%L, %L, ''2026.1'')', tests.id('v1'), tests.id('v2')))) is not null,
  'the analyst requests a run');
select is(tests.value_as('authenticated', tests.id('analyst'), 'aal2',
  format('public.request_audit_run(%L, %L, ''2026.1'')', tests.id('v1'), tests.id('v2'))),
  tests.id('run')::text, 'requesting the same comparison again returns the same run');
select is(tests.as_service(format('select public.start_run(%L, ''src:test'', null)', tests.id('run'))), 'ok',
  'the worker starts the run');
insert into public.anomaly_findings (run_id, finding_code, rule_id, rule_version, jurisdiction_id, signal_strength, finding)
select tests.id('run'), f.code, f.rule, '1.0.0', (select id from public.jurisdictions where code = 'DEMO-HR-AC901-P001'),
       f.strength::public.signal_strength, jsonb_build_object('finding_id', f.code)
from (values ('F-2027-000001', 'R05', 'moderate'), ('F-2027-000002', 'R06', 'weak')) f (code, rule, strength);
insert into tests.ids select 'f' || right(finding_code, 1), id from public.anomaly_findings where run_id = tests.id('run');
select is(tests.as_service(format('select public.complete_run(%L, true, ''{}'', %L, ''{}'', null)',
  tests.id('run'), repeat('d', 64))), 'ok', 'the worker completes the run');

-- ---- review ---------------------------------------------------------------------------------
select is(tests.as_staff('analyst', format('select public.review_finding(%L, ''accepted'', null)', tests.id('f1'))),
  'P0001: workflow.run_creator_cannot_review', 'the run''s creator cannot review its findings');
select is(tests.as_staff('reviewer', format('select public.review_finding(%L, ''rejected'', null)', tests.id('f2'))),
  'P0001: workflow.reason_required', 'rejecting needs a reason');
select is(tests.as_staff('reviewer', format('select public.review_finding(%L, ''accepted'', null)', tests.id('f1'))), 'ok',
  'a reviewer accepts a finding');
select is(tests.as_staff('reviewer', format('select public.review_finding(%L, ''rejected'', ''Explained by the part split'')',
  tests.id('f2'))), 'ok', 'and rejects another with a reason');

-- ---- DF3: publication and the two-person rule -----------------------------------------------
select is(tests.as_staff('citizen', format('select public.create_publication(%L)', tests.id('run'))),
  'P0001: auth.forbidden', 'a citizen cannot create a publication');
select ok(tests.keep('pub', tests.value_as('authenticated', tests.id('publisher'), 'aal2',
  format('public.create_publication(%L)', tests.id('run')))) is not null, 'a publisher creates a publication');
select is(tests.as_staff('publisher', format('select public.create_publication(%L)', tests.id('run'))),
  'P0001: workflow.publication_in_progress', 'only one publication in flight per series');
select is(tests.as_service(format('select public.submit_publication(%L, %L, %L, null, null, null, null)',
  tests.id('pub'), '{"series_id":"DEMO-HR","sequence":2,"previous_manifest_hash":null}', repeat('f', 64))),
  'P0001: publication.manifest_mismatch', 'the manifest must match the publication');
select is(tests.as_service(format('select public.submit_publication(%L, %L, %L, null, null, null, null)',
  tests.id('pub'), '{"series_id":"DEMO-HR","sequence":1,"previous_manifest_hash":null}', repeat('f', 64))), 'ok',
  'the worker submits the manifest for review');
select is(tests.as_staff('publisher', format('select public.approve_publication(%L, ''publish'', %L, ''approve'', null)',
  tests.id('pub'), repeat('f', 64))), 'P0001: workflow.review_first', 'the review step comes first');
select is(tests.as_staff('reviewer', format('select public.approve_publication(%L, ''review'', %L, ''approve'', null)',
  tests.id('pub'), repeat('0', 64))), 'P0001: workflow.stale_manifest', 'approvals bind to the exact manifest hash');
select is(tests.as_staff('analyst', format('select public.approve_publication(%L, ''review'', %L, ''approve'', null)',
  tests.id('pub'), repeat('f', 64))), 'P0001: workflow.run_creator_cannot_approve', 'the run''s creator cannot approve');
select is(tests.as_staff('dual', format('select public.approve_publication(%L, ''review'', %L, ''approve'', null)',
  tests.id('pub'), repeat('f', 64))), 'ok', 'a reviewer approves the review step');
select is(tests.as_staff('dual', format('select public.approve_publication(%L, ''publish'', %L, ''approve'', null)',
  tests.id('pub'), repeat('f', 64))), 'P0001: workflow.same_person', 'the same person cannot also approve publishing');
select is(tests.try_as('postgres', null, '', format(
  'insert into public.publication_approvals (publication_id, approver_id, step, manifest_hash, decision) values (%L, %L, ''publish'', %L, ''approve'')',
  tests.id('pub'), tests.id('dual'), repeat('f', 64))), '23505: duplicate key value violates unique constraint "publication_approvals_publication_id_approver_id_key"',
  'the table itself refuses a second approval by one person');
select is(tests.value_as('authenticated', tests.id('publisher'), 'aal2', format(
  'public.approve_publication(%L, ''publish'', %L, ''approve'', null)', tests.id('pub'), repeat('f', 64))),
  'approved', 'a different publisher approves publishing');
select alike(tests.as_staff('publisher', format('select public.mark_published(%L, ''hoodi'', 560048, null, %L, 1, 0)',
  tests.id('pub'), '0x' || repeat('1', 64))), '42501:%', 'only the anchor service can mark a publication published');
select is(tests.as_service(format('select public.mark_published(%L, ''hoodi'', 560048, %L, %L, 123, 0)',
  tests.id('pub'), '0x' || repeat('2', 40), '0x' || repeat('1', 64))), 'ok', 'the anchor service publishes');
select is((select status::text from public.publications where id = tests.id('pub')), 'published', 'publication is live');
select is((select array_agg(finding_code order by finding_code) from public.anomaly_findings where published),
  array['F-2027-000001'], 'only the accepted, non-weak finding is published');
select is(tests.try_as('postgres', null, '', format('update public.publications set manifest_hash = %L where id = %L',
  repeat('9', 64), tests.id('pub'))), 'P0001: publication.manifest_frozen', 'a published manifest can never change');
select is(tests.as_staff('publisher', format('select public.retract_publication(%L, ''short'')', tests.id('pub'))),
  'P0001: workflow.reason_required', 'a retraction needs a real reason');
select is(tests.as_staff('publisher', format('select public.retract_publication(%L, ''Source file was the wrong version'')',
  tests.id('pub'))), 'ok', 'a publisher retracts with a reason');
select ok((select count(*) from public.audit_log where target_id = tests.id('pub')::text) >= 5,
  'every publication step is in the audit log');

-- ---- staff management and methodology ---------------------------------------------------------
select is(tests.as_staff('admin', format('select public.grant_role(%L, ''reviewer'', null)', tests.id('admin'))),
  'P0001: workflow.self_grant', 'an admin cannot grant roles to themselves');
select is(tests.as_staff('publisher', format('select public.grant_role(%L, ''reviewer'', null)', tests.id('citizen'))),
  'P0001: auth.forbidden', 'only a sysadmin grants roles');
select is(tests.as_staff('admin', format('select public.grant_role(%L, ''reviewer'', null)', tests.id('citizen'))), 'ok',
  'a sysadmin grants a role');
select is(tests.as_staff('analyst', format('select public.create_methodology_draft(''2026.2'', %L, %L, ''test'')',
  '{"version":"2026.2"}', repeat('7', 64))), 'ok', 'an analyst drafts a methodology');
select is(tests.as_staff('analyst', 'select public.freeze_methodology(''2026.2'')'), 'P0001: workflow.same_person',
  'the author cannot freeze their own methodology');

select * from finish();
rollback;
