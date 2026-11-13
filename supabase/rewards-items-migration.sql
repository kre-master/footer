-- XP completo, conquistas e itens ganhos por conta (2026-11-13). Assenta em anti-fraud-rewards-migration.sql.
--
-- O que faz:
-- 1. reward_settings ganha os valores que faltavam: XP de MVP (80) e de resposta a convocatoria (15),
--    XP por raridade das conquistas (25/50/100/200/400/800) e a tabela das conquistas (percurso, slot,
--    medida e os 6 patamares). Tudo editavel numa linha so, sem mexer no codigo.
-- 2. private.evaluate_game passa a chamar private.evaluate_game_extras no fim de cada jogo verificado:
--    - MVP oficial (5 votos ou mais, votacao fechada 24 h depois do resultado; empates contam para todos);
--    - resposta a convocatoria do jogo (Vou, Talvez ou Nao vou valem o mesmo), dada ate 1 h depois do inicio;
--    - conquistas: cada patamar atingido da o item gear-<slot>-0N (01 Comum ... 06 Mitico) e o XP da raridade.
-- 3. Os itens e o XP vivem no reward_ledger (item_id, rarity, reason 'achievement:<percurso>:<N>'). Duas vistas
--    so de leitura, cada conta ve as suas: public.owned_items (o cacifo) e public.my_progress (XP e nivel).
-- 4. De hora a hora volta a avaliar os jogos verificados dos ultimos 3 dias, para o MVP fechar as 24 h.
-- 5. No fim, reavalia os jogos ja verificados (o de 11 nov e o primeiro que conta).
--
-- Conquistas desta primeira vaga (so precisam de jogos verificados; golos e tracking ficam para depois):
--   camisola   R02 Presenca em campo     jogos verificados                 1/5/12/25/50/100
--   calcoes    R04 Vitorias              vitorias                          1/3/8/20/40/75
--   meias      R06 Invencivel            jogos seguidos sem perder no clube 2/3/4/5/7/10
--   chuteiras  R03 Assiduidade           jogos seguidos do clube presentes  3/5/8/12/18/26
--   bola       R07 MVP                   MVPs oficiais                     1/2/4/7/12/20
--   galhardete R12 Responde sempre       convocatorias respondidas         1/5/15/30/60/100
--
-- Se um jogo deixar de contar (corrigido, arquivado), as conquistas que dependiam dele sao revogadas e
-- voltam a ser dadas quando o jogador as atingir de novo. Parar de jogar nunca tira itens.
-- Os limites de 1 jogo por dia e 4 por semana valem para tudo o que vem de um jogo (feito em grant_reward).
--
-- Idempotente: pode correr mais de uma vez.

begin;

-- ---------------------------------------------------------------------------
-- 1. Valores
-- ---------------------------------------------------------------------------

alter table public.reward_settings add column if not exists achievement_xp jsonb not null
  default '{"common": 25, "uncommon": 50, "rare": 100, "epic": 200, "legendary": 400, "mythic": 800}'::jsonb;

alter table public.reward_settings add column if not exists achievements jsonb not null default '[
  {"id": "r02", "name": "Presenca em campo", "slot": "camisola",   "metric": "presence",        "tiers": [1, 5, 12, 25, 50, 100]},
  {"id": "r04", "name": "Vitorias",          "slot": "calcoes",    "metric": "win",             "tiers": [1, 3, 8, 20, 40, 75]},
  {"id": "r06", "name": "Invencivel",        "slot": "meias",      "metric": "unbeaten_streak", "tiers": [2, 3, 4, 5, 7, 10]},
  {"id": "r03", "name": "Assiduidade",       "slot": "chuteiras",  "metric": "presence_streak", "tiers": [3, 5, 8, 12, 18, 26]},
  {"id": "r07", "name": "MVP",               "slot": "bola",       "metric": "mvp",             "tiers": [1, 2, 4, 7, 12, 20]},
  {"id": "r12", "name": "Responde sempre",   "slot": "galhardete", "metric": "response",        "tiers": [1, 5, 15, 30, 60, 100]}
]'::jsonb;

-- Junta mvp e response ao XP por jogo, sem apagar valores ja mudados a mao.
update public.reward_settings
set xp = '{"presence": 100, "win": 60, "draw": 30, "loss": 15, "mvp": 80, "response": 15}'::jsonb || xp,
    updated_at = now()
