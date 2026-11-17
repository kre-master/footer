-- Cenarios do placard. Correr depois de scoreboard-stub.sql, game-goals-migration.sql e scoreboard-migration.sql.
-- Cada bloco falha com uma excecao se o resultado nao for o esperado.
\set ON_ERROR_STOP on

insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.groups (id, name) values ('00000000-0000-0000-0000-0000000000f0', 'Futeboleiros'), ('00000000-0000-0000-0000-0000000000f1', 'Outro');
insert into public.group_members values
  ('00000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-00000000000a', 'admin'),
  ('00000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-00000000000b', 'member');
insert into public.games (id, date, status, group_id) values
  ('g-hoje', '2026-11-20 21:00+00', 'open', '00000000-0000-0000-0000-0000000000f0'),
  ('g-outro', '2026-11-20 19:00+00', 'open', '00000000-0000-0000-0000-0000000000f0'),
  ('g-semana', '2026-11-13 21:00+00', 'finished', '00000000-0000-0000-0000-0000000000f0'),
  ('g-clube2', '2026-11-20 21:00+00', 'open', '00000000-0000-0000-0000-0000000000f1');

-- Membro nao cria placard; admin cria.
set test.uid = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  perform public.placard_create_device('00000000-0000-0000-0000-0000000000f0', 'Mala');
  raise exception 'FALHA: membro criou placard';
exception when insufficient_privilege then null; end $$;

set test.uid = '00000000-0000-0000-0000-00000000000a';
create temp table k as select public.placard_create_device('00000000-0000-0000-0000-0000000000f0', 'Mala') as key;
do $$ begin
  if (select count(*) from public.scoreboard_devices where key_hash = (select key from k)) <> 0 then
    raise exception 'FALHA: a chave em claro ficou guardada';
  end if;
end $$;

-- O Pi envia sem utilizador (anon).
set test.uid = '';
do $$ begin
  perform public.placard_ingest('chave-errada-chave-errada-chave-errada-00', '[]');
  raise exception 'FALHA: chave errada aceite';
exception when invalid_authorization_specification then null; end $$;

create temp table r1 as select public.placard_ingest((select key from k), '[
 {"id":"10000000-0000-0000-0000-000000000001","sessao":"s1","seq":1,"tipo":"inicio","relogio_s":0,"hora":"2026-11-20T21:05:00Z","resultado":[0,0]},
 {"id":"10000000-0000-0000-0000-000000000002","sessao":"s1","seq":2,"tipo":"golo","lado":"A","relogio_s":120,"hora":"2026-11-20T21:07:00Z","resultado":[1,0]},
 {"id":"10000000-0000-0000-0000-000000000003","sessao":"s1","seq":3,"tipo":"destaque","relogio_s":200,"hora":"2026-11-20T21:08:20Z","resultado":[1,0]},
 {"id":"10000000-0000-0000-0000-000000000004","sessao":"s1","seq":4,"tipo":"golo","relogio_s":250,"hora":"2026-11-20T21:09:10Z","resultado":[1,0]}
]'::jsonb) as res;

do $$ declare r jsonb := (select res from r1); begin
  if (r->>'aceites')::int <> 3 or jsonb_array_length(r->'rejeitados') <> 1 then
    raise exception 'FALHA: esperado 3 aceites e 1 rejeitado (golo sem lado): %', r;
  end if;
  if (select suggested_game_id from public.scoreboard_sessions) <> 'g-hoje' then
    raise exception 'FALHA: sugestao devia ser g-hoje';
  end if;
  if exists (select 1 from public.game_goals) then
    raise exception 'FALHA: aplicou golos antes de o admin confirmar o jogo';
  end if;
  if (select (score_a, score_b, clock_s) from public.scoreboard_sessions) <> row(1, 0, 200::numeric) then
    raise exception 'FALHA: estado ao vivo da sessao errado';
  end if;
end $$;

-- Reenviar o mesmo lote nao duplica.
do $$ declare r jsonb; begin
  r := public.placard_ingest((select key from k), '[{"id":"10000000-0000-0000-0000-000000000002","sessao":"s1","seq":2,"tipo":"golo","lado":"A","relogio_s":120,"hora":"2026-11-20T21:07:00Z","resultado":[1,0]}]');
  if (r->>'repetidos')::int <> 1 or (select count(*) from public.game_scoreboard_events) <> 3 then
    raise exception 'FALHA: repetido nao foi ignorado: %', r;
  end if;
