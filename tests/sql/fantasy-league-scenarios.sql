-- Cenarios da Liga Fantasia. Correr depois de anti-fraud-stub.sql, da migracao anti-fraude e da
-- migracao da liga (ambas sem as linhas cron.*). Todos os resultados devem sair 'ok'.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
insert into auth.users (id, email_confirmed_at, created_at)
select ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid,
       case when i = 9 then null else now() end, now() - interval '60 days'
from generate_series(1, 9) i;

create temp table results (scenario text, expected text, got text);
grant insert on results to public;
create or replace function pg_temp.check(sc text, expected text, got text) returns void language sql as $$ insert into results values (sc, expected, got) $$;
create or replace function pg_temp.err(q text) returns text language plpgsql as $$
begin execute q; return 'sem erro'; exception when others then return sqlerrm; end $$;
create or replace function pg_temp.league() returns uuid language sql as $$ select id from fantasy_leagues where is_test and status = 'running' $$;

-- 1. Liga de teste criada pela migracao
select pg_temp.check('1a 8 equipas', '8', (select count(*)::text from fantasy_teams where league_id = pg_temp.league()));
select pg_temp.check('1b 56 jogadores, todos IA', '56/56', (select count(*) || '/' || count(*) filter (where user_id is null) from fantasy_players where league_id = pg_temp.league() and left_at is null));
select pg_temp.check('1c cada equipa com guarda-redes', '8', (select count(distinct team_id)::text from fantasy_players where league_id = pg_temp.league() and position = 'GR' and left_at is null));
select pg_temp.check('1d 56 jogos em 14 jornadas', '56/14', (select count(*) || '/' || count(distinct round) from fantasy_fixtures where league_id = pg_temp.league()));
select pg_temp.check('1e cada equipa 7 em casa e 7 fora', '8', (select count(*)::text from (
  select t.id from fantasy_teams t where t.league_id = pg_temp.league()
  and (select count(*) from fantasy_fixtures where home_team_id = t.id) = 7
  and (select count(*) from fantasy_fixtures where away_team_id = t.id) = 7) x));
select pg_temp.check('1f cada par joga duas vezes', '28', (select count(*)::text from (
  select least(home_team_id::text, away_team_id::text), greatest(home_team_id::text, away_team_id::text)
  from fantasy_fixtures where league_id = pg_temp.league() group by 1, 2 having count(*) = 2) x));
select pg_temp.check('1g uma jornada por equipa por semana', '0', (select count(*)::text from (
  select round, t from (select round, home_team_id t from fantasy_fixtures union all select round, away_team_id from fantasy_fixtures) y group by 1, 2 having count(*) > 1) x));
select pg_temp.check('1h jornadas a segunda 21:00 de Lisboa', '1 21:00',
  (select string_agg(distinct extract(dow from kickoff at time zone 'Europe/Lisbon') || ' ' || to_char(kickoff at time zone 'Europe/Lisbon', 'HH24:MI'), ',') from fantasy_fixtures));
select pg_temp.check('1i IA com os 20 pontos iniciais (+-10%)', 'ok', (select case when min(s) >= 18 and max(s) <= 22 then 'ok' else min(s) || '..' || max(s) end from (
  select shooting + speed + passing + dribbling + defending + physical + goalkeeping - 280 s from fantasy_players where user_id is null) x));
select pg_temp.check('1j criar de novo devolve a mesma liga', '1', (select private.fantasy_create_test_league() = pg_temp.league())::int::text);

-- 2. Perfil: todos comecam iguais, 20 pontos no nivel 1
select set_config('test.uid', '00000000-0000-0000-0000-000000000101', false);
select pg_temp.check('2a pontos no nivel 1', '20 1', (select points || ' ' || account_level from fantasy_my_points()));
select pg_temp.check('2b mais de 20 pontos recusado', 'So tens 20 pontos para distribuir.',
  pg_temp.err($q$select fantasy_save_profile('Ana', 'ATA', 61, 40, 40, 40, 40, 40, 40)$q$));
select pg_temp.check('2c acima de 75 recusado', 'Cada atributo fica entre 40 e 75.',
  pg_temp.err($q$select fantasy_save_profile('Ana', 'ATA', 76, 40, 40, 40, 40, 40, 40)$q$));
select pg_temp.check('2d abaixo de 40 recusado', 'Cada atributo fica entre 40 e 75.',
  pg_temp.err($q$select fantasy_save_profile('Ana', 'ATA', 39, 40, 40, 40, 40, 40, 61)$q$));
