-- Painel do dono da app (2026-11-05): lista de todos os jogadores de todos os clubes.
-- So contas em private.platform_admins a conseguem chamar. Idempotente.

begin;

create or replace function public.list_all_players()
returns table (id text, name text, overall integer, is_guest boolean, group_id uuid, group_name text, account_name text)
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
    player.id,
    player.name,
    player.overall,
    player.is_guest,
    player.group_id,
    grp.name,
    (select left(coalesce(nullif(btrim(profile.display_name), ''), nullif(btrim(profile.username), ''), 'Conta'), 60)
       from public.profiles as profile
       where profile.id = player.linked_user_id)
  from public.players as player
  join public.groups as grp on grp.id = player.group_id
  where grp.deleted_at is null
  order by grp.name, player.name;
end;
$$;

revoke execute on function public.list_all_players() from public, anon;
grant execute on function public.list_all_players() to authenticated;

commit;
