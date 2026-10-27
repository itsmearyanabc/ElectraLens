-- ElectraLens 0008: authorisation helpers used by RLS policies and workflow functions (B06.08).
-- All are `set search_path = ''`; the security-definer ones read staff_assignments directly, so a
-- revoked role stops working on the next query, not when the JWT expires.

create function el.mfa_ok() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- An area and all its ancestors (part -> constituency -> district -> state).
create function el.ancestors(p_id uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  with recursive up (id, parent_id) as (
    select j.id, j.parent_id from public.jurisdictions j where j.id = p_id
    union all
    select j.id, j.parent_id from public.jurisdictions j join up on j.id = up.parent_id
  )
  select id from up
$$;

-- Has the current user this role for this area (or globally)? Requires MFA.
create function el.has_role(p_role public.staff_role, p_jurisdiction uuid default null)
returns boolean
language sql stable security definer set search_path = '' as $$
  select el.mfa_ok() and exists (
    select 1
    from public.staff_assignments a
    where a.user_id = auth.uid()
      and a.role = p_role
      and a.revoked_at is null
      and (
        a.jurisdiction_id is null
        or (p_jurisdiction is not null and a.jurisdiction_id in (select el.ancestors(p_jurisdiction)))
      )
  )
$$;

-- Has the current user this role for at least one area? Requires MFA.
create function el.has_role_anywhere(p_role public.staff_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select el.mfa_ok() and exists (
    select 1 from public.staff_assignments a
    where a.user_id = auth.uid() and a.role = p_role and a.revoked_at is null
  )
$$;

create function el.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select el.mfa_ok() and exists (
    select 1 from public.staff_assignments a
    where a.user_id = auth.uid() and a.revoked_at is null
  )
$$;

create function el.current_roles() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct a.role::text order by a.role::text), '{}')
  from public.staff_assignments a
  where a.user_id = auth.uid() and a.revoked_at is null
$$;

-- Appends to the audit log in the caller's transaction (FR-GOV-3).
create function el.log(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_reason text default null,
  p_details jsonb default '{}'
) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, actor_roles, action, target_type, target_id, reason, details)
  values (auth.uid(), el.current_roles(), p_action, p_target_type, p_target_id, p_reason,
          coalesce(p_details, '{}'::jsonb))
$$;

create function el.require(p_condition boolean, p_code text) returns void
language plpgsql set search_path = '' as $$
begin
  if p_condition is not true then
    raise exception '%', p_code using errcode = 'P0001';
  end if;
end $$;

create function el.sha256_hex(p_text text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(p_text, 'UTF8')), 'hex')
$$;

-- RLS policies call these as the querying role.
revoke execute on all functions in schema el from public;
grant execute on function el.mfa_ok(), el.ancestors(uuid), el.has_role(public.staff_role, uuid),
  el.has_role_anywhere(public.staff_role), el.is_staff()
  to anon, authenticated, service_role;
