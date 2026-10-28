-- 1. Brute-force protection for the staff sign-in, on top of Supabase Auth's own rate limits.
--    Keyed by the SHA-256 of the lower-cased email, so no address is stored. The allowance shrinks
--    and the wait grows at each lockout: 3 tries then 30 s; 2 tries then 1 min; 1 try then 5 min;
--    then 1 try at a time, the wait doubling each time (10 min, 20 min, ...; at most 24 h).
--    A successful sign-in clears it; so does a quiet day.
--
-- 2. Demo voter cards in the console: the sysadmin (all areas) sees every card; other staff see
--    the cards whose polling booth is in an area they are assigned to. Never the PIN or history.

create table public.login_throttle (
  key text primary key check (key ~ '^[0-9a-f]{64}$'),
  stage integer not null default 0 check (stage >= 0),
  failures integer not null default 0 check (failures >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.login_throttle enable row level security;
revoke all on public.login_throttle from anon, authenticated;

create function el.login_allowance(p_stage integer) returns integer
language sql immutable as $$
  select case p_stage when 0 then 3 when 1 then 2 else 1 end
$$;

create function el.login_lockout(p_stage integer) returns interval
language sql immutable as $$
  select case
    when p_stage = 0 then interval '30 seconds'
    when p_stage = 1 then interval '1 minute'
    else least(interval '5 minutes' * power(2, p_stage - 2), interval '24 hours')
  end
$$;

-- Seconds until this key may try again (0 when it may try now).
create function public.login_throttle_wait(p_key text) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select greatest(0, ceil(extract(epoch from t.locked_until - now())))::integer
     from public.login_throttle t
     where t.key = p_key and t.locked_until > now()),
    0)
$$;

-- Records a failed attempt; returns the seconds of lockout it started (0 if none yet).
create function public.login_throttle_fail(p_key text) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  t public.login_throttle%rowtype;
  wait interval;
begin
  if p_key !~ '^[0-9a-f]{64}$' then return 0; end if;
  insert into public.login_throttle (key) values (p_key) on conflict (key) do nothing;
  select * into t from public.login_throttle where key = p_key for update;
  if t.updated_at < now() - interval '24 hours' and (t.locked_until is null or t.locked_until < now()) then
    t.stage := 0;
    t.failures := 0;
  end if;
  if t.locked_until > now() then
    return ceil(extract(epoch from t.locked_until - now()))::integer;
  end if;
  t.failures := t.failures + 1;
  insert into public.security_events (event_type, details)
  values ('auth.staff_sign_in_failed', jsonb_build_object('stage', t.stage, 'attempt', t.failures));
  if t.failures >= el.login_allowance(t.stage) then
    wait := el.login_lockout(t.stage);
    update public.login_throttle
       set stage = t.stage + 1, failures = 0, locked_until = now() + wait, updated_at = now()
     where key = p_key;
    insert into public.security_events (event_type, details)
    values ('auth.staff_sign_in_locked',
            jsonb_build_object('stage', t.stage + 1, 'seconds', extract(epoch from wait)::integer));
    return extract(epoch from wait)::integer;
  end if;
  update public.login_throttle
     set stage = t.stage, failures = t.failures, updated_at = now()
   where key = p_key;
  return 0;
end $$;

-- After a successful sign-in, the signed-in person clears their own counter.
create function public.login_throttle_clear() returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.login_throttle
  where key = encode(extensions.digest(lower(coalesce(auth.jwt() ->> 'email', '')), 'sha256'), 'hex')
$$;

revoke all on function public.login_throttle_wait(text) from public;
revoke all on function public.login_throttle_fail(text) from public;
revoke all on function public.login_throttle_clear() from public;
grant execute on function public.login_throttle_wait(text) to anon, authenticated;
grant execute on function public.login_throttle_fail(text) to anon, authenticated;
grant execute on function public.login_throttle_clear() to authenticated;

-- Does any of this person's staff roles cover the area (or every area)? Requires MFA.
create function el.staff_covers(p_jurisdiction uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select el.mfa_ok() and exists (
    select 1 from public.staff_assignments a
    where a.user_id = auth.uid()
      and a.revoked_at is null
      and (a.jurisdiction_id is null or a.jurisdiction_id in (select el.ancestors(p_jurisdiction)))
  )
$$;

-- Demo voter cards for the console, limited to the areas the staff member covers.
create function public.staff_voter_cards()
returns table (
  card_code text,
  card_number text,
  holder_name text,
  birth_year integer,
  gender text,
  part_number integer,
  serial_number integer,
  booth_code text,
  booth_name jsonb,
  ac_id uuid,
  elections integer,
  missed integer
)
language sql stable security definer set search_path = '' as $$
  select c.card_code, c.card_number, c.holder_name, c.birth_year, c.gender, c.part_number,
         c.serial_number, s.public_code, s.name, s.ac_id,
         jsonb_array_length(c.participation),
         (select count(*)::integer from jsonb_array_elements(c.participation) p
          where (p ->> 'voted')::boolean is false)
  from public.demo_voter_cards c
  join public.polling_stations s on s.id = c.polling_station_id
  where el.staff_covers(s.ac_id)
  order by c.holder_name
$$;
revoke all on function public.staff_voter_cards() from public;
grant execute on function public.staff_voter_cards() to authenticated;
