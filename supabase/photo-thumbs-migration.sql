-- Arranque mais rapido (fase 2): miniaturas das fotos e percursos do tracking a pedido.
--
-- Corre no SQL Editor do projeto "kre-master's Project". Pode correr-se mais de uma vez.
-- Nao apaga nem reescreve dados: acrescenta uma coluna e tres funcoes, e actualiza o gatilho das fotos.
-- A app funciona antes e depois desta migracao (sem ela, pede tudo como antes).
--
-- O que muda para a app (tudo com as mesmas regras de acesso RLS de hoje):
--   1. players.photo_thumb: miniatura da foto (lado maior 300 px). A lista de jogadores deixa de trazer a foto grande
--      (1,5 MB no clube principal) e a app pede-a so para exportar imagens.
--   2. photo_size(players): tamanho da foto em bytes, como coluna calculada, para saber quem tem foto sem a descarregar.
--   3. tracking_results_light(): igual a game_tracking_results mas sem result.players[].timeline.path (2,34 MB -> 345 KB).
--   4. tracking_player_path(): devolve o percurso de um jogador quando se abre a analise.
--   5. Gatilho players_guard_self_update: o proprio jogador (nao admin) passa a poder gravar tambem photo_thumb,
--      como ja pode gravar photo_data_url. Nao pode alterar mais nada, tal como antes.

begin;

-- 1. Miniatura da foto. Fica vazia ate a app a gerar (admins do grupo e o proprio jogador gravam-na ao abrir a app).
alter table public.players add column if not exists photo_thumb text not null default '';

-- 2. Tamanho da foto sem a descarregar (octet_length nao descomprime o valor).
create or replace function public.photo_size(p public.players)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$ select coalesce(octet_length(p.photo_data_url), 0) $$;

-- 3. Gatilho das fotos: igual ao actual, mais photo_thumb na lista do que o proprio jogador pode alterar.
create or replace function private.players_guard_self_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and not private.is_group_admin(old.group_id)
     and (to_jsonb(new) - 'photo_data_url' - 'photo_thumb' - 'updated_at')
         is distinct from (to_jsonb(old) - 'photo_data_url' - 'photo_thumb' - 'updated_at') then
    raise exception 'players_self_update_only_photo' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 4. Resultados de tracking sem os percursos. SECURITY INVOKER: aplica as regras RLS de game_tracking_results
--    (membros veem os publicados, admins veem tambem os rascunhos).
create or replace function public.tracking_results_light()
returns table (
  id uuid,
  game_id text,
  revision integer,
  schema_version text,
  run_id text,
  status text,
  result jsonb,
  mapping jsonb,
  source_file text,
  imported_at timestamptz,
  published_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.id, t.game_id, t.revision, t.schema_version, t.run_id, t.status,
    case when jsonb_typeof(t.result -> 'players') = 'array'
      then jsonb_set(
        t.result,
        '{players}',
        coalesce(
          (select jsonb_agg(e.p #- '{timeline,path}' order by e.o)
           from jsonb_array_elements(t.result -> 'players') with ordinality as e(p, o)),
          '[]'::jsonb))
      else t.result
    end,
    t.mapping, t.source_file, t.imported_at, t.published_at
  from public.game_tracking_results t
$$;

-- 5. Percurso de um jogador num resultado (o que a funcao anterior retira). Mesmas regras RLS.
create or replace function public.tracking_player_path(p_result_id uuid, p_label text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select e.p -> 'timeline' -> 'path'
  from public.game_tracking_results t
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(t.result -> 'players') = 'array' then t.result -> 'players' else '[]'::jsonb end
  ) as e(p)
  where t.id = p_result_id and e.p ->> 'label' = p_label
  limit 1
$$;

-- So utilizadores com sessao.
revoke execute on function public.photo_size(public.players) from public, anon;
revoke execute on function public.tracking_results_light() from public, anon;
revoke execute on function public.tracking_player_path(uuid, text) from public, anon;
grant execute on function public.photo_size(public.players) to authenticated;
grant execute on function public.tracking_results_light() to authenticated;
grant execute on function public.tracking_player_path(uuid, text) to authenticated;

commit;

notify pgrst, 'reload schema';

-- Verificacao (so leitura): deve dar 5 jogos, ~345 KB e 'sem_path' verdadeiro.
-- select count(*) jogos, sum(octet_length(result::text)) bytes, bool_and(not exists (
--   select 1 from jsonb_array_elements(result -> 'players') p where p -> 'timeline' ? 'path')) sem_path
-- from public.tracking_results_light() where status = 'published';
-- select id, name, photo_size(players) from public.players order by 3 desc limit 5;

-- Para desfazer (a app volta ao comportamento antigo sozinha; as miniaturas perdem-se, as fotos nao):
-- drop function if exists public.tracking_player_path(uuid, text);
-- drop function if exists public.tracking_results_light();
-- drop function if exists public.photo_size(public.players);
-- alter table public.players drop column if exists photo_thumb;
-- (e voltar a pôr no gatilho private.players_guard_self_update so 'photo_data_url' e 'updated_at' na lista de excepcoes)