where not (xp ? 'mvp' and xp ? 'response');

-- ---------------------------------------------------------------------------
-- 2. Medidas
-- ---------------------------------------------------------------------------

-- MVP oficial de um jogo (mesma regra da app: 5 votos ou mais, o mais votado, empates contam todos).
-- So depois de a votacao fechar (24 h depois do resultado gravado).
create or replace function private.official_mvp_users(p_game_id text)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  with g as (
    select * from public.games
    where id = p_game_id and now() >= coalesce(score_saved_at, date) + interval '24 hours'
  ),
  c as (
    select v.candidate_player_id, count(*) as n
    from public.game_mvp_votes v join g on g.id = v.game_id
    group by v.candidate_player_id
  ),
  t as (select sum(n) as total, max(n) as top from c)
  select distinct p.linked_user_id
  from c join t on c.n = t.top and t.total >= 5
  join public.players p on p.id = c.candidate_player_id
  where p.linked_user_id is not null
$$;

-- Convocatoria de um jogo: a ligada ao jogo, ou a do mesmo clube marcada ate 3 h antes ou depois.
create or replace function private.game_event_id(p_game_id text)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(g.event_id, (
    select e.id from public.events e
    where e.group_id = g.group_id and e.status <> 'cancelled'
      and e.starts_at between g.date - interval '3 hours' and g.date + interval '3 hours'
    order by abs(extract(epoch from e.starts_at - g.date)) limit 1))
  from public.games g where g.id = p_game_id
$$;

