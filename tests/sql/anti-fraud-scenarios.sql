\set ON_ERROR_STOP on
-- 12 contas (u01..u12), u01 admin que joga, u12 admin que nao joga; u11 sem email confirmado.
insert into auth.users (id, email_confirmed_at, created_at)
select ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid,
       case when i = 11 then null else now() end, now() - interval '60 days'
from generate_series(1, 12) i;
insert into public.groups (id, name) values ('00000000-0000-0000-0000-0000000000a1', 'Real'), ('00000000-0000-0000-0000-0000000000b1', 'Fantasma'), ('00000000-0000-0000-0000-0000000000c1', 'Outro');
insert into public.group_members select '00000000-0000-0000-0000-0000000000a1', id, 'player' from auth.users;
update public.group_members set role = 'admin' where user_id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012');
insert into public.group_members values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'owner');
insert into public.group_members values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000002', 'owner');
-- Fichas do clube real: r01..r11 ligadas a u01..u11
insert into public.players select 'r' || lpad(i::text, 2, '0'), 'R' || i, ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, false, '00000000-0000-0000-0000-0000000000a1' from generate_series(1, 11) i;
-- Clube fantasma: f01 ligada a u01, f02..f10 sem conta
insert into public.players values ('f01', 'F1', '00000000-0000-0000-0000-000000000001', false, '00000000-0000-0000-0000-0000000000b1');
insert into public.players select 'f' || lpad(i::text, 2, '0'), 'F' || i, null, false, '00000000-0000-0000-0000-0000000000b1' from generate_series(2, 10) i;
-- Outro clube com as mesmas contas u02..u10 (para o limite diario)
insert into public.players select 'o' || lpad(i::text, 2, '0'), 'O' || i, ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, false, '00000000-0000-0000-0000-0000000000c1' from generate_series(2, 10) i;

create temp table results (scenario text, expected text, got text);
create or replace function pg_temp.check(sc text, expected text, got text) returns void language sql as $$ insert into results values (sc, expected, got) $$;

select set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);

-- 0. Jogo antigo
select pg_temp.check('0 jogo antigo fica arquivo', 'archive', (select verification from games where id = 'legacy'));

-- 1. Jogo real: criado aberto, terminado, 7 fechos
insert into games (id, date, status, team_a, team_b, group_id, verification, created_at)
values ('real1', now() - interval '2 hours', 'open', '{r01,r02,r03,r04,r05}', '{r06,r07,r08,r09,r10}', '00000000-0000-0000-0000-0000000000a1', 'verified', '2020-01-01');
select pg_temp.check('1a cliente nao escolhe verification nem created_at', 'pending/today', (select verification || '/' || case when created_at > now() - interval '1 minute' then 'today' else 'forged' end from games where id = 'real1'));
update games set status = 'finished', score_a = 5, score_b = 3 where id = 'real1';
insert into game_feedback (game_id, player_id) select 'real1', 'r0' || i from generate_series(1, 6) i;
select pg_temp.check('1b com 6 fechos ainda a confirmar', 'pending', (select verification from games where id = 'real1'));
insert into game_mvp_votes (game_id, voter_player_id, candidate_player_id, created_at) values ('real1', 'r07', 'r01', now() - interval '10 days');
select pg_temp.check('1c 7.a confirmacao (voto MVP) verifica', 'verified', (select verification from games where id = 'real1'));
select pg_temp.check('1d hora do voto e a do servidor', 'true', (select (created_at > now() - interval '1 minute')::text from game_mvp_votes where game_id = 'real1'));
select pg_temp.check('1e recompensas: 10 presencas, 5 vitorias, 5 derrotas', '10/5/5', (select count(*) filter (where reason = 'presence') || '/' || count(*) filter (where reason = 'win') || '/' || count(*) filter (where reason = 'loss') from reward_ledger where game_id = 'real1' and status = 'granted'));
select pg_temp.check('1f XP do vencedor u01', '160', (select sum(xp)::text from reward_ledger where game_id = 'real1' and user_id = '00000000-0000-0000-0000-000000000001' and status = 'granted'));

-- 2. Cliente tenta marcar verificado
update games set verification = 'pending', created_at = null where id = 'real1';
select pg_temp.check('2 cliente nao desfaz verificacao', 'verified/kept', (select verification || '/' || case when created_at is null then 'lost' else 'kept' end from games where id = 'real1'));

-- 3. Clube fantasma: 1 conta + 9 fichas sem conta
insert into games (id, date, status, team_a, team_b, score_a, score_b, group_id)
values ('fake1', now() - interval '1 hour', 'finished', '{f01,f02,f03,f04,f05}', '{f06,f07,f08,f09,f10}', 10, 0, '00000000-0000-0000-0000-0000000000b1');
select pg_temp.check('3 clube fantasma nao verifica', 'pending', (select verification from games where id = 'fake1'));
select pg_temp.check('3b clube fantasma sem recompensas', '0', (select count(*)::text from reward_ledger where game_id = 'fake1' and status <> 'revoked'));

-- 4. Jogo retroativo: data ha 5 dias, registado hoje
insert into games (id, date, status, team_a, team_b, score_a, score_b, group_id)
values ('retro1', now() - interval '5 days', 'finished', '{r01,r02,r03,r04,r05}', '{r06,r07,r08,r09,r10}', 2, 1, '00000000-0000-0000-0000-0000000000a1');
insert into game_feedback (game_id, player_id) select 'retro1', 'r0' || i from generate_series(1, 9) i;
select pg_temp.check('4 jogo retroativo fica arquivo', 'archive', (select verification from games where id = 'retro1'));

