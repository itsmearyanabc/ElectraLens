-- ElectraLens 0003: job queue, audit runs, findings and reviews (B06.03).

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  kind public.job_kind not null,
  status public.job_status not null default 'queued',
  payload jsonb not null check (payload ->> 'kind' = kind::text),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  locked_by text,
  locked_until timestamptz,
  run_after timestamptz not null default now(),
  last_error text,
  result jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'running' or (locked_by is not null and locked_until is not null))
);
-- Idempotency: the same work can't be queued twice while a copy is pending or done.
create unique index jobs_idempotency_idx on public.jobs (kind, input_hash)
  where status not in ('failed', 'dead');
create index jobs_queue_idx on public.jobs (kind, run_after) where status = 'queued';
create index jobs_running_idx on public.jobs (locked_until) where status = 'running';
create trigger jobs_touch before update on public.jobs
  for each row execute function el.touch_updated_at();

create table public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  baseline_version_id uuid not null references public.dataset_versions (id),
  target_version_id uuid not null references public.dataset_versions (id),
  methodology_version text not null references public.methodology_versions (version),
  status public.run_status not null default 'queued',
  engine_version text,
  image_digest text check (image_digest ~ '^sha256:[0-9a-f]{64}$'),
  params_hash text check (params_hash ~ '^[0-9a-f]{64}$'),
  input_roots jsonb,
  output_hash text check (output_hash ~ '^[0-9a-f]{64}$'),
  tests_in_run jsonb,
  created_by uuid not null references auth.users (id),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  check (baseline_version_id <> target_version_id),
  check (status <> 'ready_for_review' or (output_hash is not null and finished_at is not null))
);
create index audit_runs_baseline_idx on public.audit_runs (baseline_version_id);
create index audit_runs_target_idx on public.audit_runs (target_version_id);
create index audit_runs_methodology_idx on public.audit_runs (methodology_version);
create index audit_runs_created_by_idx on public.audit_runs (created_by);

create table public.anomaly_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.audit_runs (id),
  finding_code text not null check (finding_code ~ '^F-[0-9]{4}-[0-9]{6}$'),
  rule_id text not null check (rule_id ~ '^R[0-9]{2}$'),
  rule_version text not null check (rule_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  jurisdiction_id uuid not null references public.jurisdictions (id),
  signal_strength public.signal_strength not null,
  -- The public finding_v1 document exactly as the engine produced it. Never row-level data.
  finding jsonb not null check (finding ->> 'finding_id' = finding_code),
  restricted_evidence_path text,
  review_status public.review_decision not null default 'pending',
  label public.content_label not null default 'analytical_finding',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  -- Codes are unique within a run; public links use the finding's UUID.
  unique (run_id, finding_code),
  check (not published or (review_status in ('accepted', 'downgraded') and signal_strength <> 'weak'))
);
create index anomaly_findings_jurisdiction_idx on public.anomaly_findings (jurisdiction_id);
create index anomaly_findings_rule_idx on public.anomaly_findings (rule_id);
create index anomaly_findings_published_idx on public.anomaly_findings (published) where published;

create table public.finding_reviews (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.anomaly_findings (id),
  reviewer_id uuid not null references auth.users (id),
  decision public.review_decision not null check (decision <> 'pending'),
  reason text,
  created_at timestamptz not null default now(),
  check (decision = 'accepted' or length(btrim(coalesce(reason, ''))) >= 5)
);
create index finding_reviews_finding_idx on public.finding_reviews (finding_id);
create index finding_reviews_reviewer_idx on public.finding_reviews (reviewer_id);
