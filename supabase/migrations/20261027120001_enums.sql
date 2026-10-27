-- ElectraLens 0001: private helper schema and enumerated types (B06.01).
-- Helpers live in schema `el`, which PostgREST does not expose; public RPCs are in `public`.

create schema if not exists el;
revoke all on schema el from public;
grant usage on schema el to anon, authenticated, service_role;

create type public.staff_role as enum (
  'sysadmin', 'data_steward', 'analyst', 'reviewer', 'publisher', 'security_auditor'
);
create type public.jurisdiction_level as enum ('state', 'district', 'ac', 'part');
create type public.dataset_kind as enum ('electoral_roll', 'polling_stations');
create type public.permission_basis as enum ('synthetic', 'public_official', 'authorised');
create type public.dataset_status as enum (
  'uploading', 'validating', 'quarantined', 'validated', 'approved', 'superseded'
);
create type public.job_kind as enum (
  'ingest', 'analyze', 'publish_prepare', 'ots_stamp', 'ots_upgrade', 'notify', 'retention', 'benchmark'
);
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'dead');
create type public.run_status as enum ('queued', 'running', 'ready_for_review', 'failed', 'superseded');
create type public.review_decision as enum ('pending', 'accepted', 'downgraded', 'rejected');
create type public.signal_strength as enum ('strong', 'moderate', 'weak', 'data_quality');
create type public.publication_status as enum (
  'draft', 'preparing', 'in_review', 'approved', 'published', 'retracted', 'withdrawn'
);
create type public.approval_step as enum ('review', 'publish');
create type public.anchor_type as enum ('evm', 'ots');
create type public.anchor_status as enum ('pending', 'submitted', 'confirmed', 'upgraded', 'failed');
create type public.claim_verdict as enum ('consistent', 'contradicted', 'disputed', 'cannot_establish');
create type public.claim_status as enum ('checked', 'in_moderation', 'published', 'rejected');
create type public.content_label as enum (
  'source_data', 'analytical_finding', 'user_claim', 'unverified', 'confirmed_correction'
);

-- Shared trigger: keep updated_at current.
create function el.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