-- 5. Mesmo dia, outro clube, mesmas contas: limite de 1 jogo por dia
insert into games (id, date, status, team_a, team_b, score_a, score_b, group_id)
values ('other1', now() - interval '1 hour', 'finished', '{o02,o03,o04,o05}', '{o06,o07,o08,o09,o10}', 1, 1, '00000000-0000-0000-0000-0000000000c1');
insert into game_feedback (game_id, player_id) select 'other1', 'o0' || i from generate_series(2, 9) i;
select pg_temp.check('5a segundo clube verifica', 'verified', (select verification from games where id = 'other1'));
select pg_temp.check('5b mas as contas ja recompensadas hoje ficam capped', 'capped', (select string_agg(distinct status, ',') from reward_ledger where game_id = 'other1'));

-- 6. Sobreposicao: outro jogo do clube real 30 min depois
insert into games (id, date, status, team_a, team_b, score_a, score_b, group_id)
values ('dup1', now() - interval '90 minutes', 'finished', '{r01,r02,r03,r04,r05}', '{r06,r07,r08,r09,r10}', 5, 3, '00000000-0000-0000-0000-0000000000a1');
insert into game_feedback (game_id, player_id) select 'dup1', 'r0' || i from generate_series(1, 8) i;
select pg_temp.check('6 jogo repetido nao verifica', 'pending', (select verification from games where id = 'dup1'));
select pg_temp.check('6b motivo', '["overlapping_game"]', (select (verification_details -> 'failed')::text from games where id = 'dup1'));

-- 7. Email por confirmar: u11 entra num jogo; recompensa em espera ate confirmar
update games set team_b = '{r06,r07,r08,r09,r11}' where id = 'real1';
select pg_temp.check('7a u10 saiu: recompensa revogada', 'revoked', (select string_agg(distinct status, ',') from reward_ledger where game_id = 'real1' and user_id = '00000000-0000-0000-0000-000000000010'));
select pg_temp.check('7b u11 sem email: em espera', 'held:email_unconfirmed', (select string_agg(distinct status || ':' || hold_reason, ',') from reward_ledger where game_id = 'real1' and user_id = '00000000-0000-0000-0000-000000000011'));
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-000000000011';
select private.refresh_held_rewards(null);
select pg_temp.check('7c depois de confirmar: atribuida', 'granted', (select string_agg(distinct status, ',') from reward_ledger where game_id = 'real1' and user_id = '00000000-0000-0000-0000-000000000011'));
select pg_temp.check('7d edicao dentro das 48 h fica no registo', '1', (select count(*)::text from game_audit_log where game_id = 'real1' and action = 'edit' and not needs_approval));

-- 8. Admin que jogou muda o resultado depois do prazo
update reward_settings set window_hours = 1;
update games set score_a = 9 where id = 'real1';
select pg_temp.check('8a fica sinalizado', 'flagged', (select verification from games where id = 'real1'));
select pg_temp.check('8b recompensas em espera', 'held:awaiting_approval', (select string_agg(distinct status || ':' || hold_reason, ',') from reward_ledger where game_id = 'real1' and status <> 'revoked'));
select pg_temp.check('8c o proprio nao aprova', 'error', (select 'error'));
do $$ begin perform public.approve_game_change('real1'); raise exception 'should fail'; exception when sqlstate 'P0001' then if sqlerrm not in ('cannot_approve_own_change') then raise; end if; end $$;
select set_config('test.uid', '00000000-0000-0000-0000-000000000012', false);
update reward_settings set window_hours = 48;
select pg_temp.check('8d outro admin aprova', 'verified', public.approve_game_change('real1'));
select pg_temp.check('8e recompensas atribuidas outra vez', 'granted', (select string_agg(distinct status, ',') from reward_ledger where game_id = 'real1' and status <> 'revoked'));

-- 9. Apagar voto MVP fica no registo; apagar o jogo revoga
delete from game_mvp_votes where game_id = 'real1';
select pg_temp.check('9a voto apagado no registo', '1', (select count(*)::text from game_audit_log where game_id = 'real1' and action = 'mvp_vote_deleted'));
select pg_temp.check('9b apagar o voto tirou a 7.a confirmacao: jogo volta a pending', 'pending', (select verification from games where id = 'real1'));
delete from games where id = 'real1';
select pg_temp.check('9c jogo apagado: nada fica ativo', '0', (select count(*)::text from reward_ledger where game_id is null and status <> 'revoked'));

-- 10. Upsert completo da app (mesmos valores) nao mexe em nada
select set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
insert into games (id, date, status, team_a, team_b, score_a, score_b, group_id)
select id, date, status, team_a, team_b, score_a, score_b, group_id from games where id = 'other1'
on conflict (id) do update set date = excluded.date, status = excluded.status, team_a = excluded.team_a, team_b = excluded.team_b, score_a = excluded.score_a, score_b = excluded.score_b, updated_at = now();
select pg_temp.check('10 upsert igual mantem verificado e sem registo', 'verified/0', (select verification || '/' || (select count(*) from game_audit_log where game_id = 'other1') from games where id = 'other1'));

delete from games where id = 'other1';
select pg_temp.check('10b jogo verificado apagado: revogado', 'revoked:game_deleted', (select string_agg(distinct status || ':' || hold_reason, ',') from reward_ledger where game_id is null and hold_reason = 'game_deleted'));
select pg_temp.check('10c registo de auditoria sobrevive ao jogo apagado', '1', (select count(*)::text from game_audit_log where action = 'mvp_vote_deleted'));

-- 11. Prazo passado na tarefa de hora a hora
update reward_settings set window_hours = 1;
select private.evaluate_pending_games();
select pg_temp.check('11 jogo fantasma depois do prazo: arquivo', 'archive', (select verification from games where id = 'fake1'));

select scenario, expected, got, case when expected = got then 'ok' else 'FALHOU' end as estado from results;
