-- Onboarding de quem vem de fora (2026-11-05). Idempotente.
-- 1) Dia e hora habituais do grupo (groups.settings: weekday 0=domingo..6, time "HH:MM") para pre-preencher convocatorias.
-- 2) O convite mostra a cara do grupo: emblema, bio, local, dia/hora, membros e proximo jogo.
-- 3) Quem pediu para ficar com uma ficha que ja existe pode responder a convocatoria enquanto o admin nao decide;
--    se o admin recusar, essas respostas sao apagadas.
-- 4) Lupa: procurar jogadores dos grupos a que a conta pertence.

begin;

-- 1) create_group com dia e hora habituais (os argumentos novos sao opcionais: versoes antigas da app continuam a funcionar).
drop function if exists public.create_group(text, text, text, text);
create or replace function public.create_group(
  p_name text,
  p_location text default '',
  p_schedule text default '',
  p_notes text default '',
  p_weekday integer default null,
  p_time text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := left(btrim(coalesce(p_name, '')), 60);
  v_location text := left(btrim(coalesce(p_location, '')), 80);
  v_settings jsonb := '{}'::jsonb;
  v_requester text;
  v_slug text;
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 then
    raise exception 'name_required' using errcode = '22023';
  end if;
  if p_weekday is not null and p_weekday between 0 and 6 then
    v_settings := v_settings || jsonb_build_object('weekday', p_weekday);
  end if;
  if p_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    v_settings := v_settings || jsonb_build_object('time', p_time);
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if (select count(*) from public.group_members where user_id = v_user_id and role = 'owner') >= 2 then
    raise exception 'group_limit_reached' using errcode = 'P0001';
  end if;

  v_slug := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  v_slug := left(coalesce(nullif(v_slug, ''), 'grupo'), 30) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
  insert into public.groups (slug, name, created_by, default_location, settings)
  values (v_slug, v_name, v_user_id, v_location, v_settings)
  returning id into v_group_id;
  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  select left(coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), ''), 'Jogador'), 60)
  into v_requester from public.profiles where id = v_user_id;
  insert into public.group_requests (requested_by, requester_name, name, location, schedule, notes, status, group_id, decided_at, decided_by)
  values (v_user_id, coalesce(v_requester, 'Jogador'), v_name, v_location,
    left(btrim(coalesce(p_schedule, '')), 80), left(btrim(coalesce(p_notes, '')), 300), 'approved', v_group_id, now(), v_user_id);
  return v_group_id;
end;
$$;
revoke all on function public.create_group(text, text, text, text, integer, text) from public, anon;
grant execute on function public.create_group(text, text, text, text, integer, text) to authenticated;

-- Admin do grupo muda o dia e a hora habituais.
create or replace function public.set_group_schedule(p_group_id uuid, p_weekday integer, p_time text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_group_admin(p_group_id) then
    raise exception 'not_group_admin' using errcode = '42501';
  end if;
  update public.groups
  set settings = (coalesce(settings, '{}'::jsonb) - 'weekday' - 'time')
    || case when p_weekday between 0 and 6 then jsonb_build_object('weekday', p_weekday) else '{}'::jsonb end
    || case when p_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then jsonb_build_object('time', p_time) else '{}'::jsonb end
  where id = p_group_id;
end;
$$;
revoke all on function public.set_group_schedule(uuid, integer, text) from public, anon;
grant execute on function public.set_group_schedule(uuid, integer, text) to authenticated;

-- 2) Convite com a cara do grupo. So quem tem o codigo ve isto; nunca a lista de jogadores.
drop function if exists public.preview_group_invite(text);
create function public.preview_group_invite(p_code text)
returns table (
  group_name text, valid boolean, already_member boolean,
  logo text, bio text, location text, weekday integer, start_time text,
  member_count integer, next_event_at timestamptz, next_event_going integer, next_event_max integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select grp.name, true, coalesce(private.is_group_member(grp.id), false),
    grp.logo, grp.bio, grp.default_location,
    (grp.settings ->> 'weekday')::integer, grp.settings ->> 'time',
    (select count(*)::integer from public.group_members as member where member.group_id = grp.id),
    next_event.starts_at,
    (select count(*)::integer from public.event_responses as response
      where response.event_id = next_event.id and response.status = 'going'),
    next_event.max_players
  from public.group_invites as invite
  join public.groups as grp on grp.id = invite.group_id and grp.deleted_at is null
  left join lateral (
    select event.id, event.starts_at, event.max_players
    from public.events as event
    where event.group_id = grp.id and event.status not in ('cancelled', 'completed') and event.starts_at > now()
    order by event.starts_at
    limit 1
  ) as next_event on true
  where invite.code = lower(btrim(p_code)) and invite.revoked_at is null
  union all
  select null, false, false, null, null, null, null, null, null, null, null, null
  where not exists (
    select 1 from public.group_invites as invite
    join public.groups as grp on grp.id = invite.group_id and grp.deleted_at is null
    where invite.code = lower(btrim(p_code)) and invite.revoked_at is null
  );
$$;
revoke all on function public.preview_group_invite(text) from public;
grant execute on function public.preview_group_invite(text) to anon, authenticated;

-- 3) Responder com a ficha pedida (pedido pendente) enquanto o admin nao decide.
drop policy if exists "players respond to events" on public.event_responses;
create policy "players respond to events" on public.event_responses
  for insert to authenticated
  with check (
    private.is_group_admin(private.event_group(event_id))
    or exists (
      select 1 from public.players
      where players.id = event_responses.player_id
        and players.linked_user_id = (select auth.uid())
        and players.group_id = private.event_group(event_responses.event_id)
    )
    or exists (
      select 1 from public.player_claims as claim
      join public.players on players.id = claim.player_id
      where claim.player_id = event_responses.player_id
        and claim.user_id = (select auth.uid())
        and claim.status = 'pending'
        and players.linked_user_id is null
        and players.group_id = private.event_group(event_responses.event_id)
    )
  );

