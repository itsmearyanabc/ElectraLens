-- The Postgres job queue: leases, SKIP LOCKED, retries with backoff, dead-lettering, idempotency.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create schema tests;
create function tests.service(p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
  execute format('select (%s)::text', p_sql) into v;
  perform set_config('role', 'postgres', true);
  return coalesce(v, 'null');
exception when others then
  return 'ERR ' || sqlstate || ': ' || sqlerrm;
end $$;

insert into public.jobs (id, kind, payload, input_hash, max_attempts)
values ('00000000-0000-4000-8000-000000000001', 'ingest',
        '{"kind":"ingest","dataset_version_id":"00000000-0000-4000-8000-0000000000aa"}', repeat('a', 64), 2);

select throws_ok(
  $$insert into public.jobs (kind, payload, input_hash) values ('ingest', '{"kind":"ingest"}', repeat('a', 64))$$,
  '23505', null, 'the same work cannot be queued twice');
select throws_ok(
  $$insert into public.jobs (kind, payload, input_hash) values ('ingest', '{"kind":"analyze"}', repeat('b', 64))$$,
  '23514', null, 'a payload must match its job kind');

select is(tests.service($$(select id from public.claim_next_job(array['ingest']::public.job_kind[], 'w1', 60))$$),
  '00000000-0000-4000-8000-000000000001', 'worker 1 claims the job');
select is(tests.service($$(select count(*) from public.claim_next_job(array['ingest']::public.job_kind[], 'w2', 60))$$),
  '0', 'a leased job is skipped by other workers');
select is(tests.service($$public.complete_job('00000000-0000-4000-8000-000000000001', 'w2', '{}')$$),
  'ERR P0001: job.not_owner', 'only the lease holder can complete a job');
select is(tests.service($$public.fail_job('00000000-0000-4000-8000-000000000001', 'w1', 'boom')$$),
  'queued', 'a failed attempt goes back on the queue');
select is(tests.service($$(select count(*) from public.claim_next_job(array['ingest']::public.job_kind[], 'w2', 60))$$),
  '0', 'with a backoff delay');

update public.jobs set run_after = now() where id = '00000000-0000-4000-8000-000000000001';
select is(tests.service($$(select attempts from public.claim_next_job(array['ingest']::public.job_kind[], 'w2', 60))$$),
  '2', 'after the delay it is retried');
select is(tests.service($$public.fail_job('00000000-0000-4000-8000-000000000001', 'w2', 'boom again')$$),
  'dead', 'after the last attempt it is dead-lettered');
select lives_ok(
  $$insert into public.jobs (kind, payload, input_hash) values ('ingest', '{"kind":"ingest"}', repeat('a', 64))$$,
  'a dead job can be queued again');

-- A worker that vanished: its expired lease is taken over, or dead-lettered on the last attempt.
insert into public.jobs (id, kind, payload, input_hash, status, attempts, max_attempts, locked_by, locked_until)
values ('00000000-0000-4000-8000-000000000003', 'analyze', '{"kind":"analyze"}', repeat('c', 64), 'running', 1, 3, 'gone', now() - interval '1 minute'),
       ('00000000-0000-4000-8000-000000000004', 'analyze', '{"kind":"analyze"}', repeat('d', 64), 'running', 3, 3, 'gone', now() - interval '1 minute');
select is(tests.service($$(select id from public.claim_next_job(array['analyze']::public.job_kind[], 'w3', 60))$$),
  '00000000-0000-4000-8000-000000000003', 'an expired lease is taken over');
select is((select status::text from public.jobs where id = '00000000-0000-4000-8000-000000000004'), 'dead',
  'an expired lease on the final attempt is dead-lettered');
select throws_ok(
  $$set local role authenticated; select public.claim_next_job(array['ingest']::public.job_kind[], 'x', 60)$$,
  '42501', null, 'signed-in users cannot touch the queue');

select * from finish();
rollback;
