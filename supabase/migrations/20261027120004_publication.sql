-- ElectraLens 0004: publications, two-person approvals, anchors and aggregates (B06.04).

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  series_id text not null check (series_id ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'),
  sequence integer not null check (sequence >= 1),
  run_id uuid references public.audit_runs (id),
  status public.publication_status not null default 'draft',
  manifest jsonb,
  manifest_hash text check (manifest_hash ~ '^[0-9a-f]{64}$'),
  previous_publication_id uuid references public.publications (id),
  supersedes_id uuid references public.publications (id),
  report_path text,
  report_hash text check (report_hash ~ '^[0-9a-f]{64}$'),
  aggregates_path text,
  aggregates_hash text check (aggregates_hash ~ '^[0-9a-f]{64}$'),
  is_synthetic boolean not null default false,
  created_by uuid not null references auth.users (id),
  submitted_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  retracted_at timestamptz,
  retraction_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('draft', 'preparing', 'withdrawn') or (manifest is not null and manifest_hash is not null)),
  check ((status = 'retracted') = (retracted_at is not null)),
  check (retracted_at is null or length(btrim(coalesce(retraction_reason, ''))) >= 10),
  check (status not in ('published', 'retracted') or published_at is not null)
);
-- Withdrawn drafts give their sequence number back; everything else keeps the chain unique.
create unique index publications_series_sequence_idx on public.publications (series_id, sequence)
  where status <> 'withdrawn';
create index publications_run_idx on public.publications (run_id);
create index publications_previous_idx on public.publications (previous_publication_id);
create index publications_supersedes_idx on public.publications (supersedes_id);
create index publications_created_by_idx on public.publications (created_by);

-- What was approved is what gets anchored: the manifest is frozen once review starts.
create function el.protect_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status not in ('draft', 'preparing') and (
    new.manifest is distinct from old.manifest
    or new.manifest_hash is distinct from old.manifest_hash
    or new.report_hash is distinct from old.report_hash
    or new.aggregates_hash is distinct from old.aggregates_hash
  ) then
    raise exception 'publication.manifest_frozen' using errcode = 'P0001';
  end if;
  if old.status in ('retracted', 'withdrawn') and new.status <> old.status then
    raise exception 'workflow.illegal_transition' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger publications_protect
  before update on public.publications
  for each row execute function el.protect_publication();

create table public.publication_approvals (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications (id),
  approver_id uuid not null references auth.users (id),
  step public.approval_step not null,
  manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('approve', 'reject')),
  reason text,
  created_at timestamptz not null default now(),
  -- FR-GOV-2: one decision per step, and never the same person for both steps.
  unique (publication_id, step),
  unique (publication_id, approver_id),
  check (decision = 'approve' or length(btrim(coalesce(reason, ''))) >= 10)
);
create index publication_approvals_approver_idx on public.publication_approvals (approver_id);

create table public.blockchain_anchors (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications (id),
  anchor_type public.anchor_type not null,
  network text not null,
  chain_id bigint,
  contract_address text check (contract_address ~ '^0x[0-9a-fA-F]{40}$'),
  tx_hash text check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  block_number bigint check (block_number >= 0),
  log_index integer check (log_index >= 0),
  ots_path text,
  status public.anchor_status not null default 'pending',
  last_error text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (publication_id, anchor_type),
  check (anchor_type <> 'evm' or status not in ('confirmed') or (tx_hash is not null and block_number is not null))
);

create table public.aggregate_metrics (
  id bigint generated always as identity primary key,
  run_id uuid references public.audit_runs (id),
  publication_id uuid references public.publications (id),
  jurisdiction_id uuid not null references public.jurisdictions (id),
  metric text not null check (metric ~ '^[a-z][a-z0-9_]*$'),
  dims jsonb not null default '{}' check (jsonb_typeof(dims) = 'object'),
  value bigint,
  suppressed boolean not null default false,
  published boolean not null default false,
  check ((value is null) = suppressed),
  -- Only post-suppression copies attached to a publication can ever be published.
  check (not published or publication_id is not null),
  check (run_id is not null or publication_id is not null)
);
create unique index aggregate_metrics_unique_idx on public.aggregate_metrics
  (run_id, publication_id, jurisdiction_id, metric, dims) nulls not distinct;
create index aggregate_metrics_publication_idx on public.aggregate_metrics (publication_id);
create index aggregate_metrics_jurisdiction_idx on public.aggregate_metrics (jurisdiction_id);
