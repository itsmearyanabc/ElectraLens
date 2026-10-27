-- Demo voter cards: ten synthetic citizens whose card carries a QR code. Scanning it shows the
-- card holder's polling booth; their (synthetic) participation history is shown only with the
-- 4-digit PIN printed on the card, so a photographed or borrowed card reveals nothing about
-- whether its holder voted. The QR holds a random code, never a card or EPIC number.
--
-- Synthetic only: the check constraint means no real person can be stored here, and nothing in
-- ElectraLens records who voted. Nobody reads the table directly; two functions give the two
-- views, and wrong PINs lock the card for a while.

create table public.demo_voter_cards (
  id uuid primary key default gen_random_uuid(),
  card_code text not null unique check (card_code ~ '^[0-9A-HJKMNP-TV-Z]{10}$'),
  card_number text not null unique check (card_number ~ '^ELD-[0-9]{4}-[0-9]{4}$'),
  holder_name text not null check (char_length(holder_name) between 2 and 80),
  birth_year integer check (birth_year between 1900 and 2010),
  gender text check (gender in ('F', 'M', 'T')),
  polling_station_id uuid not null references public.polling_stations (id) on delete cascade,
  part_number integer,
  serial_number integer,
  pin_hash text not null,
  participation jsonb not null default '[]'::jsonb check (jsonb_typeof(participation) = 'array'),
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now()
);

alter table public.demo_voter_cards enable row level security;
revoke all on public.demo_voter_cards from anon, authenticated;

comment on table public.demo_voter_cards is
  'Synthetic demo voter cards (QR → booth; PIN → synthetic participation history). Never real people.';

-- What a scan shows: the card and its polling booth, nothing about participation.
create function public.demo_voter_card(p_code text)
returns table (
  card_number text,
  holder_name text,
  part_number integer,
  serial_number integer,
  booth_code text,
  is_synthetic boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.card_number, c.holder_name, c.part_number, c.serial_number, s.public_code, c.is_synthetic
  from public.demo_voter_cards c
  join public.polling_stations s on s.id = c.polling_station_id
  where c.card_code = p_code
    and s.published;
$$;

-- The participation history, only with the card's PIN. Five wrong PINs lock the card for
-- fifteen minutes. Returns null for an unknown card or a wrong PIN, and {"locked": true} while
-- locked, so the caller can't tell an unknown card from a wrong PIN.
create function public.demo_voter_history(p_code text, p_pin text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  card public.demo_voter_cards%rowtype;
begin
  if p_code !~ '^[0-9A-HJKMNP-TV-Z]{10}$' or p_pin !~ '^[0-9]{4}$' then
    return null;
  end if;
  select * into card from public.demo_voter_cards where card_code = p_code for update;
  if not found then
    return null;
  end if;
  if card.locked_until is not null and card.locked_until > now() then
    return jsonb_build_object('locked', true);
  end if;
  if card.pin_hash <> extensions.crypt(p_pin, card.pin_hash) then
    update public.demo_voter_cards
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' end
     where id = card.id;
    return null;
  end if;
  update public.demo_voter_cards set failed_attempts = 0, locked_until = null where id = card.id;
  return jsonb_build_object('participation', card.participation);
end;
$$;

revoke all on function public.demo_voter_card(text) from public;
revoke all on function public.demo_voter_history(text, text) from public;
grant execute on function public.demo_voter_card(text) to anon, authenticated;
grant execute on function public.demo_voter_history(text, text) to anon, authenticated;
