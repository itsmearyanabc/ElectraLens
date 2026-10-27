-- ElectraLens 0006: citizen profiles, staff roles, saved items, subscriptions (B06.06).
-- No EPIC number, phone number or date of birth is stored for anyone (data minimisation).

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (length(display_name) <= 80),
  preferred_language text not null default 'en' check (preferred_language ~ '^[a-z]{2,3}$'),
  notify_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function el.touch_updated_at();

create function el.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function el.handle_new_user();

-- Roles come only from here, never from signup metadata (FR-ACC-4).
create table public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null,
  jurisdiction_id uuid references public.jurisdictions (id),  -- null: every area
  granted_by uuid references auth.users (id) on delete set null,  -- null only for the bootstrap admin
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  revoke_reason text,
  check (granted_by is null or granted_by <> user_id),
  check ((revoked_at is null) = (revoked_by is null))
);
create unique index staff_assignments_active_idx on public.staff_assignments
  (user_id, role, jurisdiction_id) nulls not distinct where revoked_at is null;
create index staff_assignments_jurisdiction_idx on public.staff_assignments (jurisdiction_id);
create index staff_assignments_granted_by_idx on public.staff_assignments (granted_by);
create index staff_assignments_revoked_by_idx on public.staff_assignments (revoked_by);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('publication', 'finding', 'booth')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('jurisdiction', 'series')),
  target_id text not null check (length(target_id) between 1 and 64),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
