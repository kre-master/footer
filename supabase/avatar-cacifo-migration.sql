-- Avatar Cromo classico: cacifo (itens vestidos e kits guardados) (2026-11-13).
--
-- avatar_profiles.equipped ja existe (slot -> id do item). Aqui juntam-se os kits guardados e a
-- unica forma de escrever os dois: public.set_avatar_cacifo.
--
-- Slots: camisola, calcoes, meias, chuteiras, bola, galhardete. Ids: gear-<slot>-01..06
-- (01 Common ... 06 Mythic). Chave em falta = kit Cromo classico de origem; null = tirado.
--
-- Os itens sao de teste (decisao do Jon, 2026-11-13): por agora todas as contas podem vestir
-- qualquer um. Quando houver inventario, esta funcao passa a validar o id contra ele.
--
-- Idempotente: pode correr mais de uma vez.

begin;

alter table public.avatar_profiles
  add column if not exists kits jsonb not null default '[]'::jsonb;

alter table public.avatar_profiles drop constraint if exists avatar_kits_is_array;
alter table public.avatar_profiles
  add constraint avatar_kits_is_array check (jsonb_typeof(kits) = 'array' and jsonb_array_length(kits) <= 8);

-- Valida um objeto slot -> id: so os 6 slots, cada valor null ou gear-<slot>-01..06.
create or replace function public.avatar_equipped_valid(p_equipped jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_typeof(p_equipped) = 'object'
    and not exists (
      select 1 from jsonb_each(p_equipped) e
      where e.key not in ('camisola', 'calcoes', 'meias', 'chuteiras', 'bola', 'galhardete')
         or not (
           jsonb_typeof(e.value) = 'null'
           or (jsonb_typeof(e.value) = 'string' and (e.value #>> '{}') = 'gear-' || e.key || '-0' || right(e.value #>> '{}', 1)
               and right(e.value #>> '{}', 1) between '1' and '6')
         )
    );
$$;

create or replace function public.set_avatar_cacifo(p_equipped jsonb, p_kits jsonb default '[]'::jsonb)
returns public.avatar_profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.avatar_profiles;
  v_kit jsonb;
begin
  if v_uid is null then
    raise exception 'sem sessao' using errcode = '42501';
  end if;
  if not public.avatar_equipped_valid(coalesce(p_equipped, '{}'::jsonb)) then
    raise exception 'itens invalidos' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_kits, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_kits, '[]'::jsonb)) > 8 then
    raise exception 'kits invalidos' using errcode = '22023';
  end if;
  for v_kit in select * from jsonb_array_elements(coalesce(p_kits, '[]'::jsonb)) loop
    if jsonb_typeof(v_kit) <> 'object'
       or jsonb_typeof(v_kit -> 'nome') <> 'string'
       or char_length(v_kit ->> 'nome') not between 1 and 24
       or not public.avatar_equipped_valid(coalesce(v_kit -> 'equipped', 'null'::jsonb)) then
      raise exception 'kit invalido' using errcode = '22023';
    end if;
  end loop;

  update public.avatar_profiles
     set equipped = coalesce(p_equipped, '{}'::jsonb),
         kits = coalesce(p_kits, '[]'::jsonb),
         updated_at = now()
   where user_id = v_uid
  returning * into v_row;
  if not found then
    raise exception 'guarda primeiro a aparencia' using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

revoke all on function public.avatar_equipped_valid(jsonb) from public, anon;
grant execute on function public.avatar_equipped_valid(jsonb) to authenticated;
revoke all on function public.set_avatar_cacifo(jsonb, jsonb) from public, anon;
grant execute on function public.set_avatar_cacifo(jsonb, jsonb) to authenticated;

commit;