select pg_temp.check('2e posicao invalida', 'Posicao invalida.', pg_temp.err($q$select fantasy_save_profile('Ana', 'X', 40, 40, 40, 40, 40, 40, 40)$q$));
select pg_temp.check('2f 20 pontos aceites', 'sem erro', pg_temp.err($q$select fantasy_save_profile('Ana', 'ATA', 50, 45, 40, 45, 40, 40, 40)$q$));
-- XP concedido sobe o nivel: 260 XP = nivel 3 = 22 pontos; held nao conta
insert into reward_ledger (user_id, reason, xp, status) values
  ('00000000-0000-0000-0000-000000000101', 'presence', 260, 'granted'),
  ('00000000-0000-0000-0000-000000000101', 'win', 5000, 'held');
select pg_temp.check('2g nivel pelo XP concedido', '22 3', (select points || ' ' || account_level from fantasy_my_points()));
delete from reward_ledger where user_id = '00000000-0000-0000-0000-000000000101';

-- 3. Entrar na liga
select pg_temp.check('3a sem perfil recusado', 'Cria primeiro o teu jogador.',
  pg_temp.err((select format('select set_config(%L, %L, false); select fantasy_join_test_league()', 'test.uid', '00000000-0000-0000-0000-000000000102'))));
select set_config('test.uid', '00000000-0000-0000-0000-000000000109', false);
select fantasy_save_profile('Sem email', 'MED', 40, 40, 40, 40, 40, 40, 40);
select pg_temp.check('3b email por confirmar recusado', 'Confirma o email da conta antes de entrar na liga.', pg_temp.err('select fantasy_join_test_league()'));
select set_config('test.uid', '00000000-0000-0000-0000-000000000101', false);
select fantasy_join_test_league();
select pg_temp.check('3c entra no lugar de um IA', '56/55', (select count(*) || '/' || count(*) filter (where user_id is null) from fantasy_players where league_id = pg_temp.league() and left_at is null));
select pg_temp.check('3d entrar outra vez nao duplica', '1', (select (fantasy_join_test_league() = (select id from fantasy_players where user_id = auth.uid() and left_at is null))::int::text));
-- Guarda-redes entra no lugar de um GR de IA
select set_config('test.uid', '00000000-0000-0000-0000-000000000102', false);
select fantasy_save_profile('Bea', 'GR', 40, 40, 40, 40, 40, 40, 60);
select fantasy_join_test_league();
select pg_temp.check('3e GR substitui um GR de IA', '8', (select count(*)::text from fantasy_players where league_id = pg_temp.league() and position = 'GR' and left_at is null));
-- Outros 5 jogadores, sorteados pelas equipas
do $$ declare i int; begin
  for i in 3 .. 8 loop
    perform set_config('test.uid', '00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'), false);
    perform fantasy_save_profile('J' || i, (array['DEF','MED','ATA'])[1 + i % 3], 45, 45, 45, 45, 40, 40, 40);
    perform fantasy_join_test_league();
  end loop;
end $$;
select pg_temp.check('3f 8 reais na liga', '8', (select count(*)::text from fantasy_players where league_id = pg_temp.league() and user_id is not null and left_at is null));
select pg_temp.check('3g planteis continuam com 7', '7', (select string_agg(distinct n::text, ',') from (select count(*) n from fantasy_players where league_id = pg_temp.league() and left_at is null group by team_id) x));

-- 4. Escritas diretas do cliente recusadas
set role authenticated;
select pg_temp.check('4a cliente nao escreve perfis', 'permission denied for table fantasy_profiles',
  pg_temp.err($q$update public.fantasy_profiles set shooting = 75$q$));
select pg_temp.check('4b cliente nao escreve jogos', 'permission denied for table fantasy_fixtures',
  pg_temp.err($q$update public.fantasy_fixtures set home_goals = 9$q$));
select pg_temp.check('4c cliente nao corre jornadas', 'permission denied for function fantasy_play_due',
  pg_temp.err($q$select private.fantasy_play_due()$q$));
select pg_temp.check('4d cliente le a tabela', 'ok', (select case when count(*) = 8 then 'ok' else count(*)::text end from public.fantasy_standings where league_id = (select id from public.fantasy_leagues where is_test and status = 'running')));
reset role;

-- 5. Forma: presenca num jogo nos 7 dias antes da jornada
insert into reward_ledger (user_id, reason, xp, status, game_day) values
  ('00000000-0000-0000-0000-000000000101', 'presence', 100, 'capped', (now() at time zone 'Europe/Lisbon')::date - 2),
  ('00000000-0000-0000-0000-000000000103', 'presence', 100, 'revoked', (now() at time zone 'Europe/Lisbon')::date - 2),
  ('00000000-0000-0000-0000-000000000104', 'presence', 100, 'granted', (now() at time zone 'Europe/Lisbon')::date - 9);
create temp table lu as
select x from fantasy_teams t, lateral private.fantasy_lineup(t.id, now()) l,
  lateral jsonb_array_elements((l->'field') || jsonb_build_array(l->'gk')) x
