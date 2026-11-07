-- Vagas publicas (2026-11-07): um jogo publico pode abrir so X vagas ao publico.
--
-- - events.public_spots: quantas pessoas de fora podem ser aceites (null = sem limite proprio).
-- - O admin continua a decidir sempre quem entra (decide_public_event_request).
-- - Quando o admin ja aceitou X pessoas de fora, o jogo fecha ao publico: spots_left chega a 0,
--   novos pedidos sao recusados e nao se aceitam mais pedidos pendentes.
-- Idempotente.

begin;

alter table public.events add column if not exists public_spots integer;
alter table public.events drop constraint if exists events_public_spots_check;
alter table public.events add constraint events_public_spots_check
  check (public_spots is null or public_spots between 1 and 12);

-- Vagas publicas que ainda restam (null = sem limite proprio).
create or replace function private.public_spots_left(p_event_id text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when event.public_spots is null then null
    else greatest(event.public_spots - (
      select count(*)::integer from public.event_join_requests as request
      where request.event_id = event.id and request.status = 'accepted'
    ), 0)
  end
  from public.events as event
  where event.id = p_event_id;
$$;

revoke all on function private.public_spots_left(text) from public, anon, authenticated;

create or replace function public.list_public_events()
returns table (
  event_id text,
  title text,
  starts_at timestamptz,
  location text,
  group_name text,
  needs text,
  spots_left integer,
  my_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    event.id,
    event.title,
    event.starts_at,
    event.location,
    grp.name,
    event.public_needs,
    least(
      greatest(event.max_players - (
        select count(*)::integer from public.event_responses as response
        where response.event_id = event.id and response.status = 'going'
      ), 0),
      coalesce(private.public_spots_left(event.id), 1000)
    ),
    request.status
  from public.events as event
  join public.groups as grp on grp.id = event.group_id and grp.deleted_at is null
  left join public.event_join_requests as request
    on request.event_id = event.id and request.user_id = (select auth.uid())
  where (select auth.uid()) is not null
    and not private.is_group_member(event.group_id)
    and (
      (event.visibility = 'public' and event.status = 'open' and event.starts_at > now() - interval '3 hours')
      or request.status in ('pending', 'accepted')
      or (request.status = 'invited' and event.status = 'open' and event.starts_at > now() - interval '3 hours')
    )
  order by event.starts_at;
$$;

create or replace function public.request_public_event(p_event_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_event public.events%rowtype;
  v_existing text;
  v_name text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.visibility <> 'public' or v_event.status <> 'open' or v_event.starts_at < now()
     or exists (select 1 from public.groups where id = v_event.group_id and deleted_at is not null) then
    raise exception 'event_not_public' using errcode = 'P0001';
  end if;
  if private.is_group_member(v_event.group_id) then
    raise exception 'already_group_member' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.player_traits
    where user_id = v_user_id and fitness is not null and position is not null and age_band is not null
  ) then
    raise exception 'traits_required' using errcode = 'P0001';
  end if;

  select status into v_existing from public.event_join_requests where event_id = p_event_id and user_id = v_user_id;
  if v_existing in ('pending', 'accepted') then
    return v_existing;
  end if;
  if v_existing = 'rejected' then
    raise exception 'request_rejected' using errcode = 'P0001';
  end if;
  if coalesce(private.public_spots_left(p_event_id), 1) <= 0 then
    raise exception 'public_spots_full' using errcode = 'P0001';
  end if;

  select left(coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), ''), 'Jogador'), 60)
  into v_name from public.profiles where id = v_user_id;

  insert into public.event_join_requests (event_id, user_id, requester_name, status)
  values (p_event_id, v_user_id, coalesce(v_name, 'Jogador'), 'pending')
  on conflict (event_id, user_id) do update
    set status = 'pending', requester_name = excluded.requester_name, created_at = now(),
        decided_at = null, decided_by = null;
  return 'pending';
end;
$$;

create or replace function public.decide_public_event_request(p_request_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.event_join_requests%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select * into v_request from public.event_join_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  if not private.is_group_admin(private.event_group(v_request.event_id)) then
    raise exception 'group_admin_required' using errcode = '42501';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'request_already_decided' using errcode = 'P0001';
  end if;
  if not coalesce(p_accept, false) then
    update public.event_join_requests
    set status = 'rejected', decided_at = now(), decided_by = (select auth.uid())
    where id = p_request_id;
    return 'rejected';
  end if;
  -- O admin so aceita enquanto houver vagas publicas.
  if coalesce(private.public_spots_left(v_request.event_id), 1) <= 0 then
    raise exception 'public_spots_full' using errcode = 'P0001';
  end if;
  return private.accept_join_request(p_request_id, (select auth.uid()));
end;
$$;

commit;
