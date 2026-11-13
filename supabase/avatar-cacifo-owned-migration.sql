-- Avatar Cromo classico: o cacifo so veste itens ganhos (2026-11-13).
--
-- Passa a validar o equipped contra public.owned_items (reward_ledger com status granted), em vez de
-- deixar vestir qualquer item de teste. Os kits so guardam combinacoes (formato valido); quando se veste
-- um kit a app ignora o que a conta ja nao tem. Chave em falta = kit de origem; null = tirado.
--
-- Depende de supabase/avatar-cacifo-migration.sql e de supabase/rewards-items-migration.sql.
-- Idempotente: pode correr mais de uma vez.

begin;

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
  v_item text;
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

  -- So se veste o que se ganhou (itens revogados deixam de estar em owned_items).
  for v_item in select e.value #>> '{}' from jsonb_each(coalesce(p_equipped, '{}'::jsonb)) e where jsonb_typeof(e.value) = 'string' loop
    if not exists (select 1 from public.owned_items o where o.user_id = v_uid and o.item_id = v_item) then
      raise exception 'item por ganhar: %', v_item using errcode = '42501';
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

revoke all on function public.set_avatar_cacifo(jsonb, jsonb) from public, anon;
grant execute on function public.set_avatar_cacifo(jsonb, jsonb) to authenticated;

commit;
