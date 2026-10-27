-- ElectraLens 0002: areas, data lineage and methodology versions (B06.02).

create table public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' and length(code) <= 64),
  level public.jurisdiction_level not null,
  parent_id uuid references public.jurisdictions (id),
  name jsonb not null check (jsonb_typeof(name) = 'object' and name ? 'en'),
  introduced_in text,
  is_synthetic boolean not null default false,
  created_at timestamptz not null default now(),
  check ((level = 'state') = (parent_id is null))
);
create index jurisdictions_parent_idx on public.jurisdictions (parent_id);

-- A part's parent must be a constituency, a constituency's a district, a district's a state.
create function el.check_jurisdiction_parent() returns trigger
language plpgsql set search_path = '' as $$
declare
  parent_level public.jurisdiction_level;
begin
  if new.parent_id is null then
    return new;
  end if;
  select level into parent_level from public.jurisdictions where id = new.parent_id;
  if not (
    (new.level = 'district' and parent_level = 'state')
    or (new.level = 'ac' and parent_level = 'district')
    or (new.level = 'part' and parent_level = 'ac')
  ) then
    raise exception 'jurisdiction.bad_parent' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger jurisdictions_parent_check
  before insert or update on public.jurisdictions
  for each row execute function el.check_jurisdiction_parent();

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  publisher text not null check (length(publisher) between 1 and 200),
  url text check (url ~ '^https?://'),
  permission_basis public.permission_basis not null,
  licence_note text,
  is_synthetic boolean not null default false,
  is_public boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (permission_basis <> 'synthetic' or is_synthetic)
);

create table public.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources (id),
  kind public.dataset_kind not null,
  label text not null check (length(label) between 1 and 120),
  qualifying_date date,
  roll_stage text check (roll_stage in ('draft', 'final', 'supplement')),
  schema_version text not null check (schema_version in ('electoral_roll_v1', 'polling_stations_v1')),
  jurisdiction_id uuid not null references public.jurisdictions (id),
  status public.dataset_status not null default 'uploading',
  original_path text,
  original_sha256 text check (original_sha256 ~ '^[0-9a-f]{64}$'),
  canonical_path text,
  canonical_root text check (canonical_root ~ '^[0-9a-f]{64}$'),
  row_count integer check (row_count >= 0),
  salt_path text,
  ingestion_report jsonb,
  is_synthetic boolean not null default false,
  is_public boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'electoral_roll') = (schema_version = 'electoral_roll_v1')),
  check (kind <> 'electoral_roll' or qualifying_date is not null),
  check (status not in ('validated', 'approved', 'superseded')
         or (canonical_root is not null and row_count is not null and original_sha256 is not null)),
  check (status <> 'approved' or approved_at is not null)
);
create index dataset_versions_source_idx on public.dataset_versions (source_id);
create index dataset_versions_jurisdiction_idx on public.dataset_versions (jurisdiction_id);
create index dataset_versions_status_idx on public.dataset_versions (status);

-- Once validated, what the root commits to can never change (B03.06).
create function el.protect_dataset_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status in ('validated', 'approved', 'superseded') and (
    new.canonical_root is distinct from old.canonical_root
    or new.row_count is distinct from old.row_count
    or new.original_sha256 is distinct from old.original_sha256
    or new.canonical_path is distinct from old.canonical_path
  ) then
    raise exception 'dataset.immutable' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger dataset_versions_protect
  before update on public.dataset_versions
  for each row execute function el.protect_dataset_version();

create table public.methodology_versions (
  version text primary key check (version ~ '^[0-9]{4}\.[0-9]+$'),
  params jsonb not null,
  params_hash text not null check (params_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'draft' check (status in ('draft', 'frozen', 'published')),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  frozen_at timestamptz,
  published_at timestamptz,
  check (status = 'draft' or frozen_at is not null),
  check (status <> 'published' or published_at is not null)
);

-- A frozen methodology never changes, and status only moves forward (T20).
create function el.protect_methodology() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'draft'
     and (new.params is distinct from old.params or new.params_hash is distinct from old.params_hash) then
    raise exception 'methodology.frozen' using errcode = 'P0001';
  end if;
  if not (
    old.status = new.status
    or (old.status = 'draft' and new.status = 'frozen')
    or (old.status = 'frozen' and new.status = 'published')
  ) then
    raise exception 'workflow.illegal_transition' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger methodology_versions_protect
  before update on public.methodology_versions
  for each row execute function el.protect_methodology();

create table public.polling_stations (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique check (public_code ~ '^[0-9A-HJKMNP-TV-Z]{10}$'),
  station_code text not null check (station_code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*-PS[0-9]{3}$'),
  ac_id uuid not null references public.jurisdictions (id),
  parts_served integer[] not null check (cardinality(parts_served) between 1 and 20),
  name jsonb not null check (jsonb_typeof(name) = 'object' and name ? 'en'),
  address jsonb not null check (jsonb_typeof(address) = 'object' and address ? 'en'),
  lat numeric(9, 6) check (lat between -90 and 90),
  lng numeric(9, 6) check (lng between -180 and 180),
  accessibility jsonb not null default '{}',
  dataset_version_id uuid references public.dataset_versions (id),
  source_url text check (source_url ~ '^https?://'),
  verified_at timestamptz,
  is_synthetic boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  -- Synthetic stations never carry coordinates (a demo QR must not point at a real building).
  check (not is_synthetic or (lat is null and lng is null)),
  unique (dataset_version_id, station_code)
);
create index polling_stations_ac_idx on public.polling_stations (ac_id);
create index polling_stations_published_idx on public.polling_stations (published) where published;
