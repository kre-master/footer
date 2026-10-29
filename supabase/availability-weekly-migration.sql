-- Fase 3 (2026-10-29): disponibilidade com perfil visivel e modo semanal.
--
-- - player_availability_settings: a conta escolhe se o perfil fica visivel aos admins e o modo
--   ('weekly' = todas as semanas nos mesmos dias e horas; 'dates' = dias concretos em player_availability).
--   Sem linha conta como visivel e 'dates' (o comportamento anterior).
-- - player_weekly_availability: dias da semana (1 = segunda ... 7 = domingo) com horas proprias.
-- - list_available_players e invite_to_event passam a respeitar a visibilidade e o modo.
-- Corre depois de availability-migration.sql. Idempotente.

begin;

create table if not exists public.player_availability_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visible boolean not null default true,
  mode text not null default 'weekly' check (mode in ('weekly', 'dates')),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_weekly_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  from_hour smallint not null check (from_hour between 0 and 23),
  to_hour smallint not null check (to_hour between 1 and 24),
  created_at timestamptz not null default now(),
  check (to_hour > from_hour),
  unique (user_id, weekday)
);

alter table public.player_availability_settings enable row level security;
alter table public.player_weekly_availability enable row level security;
revoke all on table public.player_availability_settings from public, anon, authenticated;
revoke all on table public.player_weekly_availability from public, anon, authenticated;
grant select, insert, update, delete on table public.player_availability_settings to authenticated;
grant select, insert, update, delete on table public.player_weekly_availability to authenticated;

drop policy if exists "availability settings own" on public.player_availability_settings;
create policy "availability settings own" on public.player_availability_settings for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "weekly availability own" on public.player_weekly_availability;
create policy "weekly availability own" on public.player_weekly_availability for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Disponibilidade efectiva de cada conta visivel, como dias concretos, entre duas datas.
create or replace function private.effective_availability(p_from date, p_to date)
returns table (user_id uuid, day date, from_hour smallint, to_hour smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select slot.user_id, slot.day, slot.from_hour, slot.to_hour
  from public.player_availability as slot
  left join public.player_availability_settings as settings on settings.user_id = slot.user_id
  where slot.day between p_from and p_to
    and coalesce(settings.visible, true)
    and coalesce(settings.mode, 'dates') = 'dates'
  union all
  select weekly.user_id, day_series.day::date, weekly.from_hour, weekly.to_hour
  from public.player_weekly_availability as weekly
  join public.player_availability_settings as settings on settings.user_id = weekly.user_id
  cross join generate_series(p_from, p_to, interval '1 day') as day_series(day)
  where settings.visible
    and settings.mode = 'weekly'
    and extract(isodow from day_series.day) = weekly.weekday;
$$;

revoke all on function private.effective_availability(date, date) from public, anon, authenticated;

-- Admin: quem esta disponivel na semana do jogo, de fora do grupo. Compativeis (mesmo dia e hora) primeiro.
create or replace function public.list_available_players(p_event_id text)
returns table (
  user_id uuid,
  name text,
  fitness text,
  player_position text,
  age_band text,
  day date,
  from_hour smallint,
  to_hour smallint,
  compatible boolean,
  request_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_local timestamp;
  v_week_start date;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found or not private.is_group_admin(v_event.group_id) then
    raise exception 'group_admin_required' using errcode = '42501';
  end if;
  v_local := v_event.starts_at at time zone 'Europe/Lisbon';
  v_week_start := date_trunc('week', v_local)::date;

  return query
  select
    slot.user_id,
    left(coalesce(nullif(btrim(profile.display_name), ''), nullif(btrim(profile.username), ''), 'Jogador'), 60),
    traits.fitness,
    traits.position,
    traits.age_band,
    slot.day,
    slot.from_hour,
    slot.to_hour,
    slot.day = v_local::date
      and slot.from_hour <= extract(hour from v_local)
      and slot.to_hour > extract(hour from v_local),
    request.status
  from private.effective_availability(v_week_start, v_week_start + 6) as slot
  left join public.profiles as profile on profile.id = slot.user_id
  left join public.player_traits as traits on traits.user_id = slot.user_id
  left join public.event_join_requests as request on request.event_id = p_event_id and request.user_id = slot.user_id
  where not exists (
      select 1 from public.group_members as member
      where member.group_id = v_event.group_id and member.user_id = slot.user_id
    )
  order by 9 desc, abs(slot.day - v_local::date), 2;
end;
$$;

create or replace function public.invite_to_event(p_event_id text, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_existing text;
  v_name text;
  v_week_start date;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select * into v_event from public.events where id = p_event_id;
  if not found or not private.is_group_admin(v_event.group_id) then
    raise exception 'group_admin_required' using errcode = '42501';
  end if;
  if v_event.status <> 'open' or v_event.starts_at < now() then
    raise exception 'event_not_open' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.group_members where group_id = v_event.group_id and user_id = p_user_id) then
    raise exception 'already_group_member' using errcode = 'P0001';
  end if;
  v_week_start := date_trunc('week', v_event.starts_at at time zone 'Europe/Lisbon')::date;
  if not exists (
    select 1 from private.effective_availability(v_week_start, v_week_start + 6) as slot
    where slot.user_id = p_user_id
  ) then
    raise exception 'player_not_available' using errcode = 'P0001';
  end if;

  select status into v_existing from public.event_join_requests where event_id = p_event_id and user_id = p_user_id;
  if v_existing in ('pending', 'accepted', 'invited') then
    return v_existing;
  end if;

  select left(coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), ''), 'Jogador'), 60)
  into v_name from public.profiles where id = p_user_id;

  insert into public.event_join_requests (event_id, user_id, requester_name, status, decided_by)
  values (p_event_id, p_user_id, coalesce(v_name, 'Jogador'), 'invited', (select auth.uid()))
  on conflict (event_id, user_id) do update
    set status = 'invited', requester_name = excluded.requester_name, created_at = now(),
        decided_at = null, decided_by = excluded.decided_by;
  return 'invited';
end;
$$;

revoke all on function public.list_available_players(text) from public, anon;
revoke all on function public.invite_to_event(text, uuid) from public, anon;
grant execute on function public.list_available_players(text) to authenticated;
grant execute on function public.invite_to_event(text, uuid) to authenticated;

commit;
