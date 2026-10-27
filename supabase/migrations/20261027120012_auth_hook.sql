-- ElectraLens 0012: custom access token hook (B06.12).
-- Adds the user's active staff roles to app_metadata.staff_roles. This is a hint for the UI
-- only: authorisation always re-reads staff_assignments (el.has_role), so a revoked role stops
-- working on the next request even while an older token still lists it.

create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_claims jsonb := event -> 'claims';
  v_roles text[];
begin
  select coalesce(array_agg(distinct a.role::text order by a.role::text), '{}')
  into v_roles
  from public.staff_assignments a
  where a.user_id = (event ->> 'user_id')::uuid and a.revoked_at is null;

  v_claims := jsonb_set(
    v_claims, '{app_metadata}',
    coalesce(v_claims -> 'app_metadata', '{}'::jsonb) || jsonb_build_object('staff_roles', to_jsonb(v_roles))
  );
  return jsonb_set(event, '{claims}', v_claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant select on table public.staff_assignments to supabase_auth_admin;
create policy "auth service reads roles" on public.staff_assignments
  for select to supabase_auth_admin using (true);