where t.league_id = pg_temp.league();
select pg_temp.check('5a em forma quem jogou (capped conta)', 'true', (select (x->>'in_form') from lu where x->>'user_id' = '00000000-0000-0000-0000-000000000101'));
select pg_temp.check('5b presenca revogada nao conta', 'false', coalesce((select (x->>'in_form') from lu where x->>'user_id' = '00000000-0000-0000-0000-000000000103'), 'false'));
select pg_temp.check('5c presenca ha 9 dias nao conta', 'false', coalesce((select (x->>'in_form') from lu where x->>'user_id' = '00000000-0000-0000-0000-000000000104'), 'false'));
select pg_temp.check('5d forma soma 2 (remate 50 -> 52)', '52', (select x->>'shooting' from lu where x->>'user_id' = '00000000-0000-0000-0000-000000000101'));
select pg_temp.check('5e onze = 1 GR + 4', '40', (select count(*)::text from lu));

-- 6. Jornada 1
update fantasy_fixtures set kickoff = now() - interval '1 hour' where league_id = pg_temp.league() and round = 1;
select pg_temp.check('6a joga os 4 jogos da jornada 1', '4', private.fantasy_play_due()::text);
select pg_temp.check('6b nada mais por jogar', '0', private.fantasy_play_due()::text);
select pg_temp.check('6c golos = eventos de golo', 'ok', (select case when sum(home_goals + away_goals) = (select count(*) from fantasy_match_events where kind = 'goal') then 'ok' else 'diferente' end from fantasy_fixtures where played_at is not null));
select pg_temp.check('6d guarda seed e onzes', '4', (select count(*)::text from fantasy_fixtures where played_at is not null and seed is not null and lineups ? 'home' and lineups ? 'away'));
-- Repetir com a mesma seed e os mesmos atributos da o mesmo resultado
create temp table r1 as select id, home_goals, away_goals, seed from fantasy_fixtures where played_at is not null;
delete from fantasy_match_events where fixture_id in (select id from r1);
update fantasy_fixtures set played_at = null, home_goals = null, away_goals = null where id in (select id from r1);
select private.fantasy_play_fixture(id) from r1;
select pg_temp.check('6e mesma seed, mesmo resultado', '4', (select count(*)::text from r1 join fantasy_fixtures f using (id) where f.home_goals = r1.home_goals and f.away_goals = r1.away_goals));
select pg_temp.check('6f tabela com 4 jogos x 2', '8', (select sum(played)::text from fantasy_standings where league_id = pg_temp.league()));

-- 7. Sair: a IA volta a preencher
select set_config('test.uid', '00000000-0000-0000-0000-000000000108', false);
select fantasy_leave_league();
select private.fantasy_ensure_squads(pg_temp.league());
select pg_temp.check('7a plantel volta a 7 com IA', '7', (select string_agg(distinct n::text, ',') from (select count(*) n from fantasy_players where league_id = pg_temp.league() and left_at is null group by team_id) x));
select pg_temp.check('7b 7 reais', '7', (select count(*)::text from fantasy_players where league_id = pg_temp.league() and user_id is not null and left_at is null));

-- 8. Fim de epoca abre a seguinte com os mesmos jogadores
create temp table old_league as select pg_temp.league() id;
update fantasy_fixtures set kickoff = now() - interval '1 hour' where league_id = (select id from old_league) and played_at is null;
select pg_temp.check('8a joga as 13 jornadas restantes', '52', private.fantasy_play_due()::text);
select pg_temp.check('8b epoca 1 terminada', 'finished', (select status from fantasy_leagues where id = (select id from old_league)));
select pg_temp.check('8c epoca 2 a correr', '2', (select season::text from fantasy_leagues where id = pg_temp.league()));
select pg_temp.check('8d reais passam para a epoca 2', '7', (select count(*)::text from fantasy_players where league_id = pg_temp.league() and user_id is not null and left_at is null));
select pg_temp.check('8e calendario novo', '56', (select count(*)::text from fantasy_fixtures where league_id = pg_temp.league() and played_at is null));

-- 9. Calibracao: golos por equipa e jogo na epoca 1 (motor em Python: 2,65)
select pg_temp.check('9a golos por equipa e jogo entre 1,5 e 4', 'ok', (select case when avg(g) between 1.5 and 4 then 'ok' else round(avg(g), 2)::text end
  from (select home_goals g from fantasy_fixtures where league_id = (select id from old_league) union all select away_goals from fantasy_fixtures where league_id = (select id from old_league)) x));

\o
select scenario, case when expected = got then 'ok' else 'FALHOU: esperado ' || expected || ', veio ' || coalesce(got, 'null') end as resultado
from results order by scenario;
