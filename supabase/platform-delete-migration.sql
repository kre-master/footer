-- Dono da app: eliminar jogadores e contas (2026-11-06). Idempotente. So contas em private.platform_admins.
-- Jogador que ja jogou nao e apagado: fica anonimo ("Jogador removido", sem foto nem conta), para nao
-- estragar resultados, estatisticas dos outros e pagamentos. Jogador sem jogos e apagado.
-- Conta: apagada de vez (perfil, grupos, caracteristicas, disponibilidade, momentos que marcou); as fichas
-- de jogador ficam no grupo, sem conta. Recusa a propria conta, outros donos da app e donos de clubes.

begin;

create or replace function public.list_all_accounts()
returns table (
  id uuid, display_name text, username text, email text, created_at timestamptz, last_sign_in_at timestamptz,
  groups text, owned_groups integer, linked_players integer, moments integer, is_platform_admin boolean
)
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
    account.id,
    coalesce(profile.display_name, ''),
    coalesce(profile.username, ''),
    account.email::text,
    account.created_at,
    account.last_sign_in_at,
    (select string_agg(grp.name, ', ' order by grp.name)
       from public.group_members as member
       join public.groups as grp on grp.id = member.group_id and grp.deleted_at is null
       where member.user_id = account.id),
    (select count(*)::integer
       from public.group_members as member
       join public.groups as grp on grp.id = member.group_id and grp.deleted_at is null
       where member.user_id = account.id and member.role = 'owner'),
    (select count(*)::integer from public.players as player where player.linked_user_id = account.id),
    (select count(*)::integer from public.game_video_bookmarks as bookmark where bookmark.created_by = account.id),
    exists (select 1 from private.platform_admins as admin where admin.user_id = account.id)
  from auth.users as account
  left join public.profiles as profile on profile.id = account.id
  order by account.created_at desc;
end;
$$;

create or replace function public.platform_player_impact(p_player_id text)
returns table (games integer, payments integer, has_account boolean)
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
    (select count(*)::integer from public.games as game
       where p_player_id = any(game.team_a) or p_player_id = any(game.team_b)
          or p_player_id = any(game.bench_a) or p_player_id = any(game.bench_b)),
    (select count(*)::integer from public.payments as payment where payment.player_id = p_player_id),
    exists (select 1 from public.players as player where player.id = p_player_id and player.linked_user_id is not null);
end;
$$;

-- Devolve 'deleted' ou 'anonymized'.
create or replace function public.platform_delete_player(p_player_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_played boolean;
begin
  if not private.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.players where id = p_player_id) then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  select exists (
    select 1 from public.games as game
    where p_player_id = any(game.team_a) or p_player_id = any(game.team_b)
       or p_player_id = any(game.bench_a) or p_player_id = any(game.bench_b)
  ) into v_played;
  if v_played then
    update public.players
    set name = 'Jogador removido', photo_data_url = null, linked_user_id = null, updated_at = now()
    where id = p_player_id;
    delete from public.player_claims where player_id = p_player_id;
    delete from public.player_private_metrics where player_id = p_player_id;
    return 'anonymized';
  end if;
  delete from public.players where id = p_player_id;
  return 'deleted';
end;
$$;

create or replace function public.platform_delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_delete_self' using errcode = 'P0001';
  end if;
  if exists (select 1 from private.platform_admins where user_id = p_user_id) then
    raise exception 'cannot_delete_platform_admin' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.group_members as member
    join public.groups as grp on grp.id = member.group_id and grp.deleted_at is null
    where member.user_id = p_user_id and member.role = 'owner'
  ) then
    raise exception 'owns_groups' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.list_all_accounts() from public, anon;
revoke all on function public.platform_player_impact(text) from public, anon;
revoke all on function public.platform_delete_player(text) from public, anon;
revoke all on function public.platform_delete_account(uuid) from public, anon;
grant execute on function public.list_all_accounts() to authenticated;
grant execute on function public.platform_player_impact(text) to authenticated;
grant execute on function public.platform_delete_player(text) to authenticated;
grant execute on function public.platform_delete_account(uuid) to authenticated;

commit;
