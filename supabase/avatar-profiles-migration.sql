-- Avatar Cromo classico: a aparencia de cada conta (2026-11-11). Aparencia aprovada pelo Jon a 2026-11-11
-- (penteados um a um, todas as barbas e cores).
--
-- Proposta: https://claude.ai/artifact/Up2bpRFSBpoimsTuq5ACDD
-- Ficheiros e ordem das camadas: avatar-teste/cromo-classico/aparencia/256/manifesto.json
--
-- O que faz:
-- 1. avatar_profiles: silhueta (m/f), tom de pele (1..6), penteado, cor do cabelo e pelos faciais
--    de cada conta. Sem linha, a app usa os valores por omissao do manifesto.
-- 2. equipped (jsonb, slot -> id do item, ex. {"camisola": "gear-camisola-01"}) fica guardado mas
--    so se escreve quando houver inventario de itens; por agora a funcao nao lhe toca.
-- 3. public.set_avatar_profile: a unica forma de escrever. Valida o penteado e a barba contra a
--    silhueta. Toda a gente autenticada pode ler (o avatar aparece nas listas e na liga).
--
-- Idempotente: pode correr mais de uma vez.

begin;

create table if not exists public.avatar_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  collection text not null default 'cromo-classico' check (collection in ('cromo-classico')),
  silhouette text not null default 'm' check (silhouette in ('m', 'f')),
  skin_tone smallint not null default 4 check (skin_tone between 1 and 6),
  hair_style text not null,
  hair_color text not null default 'castanho-escuro'
    check (hair_color in ('preto', 'castanho-escuro', 'castanho', 'ruivo', 'loiro', 'grisalho')),
  facial_hair text not null default 'sem'
    check (facial_hair in ('sem', 'bigode', 'barba-por-fazer', 'barba-curta', 'pera')),
  equipped jsonb not null default '{}'::jsonb check (jsonb_typeof(equipped) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint avatar_hair_matches_silhouette check (
    (silhouette = 'm' and hair_style in ('penteado-para-tras', 'rapado', 'encaracolado', 'afro-curto', 'comprido-apanhado'))
    or (silhouette = 'f' and hair_style in (
      'coque',
      'rabo-de-cavalo-1', 'rabo-de-cavalo-2', 'rabo-de-cavalo-3',
      'curto-1', 'curto-2', 'curto-3', 'curto-4',
      'encaracolado-solto-1', 'encaracolado-solto-2', 'encaracolado-solto-3', 'encaracolado-solto-4',
      'trancas-1', 'trancas-2', 'trancas-3', 'trancas-4'))
  ),
  constraint avatar_facial_hair_only_m check (silhouette = 'm' or facial_hair = 'sem')
);

alter table public.avatar_profiles enable row level security;
revoke all on public.avatar_profiles from public, anon, authenticated;
grant select on public.avatar_profiles to authenticated;
drop policy if exists "avatar profiles read" on public.avatar_profiles;
create policy "avatar profiles read" on public.avatar_profiles for select to authenticated using (true);

create or replace function public.set_avatar_profile(
  p_silhouette text,
  p_skin_tone smallint,
  p_hair_style text,
  p_hair_color text,
  p_facial_hair text default 'sem'
) returns public.avatar_profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.avatar_profiles;
begin
  if v_uid is null then
    raise exception 'sem sessao' using errcode = '42501';
  end if;
  insert into public.avatar_profiles as a (user_id, silhouette, skin_tone, hair_style, hair_color, facial_hair)
  values (v_uid, p_silhouette, p_skin_tone, p_hair_style, p_hair_color, coalesce(p_facial_hair, 'sem'))
  on conflict (user_id) do update set
    silhouette = excluded.silhouette,
    skin_tone = excluded.skin_tone,
    hair_style = excluded.hair_style,
    hair_color = excluded.hair_color,
    facial_hair = excluded.facial_hair,
    updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.set_avatar_profile(text, smallint, text, text, text) from public, anon;
grant execute on function public.set_avatar_profile(text, smallint, text, text, text) to authenticated;

commit;
