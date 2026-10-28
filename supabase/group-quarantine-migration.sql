-- Apagar grupos com quarentena de 30 dias (2026-10-28). Correr no SQL Editor antes de publicar a app.
-- Um grupo apagado desaparece logo para todos; o dono do grupo ou o dono da app recuperam-no durante 30 dias;
-- depois disso uma tarefa diaria (pg_cron) apaga-o de vez, com jogadores, jogos, convocatorias e pagamentos.

alter table public.groups
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid;

-- 1) As regras de acesso (RLS) passam todas por estas funcoes: com o grupo apagado, ninguem ve os seus dados.
create or replace function private.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members as member
    join public.groups as grp on grp.id = member.group_id and grp.deleted_at is null
    where member.group_id = p_group_id and member.user_id = (select auth.uid())
  )
$$;

create or replace function private.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members as member
    join public.groups as grp on grp.id = member.group_id and grp.deleted_at is null
    where member.group_id = p_group_id and member.user_id = (select auth.uid()) and member.role in ('owner', 'admin')
  )
$$;

create or replace function private.is_admin_of_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members as me
    join public.groups as grp on grp.id = me.group_id and grp.deleted_at is null
    join public.group_members as other on other.group_id = me.group_id
    where me.user_id = (select auth.uid()) and me.role in ('owner', 'admin') and other.user_id = p_user_id
  )
$$;

-- 2) Quem pode apagar e recuperar: o dono do grupo ou o dono da app.
create or replace function private.can_delete_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin() or exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid()) and role = 'owner'
  )
$$;

create or replace function public.delete_group(p_group_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not private.can_delete_group(p_group_id) then
    raise exception 'group_owner_required' using errcode = '42501';
  end if;
  -- O grupo original (com o historico antigo) nao se apaga: partes antigas da app dependem dele.
  if p_group_id = private.legacy_group_id() then
    raise exception 'legacy_group_protected' using errcode = 'P0001';
  end if;
  update public.groups set deleted_at = now(), deleted_by = (select auth.uid())
  where id = p_group_id and deleted_at is null;
  if not found then
    raise exception 'group_not_found' using errcode = 'P0001';
  end if;
  update public.group_invites set revoked_at = now() where group_id = p_group_id and revoked_at is null;
  return now() + interval '30 days';
end;
$$;

create or replace function public.restore_group(p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not private.can_delete_group(p_group_id) then
    raise exception 'group_owner_required' using errcode = '42501';
  end if;
  update public.groups set deleted_at = null, deleted_by = null
  where id = p_group_id and deleted_at is not null and deleted_at > now() - interval '30 days';
  if not found then
    raise exception 'restore_window_over' using errcode = 'P0001';
  end if;
  return p_group_id;
end;
$$;

-- Grupos em quarentena que esta conta pode recuperar (todos, para o dono da app).
create or replace function public.list_deleted_groups()
returns table (id uuid, name text, deleted_at timestamptz, purge_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select grp.id, grp.name, grp.deleted_at, grp.deleted_at + interval '30 days'
  from public.groups as grp
  where (select auth.uid()) is not null
    and grp.deleted_at is not null
    and grp.deleted_at > now() - interval '30 days'
    and private.can_delete_group(grp.id)
  order by grp.deleted_at desc;
$$;

-- Dono da app: todos os grupos, para moderar.
create or replace function public.list_all_groups()
returns table (id uuid, name text, created_at timestamptz, owner_name text, member_count integer, deleted_at timestamptz, purge_at timestamptz, protected boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  return query
  select
    grp.id,
    grp.name,
    grp.created_at,
    (select left(coalesce(nullif(btrim(profile.display_name), ''), nullif(btrim(profile.username), ''), 'Jogador'), 60)
       from public.group_members as owner
       join public.profiles as profile on profile.id = owner.user_id
       where owner.group_id = grp.id and owner.role = 'owner'
       limit 1),
    (select count(*)::integer from public.group_members as member where member.group_id = grp.id),
    grp.deleted_at,
    grp.deleted_at + interval '30 days',
    grp.id = private.legacy_group_id()
  from public.groups as grp
  where grp.deleted_at is null or grp.deleted_at > now() - interval '30 days'
  order by grp.deleted_at nulls first, grp.name;
end;
$$;

revoke execute on function public.delete_group(uuid) from public, anon;
revoke execute on function public.restore_group(uuid) from public, anon;
revoke execute on function public.list_deleted_groups() from public, anon;
revoke execute on function public.list_all_groups() from public, anon;
grant execute on function public.delete_group(uuid) to authenticated;
grant execute on function public.restore_group(uuid) to authenticated;
grant execute on function public.list_deleted_groups() to authenticated;
grant execute on function public.list_all_groups() to authenticated;

-- 3) Grupos apagados nao aparecem na pesquisa de clubes nem nos jogos publicos.
create or replace function public.search_clubs(p_query text)
returns table (id uuid, name text, bio text, logo text, member_count integer, is_member boolean, request_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    grp.id,
    grp.name,
    grp.bio,
    grp.logo,
    (select count(*)::integer from public.group_members as member where member.group_id = grp.id),
    private.is_group_member(grp.id),
    (select request.status from public.group_join_requests as request
      where request.group_id = grp.id and request.user_id = (select auth.uid()) and request.status = 'pending'
      limit 1)
  from public.groups as grp
  where (select auth.uid()) is not null
    and grp.profile_public
    and grp.deleted_at is null
    and (coalesce(btrim(p_query), '') = '' or grp.name ilike '%' || replace(replace(btrim(p_query), '%', ''), '_', '') || '%')
  order by grp.name
  limit 30;
$$;

create or replace function public.list_public_events()
returns table (event_id text, title text, starts_at timestamptz, location text, group_name text, needs text, spots_left integer, my_status text)
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
    greatest(event.max_players - (
      select count(*)::integer from public.event_responses as response
      where response.event_id = event.id and response.status = 'going'
    ), 0),
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

create or replace function public.request_join_group(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.groups where id = p_group_id and profile_public and deleted_at is null) then
    raise exception 'club_not_found' using errcode = 'P0001';
  end if;
  if private.is_group_member(p_group_id) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  select left(coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), ''), 'Jogador'), 60)
  into v_name from public.profiles where id = v_user_id;
  insert into public.group_join_requests (group_id, user_id, requester_name)
  values (p_group_id, v_user_id, coalesce(v_name, 'Jogador'))
  on conflict (group_id, user_id) where status = 'pending' do nothing;
  return 'pending';
end;
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

-- 4) Apagar de vez os grupos com mais de 30 dias de quarentena (pela ordem que as chaves estrangeiras exigem).
create or replace function private.purge_deleted_groups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group record;
  v_count integer := 0;
begin
  for v_group in
    select id from public.groups where deleted_at is not null and deleted_at < now() - interval '30 days'
  loop
    delete from public.events where group_id = v_group.id;
    delete from public.games where group_id = v_group.id;
    delete from public.payments where group_id = v_group.id;
    delete from public.finance_settings where group_id = v_group.id;
    delete from public.players where group_id = v_group.id;
    delete from public.groups where id = v_group.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function private.purge_deleted_groups() from public, anon, authenticated;

-- 5) Tarefa diaria as 03:17 UTC. Se o pg_cron der erro aqui, ativa-o em Database > Extensions e corre so estas linhas.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('footer-purge-deleted-groups', '17 3 * * *', 'select private.purge_deleted_groups()');
