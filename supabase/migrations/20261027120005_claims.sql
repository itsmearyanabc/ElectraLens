-- ElectraLens 0005: claim checking and moderation (B06.05).

create table public.claim_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Kept when an account is deleted only if the claim was already published (B14.06).
  submitter_id uuid references auth.users (id) on delete set null,
  text text check (length(text) <= 2000),
  structured jsonb not null check (jsonb_typeof(structured) = 'object'),
  language text not null check (language ~ '^[a-z]{2,3}$'),
  status public.claim_status not null default 'checked',
  ip_hash text check (ip_hash ~ '^[0-9a-f]{64}$'),
  moderated_by uuid references auth.users (id) on delete set null,
  moderation_reason text,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  check (status not in ('published', 'rejected') or moderated_at is not null)
);
create index claim_submissions_submitter_idx on public.claim_submissions (submitter_id);
create index claim_submissions_status_idx on public.claim_submissions (status);

create table public.claim_assessments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claim_submissions (id) on delete cascade,
  verdict public.claim_verdict not null,
  evidence jsonb not null,
  publication_id uuid references public.publications (id),
  method_version text not null,
  explanation jsonb not null check (jsonb_typeof(explanation) = 'object' and explanation ? 'en'),
  assessed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index claim_assessments_claim_idx on public.claim_assessments (claim_id);
create index claim_assessments_publication_idx on public.claim_assessments (publication_id);