drop policy if exists "players update event responses" on public.event_responses;
create policy "players update event responses" on public.event_responses
  for update to authenticated
  using (
    private.is_group_admin(private.event_group(event_id))
    or exists (
      select 1 from public.players
      where players.id = event_responses.player_id
        and players.linked_user_id = (select auth.uid())
        and players.group_id = private.event_group(event_responses.event_id)
    )
    or exists (
      select 1 from public.player_claims as claim
      join public.players on players.id = claim.player_id
      where claim.player_id = event_responses.player_id
        and claim.user_id = (select auth.uid())
        and claim.status = 'pending'
        and players.linked_user_id is null
        and players.group_id = private.event_group(event_responses.event_id)
    )
  )
  with check (
    private.is_group_admin(private.event_group(event_id))
    or exists (
      select 1 from public.players
      where players.id = event_responses.player_id
        and players.linked_user_id = (select auth.uid())
        and players.group_id = private.event_group(event_responses.event_id)
    )
    or exists (
      select 1 from public.player_claims as claim
      join public.players on players.id = claim.player_id
      where claim.player_id = event_responses.player_id
        and claim.user_id = (select auth.uid())
        and claim.status = 'pending'
        and players.linked_user_id is null
        and players.group_id = private.event_group(event_responses.event_id)
    )
  );

-- Pedido recusado: as respostas dadas com essa ficha por essa conta desaparecem
-- (so de convocatorias ainda abertas; jogos ja fechados nao mudam).
create or replace function private.clear_rejected_claim_responses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    delete from public.event_responses as response
    using public.events as event
    where response.player_id = new.player_id
      and response.user_id = new.user_id
      and event.id = response.event_id
      and event.status not in ('completed');
  end if;
  return new;
end;
$$;
drop trigger if exists player_claims_clear_rejected_responses on public.player_claims;
create trigger player_claims_clear_rejected_responses
  after update of status on public.player_claims
  for each row execute function private.clear_rejected_claim_responses();

-- 4) Lupa: jogadores dos grupos a que a conta pertence (nunca de grupos alheios).
create or replace function public.search_players(p_query text)
returns table (player_id text, name text, overall integer, group_id uuid, group_name text, is_guest boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select player.id, player.name, player.overall, grp.id, grp.name, player.is_guest
  from public.players as player
  join public.groups as grp on grp.id = player.group_id and grp.deleted_at is null
  where (select auth.uid()) is not null
    and private.is_group_member(grp.id)
    and char_length(btrim(coalesce(p_query, ''))) >= 1
    and player.name ilike '%' || replace(replace(btrim(p_query), '%', ''), '_', '') || '%'
  order by player.is_guest, player.name
  limit 40;
$$;
revoke all on function public.search_players(text) from public, anon;
grant execute on function public.search_players(text) to authenticated;

commit;
