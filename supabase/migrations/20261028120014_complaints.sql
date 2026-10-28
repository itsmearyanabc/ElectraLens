-- Citizen complaints, routed to the staff responsible for the area, behind identity verification.
--
-- Verification here is a SIMULATED e-KYC for the prototype: real Aadhaar OTP authentication needs
-- a UIDAI licence or a DigiLocker partner registration, which this project does not have. The
-- record never holds an Aadhaar number, only the method, the name given, the last four digits and
-- when; is_simulated is pinned to true so a demo record can't pass for a real check.
--
-- Complaints go to reviewers (who already moderate citizen claims) whose assignment covers the
-- complaint's area, and to the sysadmin. Every write goes through a function, so the author's
-- role on a message and the status changes can't be forged.

create table public.citizen_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  method text not null check (method in ('demo_ekyc')),
  verified_name text not null check (char_length(verified_name) between 2 and 80),
  aadhaar_last4 text not null check (aadhaar_last4 ~ '^[0-9]{4}$'),
  is_simulated boolean not null default true check (is_simulated),
  verified_at timestamptz not null default now()
);
alter table public.citizen_verifications enable row level security;
revoke all on public.citizen_verifications from anon, authenticated;
grant select on public.citizen_verifications to authenticated;
create policy "own verification" on public.citizen_verifications
  for select to authenticated using (user_id = auth.uid());

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('CMP-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  user_id uuid not null references auth.users (id) on delete cascade,
  jurisdiction_id uuid not null references public.jurisdictions (id),
  category text not null check (category in (
    'name_missing', 'wrong_details', 'wrongful_deletion', 'booth_issue', 'voter_card',
    'accessibility', 'other'
  )),
  title text not null check (char_length(title) between 5 and 140),
  summary text not null check (char_length(summary) between 10 and 4000),
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index complaints_user_idx on public.complaints (user_id, created_at desc);
create index complaints_area_idx on public.complaints (jurisdiction_id, status);
create trigger complaints_touch before update on public.complaints
  for each row execute function el.touch_updated_at();

create table public.complaint_messages (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_role text not null check (author_role in ('citizen', 'staff', 'system')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index complaint_messages_idx on public.complaint_messages (complaint_id, created_at);

alter table public.complaints enable row level security;
alter table public.complaint_messages enable row level security;
revoke all on public.complaints, public.complaint_messages from anon, authenticated;
grant select on public.complaints, public.complaint_messages to authenticated;

-- Responsible for an area's complaints: a reviewer covering it, or the sysadmin.
create function el.handles_complaints(p_jurisdiction uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select el.has_role('reviewer', p_jurisdiction) or el.has_role('sysadmin')
$$;

create policy "own or responsible" on public.complaints for select to authenticated
  using (user_id = auth.uid() or el.handles_complaints(jurisdiction_id));
create policy "thread of a visible complaint" on public.complaint_messages for select to authenticated
  using (exists (
    select 1 from public.complaints c
    where c.id = complaint_id
      and (c.user_id = auth.uid() or el.handles_complaints(c.jurisdiction_id))
  ));

-- Records a completed (simulated) e-KYC for the signed-in citizen.
create function public.record_demo_verification(p_name text, p_last4 text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'complaints.not_signed_in'; end if;
  insert into public.citizen_verifications (user_id, method, verified_name, aadhaar_last4)
  values (auth.uid(), 'demo_ekyc', trim(p_name), p_last4)
  on conflict (user_id) do update
    set verified_name = excluded.verified_name,
        aadhaar_last4 = excluded.aadhaar_last4,
        verified_at = now();
end $$;

-- Files a complaint for the signed-in, verified citizen, with its first message.
create function public.file_complaint(
  p_area_code text,
  p_category text,
  p_title text,
  p_summary text
) returns table (id uuid, reference text)
language plpgsql security definer set search_path = '' as $$
declare
  area_id uuid;
  row public.complaints%rowtype;
begin
  if auth.uid() is null then raise exception 'complaints.not_signed_in'; end if;
  if not exists (select 1 from public.citizen_verifications v where v.user_id = auth.uid()) then
    raise exception 'complaints.not_verified';
  end if;
  if (select count(*) from public.complaints c
      where c.user_id = auth.uid() and c.created_at > now() - interval '1 day') >= 5 then
    raise exception 'complaints.too_many';
  end if;
  select j.id into area_id from public.jurisdictions j where j.code = p_area_code;
  if area_id is null then raise exception 'complaints.unknown_area'; end if;
  insert into public.complaints (user_id, jurisdiction_id, category, title, summary)
  values (auth.uid(), area_id, p_category, trim(p_title), trim(p_summary))
  returning * into row;
  insert into public.complaint_messages (complaint_id, author_id, author_role, body)
  values (row.id, auth.uid(), 'citizen', trim(p_summary));
  return query select row.id, row.reference;
end $$;

-- A message on a complaint: the citizen who filed it, or staff responsible for its area.
create function public.add_complaint_message(p_complaint uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.complaints%rowtype;
  role text;
begin
  select * into c from public.complaints where id = p_complaint;
  if not found then raise exception 'complaints.not_found'; end if;
  if c.user_id = auth.uid() then
    role := 'citizen';
  elsif el.handles_complaints(c.jurisdiction_id) then
    role := 'staff';
  else
    raise exception 'complaints.forbidden';
  end if;
  if c.status = 'closed' then raise exception 'complaints.closed'; end if;
  insert into public.complaint_messages (complaint_id, author_id, author_role, body)
  values (c.id, auth.uid(), role, trim(p_body));
  update public.complaints set updated_at = now() where id = c.id;
end $$;

-- Staff move a complaint through its states; each change is noted in the thread and audited.
create function public.set_complaint_status(p_complaint uuid, p_status text, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.complaints%rowtype;
begin
  select * into c from public.complaints where id = p_complaint for update;
  if not found then raise exception 'complaints.not_found'; end if;
  if not el.handles_complaints(c.jurisdiction_id) then raise exception 'complaints.forbidden'; end if;
  if p_status not in ('in_review', 'resolved', 'closed') then
    raise exception 'complaints.bad_status';
  end if;
  update public.complaints set status = p_status where id = c.id;
  insert into public.complaint_messages (complaint_id, author_id, author_role, body)
  values (c.id, auth.uid(), 'system',
          'Status: ' || p_status || coalesce(' — ' || nullif(trim(p_note), ''), ''));
  perform el.log('complaint.status', 'complaint', c.id::text, p_note,
                 jsonb_build_object('from', c.status, 'to', p_status));
end $$;

revoke all on function public.record_demo_verification(text, text) from public;
revoke all on function public.file_complaint(text, text, text, text) from public;
revoke all on function public.add_complaint_message(uuid, text) from public;
revoke all on function public.set_complaint_status(uuid, text, text) from public;
grant execute on function public.record_demo_verification(text, text) to authenticated;
grant execute on function public.file_complaint(text, text, text, text) to authenticated;
grant execute on function public.add_complaint_message(uuid, text) to authenticated;
grant execute on function public.set_complaint_status(uuid, text, text) to authenticated;