end $$;

-- Membro nao confirma; admin aceita a sugestao e os golos aparecem com o tempo e sem marcador.
set test.uid = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  perform public.placard_confirm_session((select id from public.scoreboard_sessions), 'g-hoje');
  raise exception 'FALHA: membro confirmou';
exception when insufficient_privilege then null; end $$;

set test.uid = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  perform public.placard_confirm_session((select id from public.scoreboard_sessions), 'g-clube2');
  raise exception 'FALHA: aceitou jogo de outro clube';
exception when invalid_parameter_value then null; end $$;

select public.placard_confirm_session((select id from public.scoreboard_sessions), 'g-hoje');
do $$ begin
  if (select count(*) from public.game_goals where game_id = 'g-hoje' and side = 'A' and position = 1 and game_s = 120 and scorer_id is null) <> 1 then
    raise exception 'FALHA: golo do placard nao foi criado';
  end if;
end $$;

-- Depois de confirmado, os eventos novos aplicam-se logo: golo B, golo A, anular A, fim.
set test.uid = '';
select public.placard_ingest((select key from k), '[
 {"id":"10000000-0000-0000-0000-000000000005","sessao":"s1","seq":5,"tipo":"golo","lado":"B","relogio_s":300,"hora":"2026-11-20T21:10:00Z","resultado":[1,1]},
 {"id":"10000000-0000-0000-0000-000000000006","sessao":"s1","seq":6,"tipo":"golo","lado":"A","relogio_s":400,"hora":"2026-11-20T21:11:40Z","resultado":[2,1]},
 {"id":"10000000-0000-0000-0000-000000000007","sessao":"s1","seq":7,"tipo":"anular","lado":"A","relogio_s":410,"hora":"2026-11-20T21:11:50Z","resultado":[1,1]},
 {"id":"10000000-0000-0000-0000-000000000008","sessao":"s1","seq":8,"tipo":"golo","lado":"A","relogio_s":500,"hora":"2026-11-20T21:13:20Z","resultado":[2,1]},
 {"id":"10000000-0000-0000-0000-000000000009","sessao":"s1","seq":9,"tipo":"fim","relogio_s":3000,"hora":"2026-11-20T21:55:00Z","resultado":[2,1]}
]'::jsonb);

do $$ begin
  if (select array_agg(side || position || ':' || game_s order by side, position) from public.game_goals where game_id = 'g-hoje')
     <> array['A1:120', 'A2:500', 'B1:300'] then
    raise exception 'FALHA: golos depois do anular: %', (select array_agg(side || position || ':' || game_s order by side, position) from public.game_goals);
  end if;
  if (select (score_a, score_b, score_saved_at) from public.games where id = 'g-hoje') <> row(2, 1, '2026-11-20 21:55+00'::timestamptz) then
    raise exception 'FALHA: FIM nao gravou o resultado';
  end if;
  if (select status from public.scoreboard_sessions) <> 'finished' then
    raise exception 'FALHA: sessao devia estar terminada';
  end if;
end $$;

-- Admin muda o jogo: os golos saem do anterior e vao para o novo.
set test.uid = '00000000-0000-0000-0000-00000000000a';
select public.placard_confirm_session((select id from public.scoreboard_sessions), 'g-outro');
do $$ begin
  if exists (select 1 from public.game_goals where game_id = 'g-hoje') then
    raise exception 'FALHA: golos ficaram no jogo antigo';
  end if;
  if (select count(*) from public.game_goals where game_id = 'g-outro') <> 3 then
    raise exception 'FALHA: golos nao passaram para o jogo novo';
  end if;
end $$;

-- Placard desligado deixa de entrar.
select public.placard_set_device_active((select id from public.scoreboard_devices), false);
set test.uid = '';
do $$ begin
  perform public.placard_ingest((select key from k), '[]');
  raise exception 'FALHA: placard desligado entrou';
exception when invalid_authorization_specification then null; end $$;

\echo 'OK: cenarios do placard passaram'
