-- Perfis publicos de jogadores (2026-11-07): cada pessoa escolhe se aparece em Procurar.
--
-- - profiles.profile_public: por defeito false (escondido). So a propria pessoa o muda, por RPC.
-- - search_players passa a devolver tambem os jogadores publicos de qualquer clube (nome e clube,
--   nunca a classificacao) e deixa de exigir texto: sem texto mostra so os publicos.
--   Jogadores de clubes a que a pessoa pertence continuam a aparecer ao procurar, com classificacao.
-- - O nome do clube so aparece a quem nao e membro se o clube tiver o perfil publico.
-- Idempotente.

begin;

alter table public.profiles add column if not exists profile_public boolean not null default false;

create or replace function public.set_profile_public(p_public boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  update public.profiles
  set profile_public = coalesce(p_public, false), updated_at = now()
  where id = (select auth.uid());
  return coalesce(p_public, false);
end;
$$;

revoke all on function public.set_profile_public(boolean) from public, anon;
grant execute on function public.set_profile_public(boolean) to authenticated;

drop function if exists public.search_players(text);
create function public.search_players(p_query text)
returns table (
  player_id text,
  name text,
  overall integer,
  group_id uuid,
  group_name text,
  is_guest boolean,
  is_member boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    player.id,
    player.name,
    case when private.is_group_member(grp.id) then player.overall else null end,
    grp.id,
    case when private.is_group_member(grp.id) or grp.profile_public then grp.name else null end,
    player.is_guest,
    private.is_group_member(grp.id)
  from public.players as player
  join public.groups as grp on grp.id = player.group_id and grp.deleted_at is null
  left join public.profiles as owner on owner.id = player.linked_user_id
  where (select auth.uid()) is not null
    and (
      (private.is_group_member(grp.id) and char_length(btrim(coalesce(p_query, ''))) >= 1)
      or (not player.is_guest and coalesce(owner.profile_public, false))
    )
    and (coalesce(btrim(p_query), '') = '' or player.name ilike '%' || replace(replace(btrim(p_query), '%', ''), '_', '') || '%')
  order by (not private.is_group_member(grp.id)), player.is_guest, player.name
  limit 40;
$$;

revoke all on function public.search_players(text) from public, anon;
grant execute on function public.search_players(text) to authenticated;

commit;