-- Medidas de uma conta, so com jogos verificados e recompensas que contam (granted ou held).
create or replace function private.achievement_metrics(p_user_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with mine as (
    select l.reason, l.game_id
    from public.reward_ledger l join public.games g on g.id = l.game_id
    where l.user_id = p_user_id and l.status in ('granted', 'held') and g.verification = 'verified'
  ),
  clubs as (
    select distinct g.group_id from mine m join public.games g on g.id = m.game_id where m.reason = 'presence'
  ),
  seq as (
    select g.group_id, g.date,
      exists (select 1 from mine m where m.game_id = g.id and m.reason = 'presence') as present,
      exists (select 1 from mine m where m.game_id = g.id and m.reason in ('win', 'draw')) as unbeaten
    from public.games g join clubs c on c.group_id = g.group_id
    where g.verification = 'verified'
  ),
  runs as (
    select present, unbeaten,
      sum(case when present then 0 else 1 end) over (partition by group_id order by date) as gp,
      sum(case when unbeaten then 0 else 1 end) over (partition by group_id order by date) as gu,
      group_id
    from seq
  )
  select jsonb_build_object(
    'presence', (select count(*) from mine where reason = 'presence'),
    'win', (select count(*) from mine where reason = 'win'),
    'mvp', (select count(*) from mine where reason = 'mvp'),
    'response', (select count(*) from mine where reason = 'response'),
    'presence_streak', coalesce((select max(n) from (select count(*) as n from runs where present group by group_id, gp) x), 0),
    'unbeaten_streak', coalesce((select max(n) from (select count(*) as n from runs where unbeaten group by group_id, gu) x), 0))
$$;

-- Da as conquistas atingidas (no jogo que esta a ser avaliado) e revoga as que deixaram de se verificar.
create or replace function private.evaluate_achievements(p_user_id uuid, p_game_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.reward_settings := private.reward_settings();
  v_metrics jsonb := private.achievement_metrics(p_user_id);
  v_rarities text[] := array['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  a jsonb;
  v_value integer;
  v_reason text;
  v_rarity text;
  n integer;
begin
  for a in select * from jsonb_array_elements(s.achievements) loop
    v_value := coalesce((v_metrics ->> (a ->> 'metric'))::integer, 0);
    for n in 1..6 loop
      v_reason := 'achievement:' || (a ->> 'id') || ':' || n;
      v_rarity := v_rarities[n];
      if v_value >= ((a -> 'tiers') ->> (n - 1))::integer then
        if not exists (select 1 from public.reward_ledger
                       where user_id = p_user_id and reason = v_reason and status in ('granted', 'held')) then
          perform private.grant_reward(p_user_id, p_game_id, v_reason,
            coalesce((s.achievement_xp ->> v_rarity)::integer, 0),
            'gear-' || (a ->> 'slot') || '-0' || n, v_rarity);
        end if;
      else
        update public.reward_ledger
        set status = 'revoked', hold_reason = 'no_longer_applies', updated_at = now()
        where user_id = p_user_id and reason = v_reason and status <> 'revoked';
      end if;
    end loop;
  end loop;
end;
$$;

-- MVP, respostas e conquistas de um jogo verificado. Chamada no fim de private.evaluate_game.
create or replace function private.evaluate_game_extras(p_game_id text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.reward_settings := private.reward_settings();
  g public.games%rowtype;
  v_event text;
  v_mvp_closed boolean;
  r record;
begin
  select * into g from public.games where id = p_game_id;
  if not found or g.verification <> 'verified' then
    return;
  end if;
  v_event := private.game_event_id(g.id);
  v_mvp_closed := now() >= coalesce(g.score_saved_at, g.date) + interval '24 hours';

  -- MVP: so quando a votacao fecha; revoga quem deixou de ser MVP.
  if v_mvp_closed then
    update public.reward_ledger l
    set status = 'revoked', hold_reason = 'no_longer_applies', updated_at = now()
    where l.game_id = g.id and l.reason = 'mvp' and l.status <> 'revoked'
      and l.user_id not in (select u from private.official_mvp_users(g.id) u);
    for r in
      select u as user_id from private.official_mvp_users(g.id) u
      where u in (select ro.user_id from private.game_roster(g.id) ro)
    loop
      perform private.grant_reward(r.user_id, g.id, 'mvp', coalesce((s.xp ->> 'mvp')::integer, 0));
    end loop;
  end if;

  -- Respostas a convocatoria: qualquer resposta dada ate 1 h depois do inicio.
  update public.reward_ledger l
  set status = 'revoked', hold_reason = 'no_longer_applies', updated_at = now()
  where l.game_id = g.id and l.reason = 'response' and l.status <> 'revoked'
    and not exists (
      select 1 from public.event_responses er
      where er.event_id = v_event and er.user_id = l.user_id and er.updated_at <= g.date + interval '1 hour');
  if v_event is not null then
    for r in
      select distinct er.user_id from public.event_responses er
      where er.event_id = v_event and er.user_id is not null and er.updated_at <= g.date + interval '1 hour'
    loop
      perform private.grant_reward(r.user_id, g.id, 'response', coalesce((s.xp ->> 'response')::integer, 0));
    end loop;
  end if;

  -- Conquistas de todos os que tem recompensas neste jogo.
  for r in
    select distinct l.user_id from public.reward_ledger l
    where l.game_id = g.id and l.reason not like 'achievement:%'
  loop
    perform private.evaluate_achievements(r.user_id, g.id);
  end loop;
end;
$$;

-- De hora a hora: jogos verificados dos ultimos 3 dias (fecho do MVP as 24 h).
create or replace function private.evaluate_recent_verified_games()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id from public.games
    where verification = 'verified' and date > now() - interval '3 days'
    order by date
  loop
    perform private.evaluate_game_extras(r.id);
    perform private.refresh_held_rewards(null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Avaliacao do jogo (igual a anti-fraude, com a chamada as extras no fim)
-- ---------------------------------------------------------------------------

create or replace function private.evaluate_game(p_game_id text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  s public.reward_settings := private.reward_settings();
  g public.games%rowtype;
  v_deadline timestamptz;
  v_accounts integer := 0;
  v_side_a integer := 0;
  v_side_b integer := 0;
  v_host integer := 0;
  v_confirmed integer := 0;
  v_overlap boolean := false;
  v_on_time boolean;
  v_failed text[] := '{}';
  v_details jsonb;
  v_state text;
  v_result text;
  v_xp jsonb := s.xp;
  r record;
begin
  -- Trancar o jogo: dois fechos ao mesmo tempo avaliam um de cada vez.
  select * into g from public.games where id = p_game_id for update;
  if not found then
    return null;
  end if;

  -- Jogos de antes desta regra: ficam de arquivo.
  if g.created_at is null then
    perform private.set_game_verification(g.id, 'archive', '{"reason": "legacy"}'::jsonb);
    update public.reward_ledger set status = 'revoked', hold_reason = 'game_archived', updated_at = now()
    where game_id = g.id and status <> 'revoked';
    return 'archive';
  end if;

  -- A espera da aprovacao de outro admin: recompensas em espera.
  if g.verification = 'flagged' then
    update public.reward_ledger set status = 'held', hold_reason = 'awaiting_approval', updated_at = now()
    where game_id = g.id and status in ('granted', 'held') and hold_reason is distinct from 'awaiting_approval';
    return 'flagged';
  end if;

  if g.status <> 'finished' or g.finished_at is null then
    perform private.set_game_verification(g.id, 'pending', jsonb_build_object('reason', 'not_finished'));
    update public.reward_ledger set status = 'revoked', hold_reason = 'game_reopened', updated_at = now()
    where game_id = g.id and status <> 'revoked';
    return 'pending';
  end if;

  v_deadline := g.date + make_interval(hours => s.window_hours);
  v_on_time := g.finished_at >= g.date and g.finished_at <= v_deadline;

  select count(*), count(*) filter (where side = 'A'), count(*) filter (where side = 'B'), count(*) filter (where is_host)
  into v_accounts, v_side_a, v_side_b, v_host
  from private.game_roster(g.id);

  select count(*) into v_confirmed
  from private.game_roster(g.id) ro
  where exists (
      select 1 from public.game_feedback f
      join public.players p on p.id = f.player_id
      where f.game_id = g.id and p.linked_user_id = ro.user_id and f.created_at <= v_deadline)
    or exists (
      select 1 from public.game_mvp_votes v
      join public.players p on p.id = v.voter_player_id
      where v.game_id = g.id and p.linked_user_id = ro.user_id and v.created_at <= v_deadline);

  select exists (
    select 1 from public.games o
    where o.group_id = g.group_id and o.id <> g.id and o.verification = 'verified'
      and o.date > g.date - make_interval(hours => s.overlap_hours)
      and o.date < g.date + make_interval(hours => s.overlap_hours)
  ) into v_overlap;

  if not v_on_time then v_failed := array_append(v_failed, 'result_late'); end if;
  if v_accounts < s.min_accounts then v_failed := array_append(v_failed, 'few_accounts'); end if;
  if v_side_a < s.min_accounts_per_team or v_side_b < s.min_accounts_per_team then v_failed := array_append(v_failed, 'unbalanced_accounts'); end if;
  if v_host < s.min_host_accounts then v_failed := array_append(v_failed, 'few_host_accounts'); end if;
  if v_confirmed < s.min_confirmations or v_confirmed * 2 < v_accounts then v_failed := array_append(v_failed, 'few_confirmations'); end if;
  if v_overlap then v_failed := array_append(v_failed, 'overlapping_game'); end if;

  v_details := jsonb_build_object(
    'accounts', v_accounts, 'accounts_a', v_side_a, 'accounts_b', v_side_b, 'host_accounts', v_host,
    'confirmations', v_confirmed, 'needed_confirmations', greatest(s.min_confirmations, (v_accounts + 1) / 2),
    'deadline', v_deadline, 'failed', to_jsonb(v_failed), 'evaluated_at', now());

  if cardinality(v_failed) = 0 then
    v_state := 'verified';
  elsif not v_on_time or now() > v_deadline then
    -- Passou o prazo (ou o resultado ja chegou tarde): sem recompensa.
    v_state := 'archive';
  else
    v_state := 'pending';
  end if;

  perform private.set_game_verification(g.id, v_state, v_details);

  if v_state <> 'verified' then
    update public.reward_ledger
    set status = 'revoked', hold_reason = case when v_state = 'archive' then 'game_archived' else 'game_unverified' end, updated_at = now()
    where game_id = g.id and status <> 'revoked';
    return v_state;
  end if;

  -- Verificado: recompensas de quem esta nas equipas; revoga as de quem saiu ou mudou de resultado.
  update public.reward_ledger l
  set status = 'revoked', hold_reason = 'no_longer_applies', updated_at = now()
  where l.game_id = g.id and l.status <> 'revoked' and l.reason in ('presence', 'win', 'draw', 'loss')
    and not exists (
      select 1 from private.game_roster(g.id) ro
      where ro.user_id = l.user_id
        and (l.reason = 'presence'
             or (g.score_a is not null and g.score_b is not null and l.reason = case
                   when g.score_a = g.score_b then 'draw'
                   when (g.score_a > g.score_b) = (ro.side = 'A') then 'win'
                   else 'loss' end)));

  for r in select * from private.game_roster(g.id) order by user_id loop
    perform private.grant_reward(r.user_id, g.id, 'presence', coalesce((v_xp ->> 'presence')::integer, 0));
    if g.score_a is not null and g.score_b is not null then
      v_result := case
        when g.score_a = g.score_b then 'draw'
        when (g.score_a > g.score_b) = (r.side = 'A') then 'win'
        else 'loss' end;
      perform private.grant_reward(r.user_id, g.id, v_result, coalesce((v_xp ->> v_result)::integer, 0));
    end if;
  end loop;

  -- MVP, respostas a convocatoria e conquistas (rewards-items-migration.sql).
  perform private.evaluate_game_extras(g.id);

  perform private.refresh_held_rewards(g.group_id);
  return 'verified';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Leitura: cacifo e progresso (cada conta ve as suas linhas, pela RLS do reward_ledger)
-- ---------------------------------------------------------------------------

-- Nivel a partir do XP total: XP(L) = 30 (L-1)^2 + 70 (L-1), maximo 50.
create or replace function public.xp_level(p_xp integer)
returns integer
language sql immutable set search_path = ''
as $$
  select least(50, greatest(1, 1 + floor((-70 + sqrt(4900 + 120 * greatest(p_xp, 0)::numeric)) / 60)::integer))
$$;

create or replace function public.xp_for_level(p_level integer)
returns integer
language sql immutable set search_path = ''
as $$ select 30 * (greatest(p_level, 1) - 1) * (greatest(p_level, 1) - 1) + 70 * (greatest(p_level, 1) - 1) $$;

drop view if exists public.owned_items;
create view public.owned_items with (security_invoker = true) as
select l.user_id,
       l.item_id,
       split_part(l.item_id, '-', 2) as slot,
       right(l.item_id, 1)::integer as level,
       l.rarity,
       min(l.created_at) as earned_at,
       (array_agg(l.reason order by l.created_at))[1] as source,
       (array_agg(l.game_id order by l.created_at))[1] as game_id,
       (array_agg(l.group_id order by l.created_at))[1] as group_id
from public.reward_ledger l
where l.status = 'granted' and l.item_id ~ '^gear-[a-z]+-0[1-6]$'
group by l.user_id, l.item_id, l.rarity;

drop view if exists public.my_progress;
create view public.my_progress with (security_invoker = true) as
select l.user_id,
       sum(l.xp)::integer as total_xp,
       public.xp_level(sum(l.xp)::integer) as level,
       public.xp_for_level(public.xp_level(sum(l.xp)::integer)) as level_start_xp,
       public.xp_for_level(public.xp_level(sum(l.xp)::integer) + 1) as next_level_xp
from public.reward_ledger l
where l.status = 'granted'
group by l.user_id;

revoke all on public.owned_items, public.my_progress from public, anon;
grant select on public.owned_items, public.my_progress to authenticated;

revoke all on function private.official_mvp_users(text) from public, anon, authenticated;
revoke all on function private.game_event_id(text) from public, anon, authenticated;
revoke all on function private.achievement_metrics(uuid) from public, anon, authenticated;
revoke all on function private.evaluate_achievements(uuid, text) from public, anon, authenticated;
revoke all on function private.evaluate_game_extras(text) from public, anon, authenticated;
revoke all on function private.evaluate_recent_verified_games() from public, anon, authenticated;
revoke all on function private.evaluate_game(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Jogos ja verificados: o de 11 nov e o primeiro que conta
-- ---------------------------------------------------------------------------

select private.evaluate_game(id) from public.games where verification = 'verified' order by date;

commit;

-- Fora da transacao: se o pg_cron der erro aqui, ativa-o em Database > Extensions e corre so esta linha.
select cron.schedule('footer-evaluate-recent-verified-games', '17 * * * *', 'select private.evaluate_recent_verified_games()');
