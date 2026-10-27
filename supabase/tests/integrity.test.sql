-- Integrity rules the database enforces on its own: append-only audit log, frozen methodology,
-- immutable dataset roots, valid area tree, and constraints that stop bad data at the door.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into public.audit_log (action, target_type, target_id) values ('test.event', 'test', '1');

select throws_ok($$update public.audit_log set reason = 'edited'$$, 'P0001', 'audit_log.append_only',
  'the audit log cannot be edited');
select throws_ok($$delete from public.audit_log$$, 'P0001', 'audit_log.append_only',
  'the audit log cannot be deleted');
select throws_ok($$truncate public.audit_log$$, 'P0001', 'audit_log.append_only',
  'the audit log cannot be truncated');
select throws_ok($$set local role service_role; update public.audit_log set reason = 'x'$$, '42501', null,
  'even the service role can only append');

select throws_ok(
  $$update public.methodology_versions set params = '{}' where version = '2026.1'$$,
  'P0001', 'methodology.frozen', 'a published methodology cannot change');
select throws_ok(
  $$update public.methodology_versions set status = 'draft' where version = '2026.1'$$,
  'P0001', 'workflow.illegal_transition', 'and cannot go back to draft');

select throws_ok(
  $$insert into public.jurisdictions (code, level, parent_id, name)
    values ('DEMO-HR-PX', 'part', (select id from public.jurisdictions where code = 'DEMO-HR'), '{"en":"x"}')$$,
  'P0001', 'jurisdiction.bad_parent', 'a part must sit under a constituency');
select throws_ok(
  $$insert into public.jurisdictions (code, level, name) values ('DEMO-X', 'district', '{"en":"x"}')$$,
  '23514', null, 'only a state may have no parent');

insert into public.data_sources (id, name, publisher, permission_basis, is_synthetic)
values ('00000000-0000-4000-8000-0000000000a1', 'S', 'P', 'synthetic', true);
insert into public.dataset_versions (id, source_id, kind, label, qualifying_date, schema_version, jurisdiction_id,
  status, original_sha256, canonical_root, row_count)
values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'electoral_roll', 'v',
        '2026-01-01', 'electoral_roll_v1', (select id from public.jurisdictions where code = 'DEMO-HR'),
        'validated', repeat('a', 64), repeat('b', 64), 10);
select throws_ok(
  $$update public.dataset_versions set canonical_root = repeat('c', 64) where id = '00000000-0000-4000-8000-0000000000b1'$$,
  'P0001', 'dataset.immutable', 'a validated dataset''s root can never change');

select throws_ok(
  $$insert into public.polling_stations (public_code, station_code, ac_id, parts_served, name, address, lat, lng, is_synthetic)
    values ('ABCDEFGHJK', 'DEMO-HR-AC901-PS001', (select id from public.jurisdictions where code = 'DEMO-HR-AC901'),
            '{1}', '{"en":"x"}', '{"en":"x"}', 28.4, 77.0, true)$$,
  '23514', null, 'a synthetic booth cannot have coordinates');
select throws_ok(
  $$insert into public.saved_items (user_id, item_type, item_id) values (gen_random_uuid(), 'person', gen_random_uuid())$$,
  '23514', null, 'only publications, findings and booths can be saved');

-- Profiles are created automatically and hold no identity documents.
insert into auth.users (id, aud, role, email)
values ('00000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'new@test.local');
select is((select count(*) from public.profiles where user_id = '00000000-0000-4000-8000-0000000000c1'), 1::bigint,
  'a profile is created on signup');
select hasnt_column('public', 'profiles', 'epic_number', 'no EPIC number is stored for anyone');

-- The token hook adds active roles as a UI hint.
insert into public.staff_assignments (user_id, role) values ('00000000-0000-4000-8000-0000000000c1', 'reviewer');
select is(
  (public.custom_access_token_hook(
     '{"user_id":"00000000-0000-4000-8000-0000000000c1","claims":{"app_metadata":{"provider":"email"}}}'::jsonb
   ) -> 'claims' -> 'app_metadata' -> 'staff_roles'),
  '["reviewer"]'::jsonb, 'the access token lists the active staff roles');
select throws_ok(
  $$insert into public.staff_assignments (user_id, role, granted_by)
    values ('00000000-0000-4000-8000-0000000000c1', 'analyst', '00000000-0000-4000-8000-0000000000c1')$$,
  '23514', null, 'nobody can grant a role to themselves');

select * from finish();
rollback;
