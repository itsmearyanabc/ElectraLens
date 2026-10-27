-- ElectraLens 0007: append-only audit log, security events, incidents (B06.07, FR-GOV-3).

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_roles text[] not null default '{}',
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  target_type text not null,
  target_id text,
  reason text,
  details jsonb not null default '{}'
);
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_target_idx on public.audit_log (target_type, target_id);
create index audit_log_actor_idx on public.audit_log (actor_id);

create function el.audit_log_is_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_log.append_only' using errcode = 'P0001';
end $$;
create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function el.audit_log_is_append_only();
create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function el.audit_log_is_append_only();
-- Privileges too, so even the service role can only append.
revoke update, delete, truncate on public.audit_log from public, anon, authenticated, service_role;

create table public.security_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  event_type text not null check (event_type ~ '^[a-z_]+(\.[a-z_]+)*$'),
  ip_hash text check (ip_hash ~ '^[0-9a-f]{64}$'),
  details jsonb not null default '{}'
);
create index security_events_at_idx on public.security_events (at desc);
create index security_events_type_idx on public.security_events (event_type, at desc);

create table public.incident_records (
  id uuid primary key default gen_random_uuid(),
  opened_at timestamptz not null default now(),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null check (length(title) between 3 and 200),
  summary text not null,
  status text not null default 'open' check (status in ('open', 'contained', 'resolved')),
  closed_at timestamptz,
  public_note text,
  created_by uuid references auth.users (id) on delete set null,
  check ((status = 'resolved') = (closed_at is not null))
);
create index incident_records_created_by_idx on public.incident_records (created_by);
