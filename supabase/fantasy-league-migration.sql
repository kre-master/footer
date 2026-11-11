-- Liga Fantasia, liga de teste (2026-11-11). Regras aprovadas pelo Jon a 2026-11-11.
--
-- Proposta: https://claude.ai/artifact/16mEPVpumgdvy99RtikELE (motor calibrado em Python antes).
--
-- O que faz:
-- 1. fantasy_settings: os numeros do motor numa linha so (forma +2, 36 lances, 20 pontos...).
-- 2. fantasy_profiles: o jogador de fantasia de cada conta (posicao e 7 atributos de 40 a 75).
--    Todos comecam iguais: 40 em tudo e 20 pontos para distribuir, mais 1 por nivel de conta
--    (nivel a partir do XP concedido em reward_ledger).
-- 3. fantasy_leagues / fantasy_teams / fantasy_players: uma liga de teste com 8 equipas de 7
--    (5 contra 5 em campo). Quem entra fica numa equipa ao acaso, no lugar de um jogador de IA.
-- 4. fantasy_fixtures / fantasy_match_events: duas voltas, uma jornada por semana (segunda 21:00
--    de Lisboa). Cada jogo guarda a seed e os atributos usados, para se poder auditar.
-- 5. private.fantasy_play_due: joga as jornadas em atraso (pg_cron de hora a hora). No fim da
--    epoca abre a seguinte com as mesmas equipas.
--
-- Separacao do futebol real (nota 12): nada daqui escreve em games, players, reward_ledger ou
-- estatisticas. O real so entra num sentido: XP concedido (pontos) e presenca num jogo verificado
-- nos 7 dias antes da jornada (forma +2).
--
-- Itens: os bonus dos itens ficam desligados (fantasy_settings.item_bonuses_enabled = false) ate
-- haver itens na base de dados. O cliente so le; todas as escritas passam por funcoes.
--
-- Idempotente: pode correr mais de uma vez.

begin;

-- ---------------------------------------------------------------------------
-- 1. Regras do motor
-- ---------------------------------------------------------------------------

create table if not exists public.fantasy_settings (
  id boolean primary key default true check (id),
  start_points integer not null default 20 check (start_points >= 0),
  attr_base integer not null default 40 check (attr_base between 1 and 99),
  attr_cap integer not null default 75 check (attr_cap between 1 and 99),
  form_bonus integer not null default 2 check (form_bonus >= 0),
  form_days integer not null default 7 check (form_days > 0),
  knee integer not null default 70 check (knee between 1 and 99),
  moves integer not null default 36 check (moves > 0),
  k_possession numeric not null default 12 check (k_possession > 0),
  base_chance numeric not null default 0.4,
  k_chance numeric not null default 10 check (k_chance > 0),
  base_goal numeric not null default 0.5,
  k_goal numeric not null default 10 check (k_goal > 0),
  team_count integer not null default 8 check (team_count >= 2 and team_count % 2 = 0),
  squad_size integer not null default 7 check (squad_size >= 5),
  ai_spread numeric not null default 0.10 check (ai_spread between 0 and 0.5),
  kickoff_dow integer not null default 1 check (kickoff_dow between 0 and 6),
  kickoff_time time not null default '21:00',
  item_bonuses_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.fantasy_settings (id) values (true) on conflict (id) do nothing;
alter table public.fantasy_settings enable row level security;
revoke all on public.fantasy_settings from public, anon, authenticated;
grant select on public.fantasy_settings to authenticated;
drop policy if exists "fantasy settings read" on public.fantasy_settings;
create policy "fantasy settings read" on public.fantasy_settings for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. Jogador de fantasia de cada conta
-- ---------------------------------------------------------------------------

create table if not exists public.fantasy_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  position text not null check (position in ('GR', 'DEF', 'MED', 'ATA')),
  shooting smallint not null default 40 check (shooting between 1 and 99),
  speed smallint not null default 40 check (speed between 1 and 99),
  passing smallint not null default 40 check (passing between 1 and 99),
  dribbling smallint not null default 40 check (dribbling between 1 and 99),
  defending smallint not null default 40 check (defending between 1 and 99),
  physical smallint not null default 40 check (physical between 1 and 99),
  goalkeeping smallint not null default 40 check (goalkeeping between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fantasy_profiles enable row level security;
revoke all on public.fantasy_profiles from public, anon, authenticated;
grant select on public.fantasy_profiles to authenticated;
drop policy if exists "fantasy profiles read" on public.fantasy_profiles;
create policy "fantasy profiles read" on public.fantasy_profiles for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. Ligas, equipas e jogadores (reais ou IA)
-- ---------------------------------------------------------------------------

create table if not exists public.fantasy_leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season integer not null default 1 check (season > 0),
  is_test boolean not null default false,
  status text not null default 'running' check (status in ('running', 'finished')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index if not exists fantasy_leagues_one_running_test
on public.fantasy_leagues (is_test) where is_test and status = 'running';

create table if not exists public.fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.fantasy_leagues(id) on delete cascade,
  slot smallint not null check (slot > 0),
  name text not null,
  unique (league_id, slot)
);

create table if not exists public.fantasy_players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.fantasy_leagues(id) on delete cascade,
  team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  ai_name text,
  position text not null check (position in ('GR', 'DEF', 'MED', 'ATA')),
  ai_factor numeric,
  -- So para IA (os reais usam fantasy_profiles na hora da jornada).
  shooting smallint, speed smallint, passing smallint, dribbling smallint,
  defending smallint, physical smallint, goalkeeping smallint,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  check ((user_id is null) = (ai_name is not null))
);
create unique index if not exists fantasy_players_one_active_per_user
on public.fantasy_players (league_id, user_id) where user_id is not null and left_at is null;
create index if not exists fantasy_players_team_idx on public.fantasy_players (team_id) where left_at is null;

create table if not exists public.fantasy_fixtures (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.fantasy_leagues(id) on delete cascade,
  round smallint not null check (round > 0),
  home_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  away_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  kickoff timestamptz not null,
  home_goals smallint,
  away_goals smallint,
  seed integer,
  lineups jsonb,
  played_at timestamptz,
  check (home_team_id <> away_team_id)
);
create index if not exists fantasy_fixtures_due_idx on public.fantasy_fixtures (kickoff) where played_at is null;
create index if not exists fantasy_fixtures_league_idx on public.fantasy_fixtures (league_id, round);

create table if not exists public.fantasy_match_events (
  id bigint generated always as identity primary key,
  fixture_id uuid not null references public.fantasy_fixtures(id) on delete cascade,
  seq smallint not null,
  team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  player_id uuid references public.fantasy_players(id) on delete set null,
  player_name text not null,
  kind text not null check (kind in ('goal', 'save', 'miss')),
  unique (fixture_id, seq)
);

do $$
declare t text;
begin
  foreach t in array array['fantasy_leagues', 'fantasy_teams', 'fantasy_players', 'fantasy_fixtures', 'fantasy_match_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists "fantasy read" on public.%I', t);
    execute format('create policy "fantasy read" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Tabela classificativa calculada dos jogos ja jogados.
create or replace view public.fantasy_standings with (security_invoker = true) as
with r as (
  select f.league_id, f.home_team_id as team_id, f.home_goals as gf, f.away_goals as ga
  from public.fantasy_fixtures f where f.played_at is not null
  union all
  select f.league_id, f.away_team_id, f.away_goals, f.home_goals
  from public.fantasy_fixtures f where f.played_at is not null
)
select t.league_id, t.id as team_id, t.name, t.slot,
  count(r.team_id)::integer as played,
  count(*) filter (where r.gf > r.ga)::integer as won,
  count(*) filter (where r.gf = r.ga)::integer as drawn,
  count(*) filter (where r.gf < r.ga)::integer as lost,
  coalesce(sum(r.gf), 0)::integer as goals_for,
  coalesce(sum(r.ga), 0)::integer as goals_against,
  (3 * count(*) filter (where r.gf > r.ga) + count(*) filter (where r.gf = r.ga))::integer as points
from public.fantasy_teams t
left join r on r.team_id = t.id
group by t.league_id, t.id, t.name, t.slot;
grant select on public.fantasy_standings to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Funcoes de apoio
-- ---------------------------------------------------------------------------

create or replace function private.fantasy_settings()
returns public.fantasy_settings
language sql stable security definer set search_path = ''
as $$ select * from public.fantasy_settings where id $$;

-- Nivel de conta a partir do XP concedido: XP(L) = 30(L-1)^2 + 70(L-1), maximo 50.
create or replace function private.fantasy_account_level(p_user_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  with x as (
    select coalesce(sum(xp), 0) as xp from public.reward_ledger
    where user_id = p_user_id and status = 'granted'
  )
  select least(50, coalesce(max(l), 1))::integer
  from x, generate_series(1, 50) l
  where 30 * (l - 1) ^ 2 + 70 * (l - 1) <= x.xp
$$;

create or replace function private.fantasy_points_for(p_user_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$ select (private.fantasy_settings()).start_points + private.fantasy_account_level(p_user_id) - 1 $$;

-- Distribui p_points pelos atributos segundo a posicao (para IA). Usa random(): chamar depois de setseed
-- quando se quer repetir.
create or replace function private.fantasy_ai_attrs(p_position text, p_points integer)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  keys text[];
  weights numeric[];
  a jsonb := jsonb_build_object('shooting', s.attr_base, 'speed', s.attr_base, 'passing', s.attr_base,
    'dribbling', s.attr_base, 'defending', s.attr_base, 'physical', s.attr_base, 'goalkeeping', s.attr_base);
  i integer; j integer; r numeric; acc numeric; k text; left_points integer := greatest(p_points, 0);
  guard integer := 0;
begin
  if p_position = 'GR' then
    keys := array['goalkeeping', 'physical'];
    weights := array[0.9, 0.1];
  elsif p_position = 'ATA' then
    keys := array['shooting', 'speed', 'dribbling', 'passing'];
    weights := array[0.4, 0.25, 0.25, 0.1];
  elsif p_position = 'MED' then
    keys := array['passing', 'dribbling', 'physical', 'defending'];
    weights := array[0.35, 0.25, 0.2, 0.2];
  else
    keys := array['defending', 'physical', 'speed'];
    weights := array[0.45, 0.35, 0.2];
  end if;
  while left_points > 0 and guard < 2000 loop
    guard := guard + 1;
    r := random(); acc := 0; k := keys[array_length(keys, 1)];
    for i in 1 .. array_length(keys, 1) loop
      acc := acc + weights[i];
      if r < acc then k := keys[i]; exit; end if;
    end loop;
    j := (a ->> k)::integer;
    if j < s.attr_cap then
      a := jsonb_set(a, array[k], to_jsonb(j + 1));
      left_points := left_points - 1;
    end if;
  end loop;
  return a;
end;
$$;

-- Pontos-alvo da IA: mediana dos pontos gastos pelos jogadores reais ativos da liga (ou os pontos iniciais).
create or replace function private.fantasy_ai_target(p_league_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    round(percentile_cont(0.5) within group (order by
      (fp.shooting + fp.speed + fp.passing + fp.dribbling + fp.defending + fp.physical + fp.goalkeeping)
      - 7 * (private.fantasy_settings()).attr_base))::integer,
    (private.fantasy_settings()).start_points)
  from public.fantasy_players p
  join public.fantasy_profiles fp on fp.user_id = p.user_id
  where p.league_id = p_league_id and p.left_at is null
$$;

create or replace function private.fantasy_ai_name()
returns text
language sql volatile set search_path = ''
as $$
  select (array['Tiago','Rui','Nuno','Bruno','Hugo','Pedro','André','Joel','Fábio','Diogo','Vasco','Ivo','Marco','Sérgio','Luís','Ricardo','Filipe','Duarte','Gil','Telmo'])[1 + floor(random() * 20)::integer]
    || ' ' ||
    (array['Ferraz','Barbosa','Pinto','Teixeira','Lobo','Coelho','Mota','Valente','Seixas','Rebelo','Amaral','Brito','Castro','Fontes','Godinho','Leite','Moura','Paiva','Quintas','Sardinha'])[1 + floor(random() * 20)::integer]
$$;

create or replace function private.fantasy_add_ai(p_league_id uuid, p_team_id uuid, p_position text)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  v_factor numeric := 1 + (random() * 2 - 1) * s.ai_spread;
  a jsonb := private.fantasy_ai_attrs(p_position, round(private.fantasy_ai_target(p_league_id) * v_factor)::integer);
  v_id uuid;
begin
  insert into public.fantasy_players (league_id, team_id, ai_name, position, ai_factor,
    shooting, speed, passing, dribbling, defending, physical, goalkeeping)
  values (p_league_id, p_team_id, private.fantasy_ai_name(), p_position, v_factor,
    (a->>'shooting')::smallint, (a->>'speed')::smallint, (a->>'passing')::smallint, (a->>'dribbling')::smallint,
    (a->>'defending')::smallint, (a->>'physical')::smallint, (a->>'goalkeeping')::smallint)
  returning id into v_id;
  return v_id;
end;
$$;

-- Cada equipa com um guarda-redes e o plantel cheio; a IA preenche o que falta.
create or replace function private.fantasy_ensure_squads(p_league_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  t record; n integer;
begin
  for t in select id from public.fantasy_teams where league_id = p_league_id order by slot loop
    if not exists (select 1 from public.fantasy_players where team_id = t.id and left_at is null and position = 'GR') then
      perform private.fantasy_add_ai(p_league_id, t.id, 'GR');
    end if;
    select count(*) into n from public.fantasy_players where team_id = t.id and left_at is null;
    while n < s.squad_size loop
      perform private.fantasy_add_ai(p_league_id, t.id, (array['DEF', 'MED', 'ATA'])[1 + floor(random() * 3)::integer]);
      n := n + 1;
    end loop;
  end loop;
end;
$$;

-- A IA acompanha os reais: refaz os atributos de quem se afastou mais de 2 pontos do alvo.
create or replace function private.fantasy_recalibrate_ai(p_league_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  v_target integer := private.fantasy_ai_target(p_league_id);
  p record; a jsonb; v_points integer;
begin
  for p in select * from public.fantasy_players where league_id = p_league_id and user_id is null and left_at is null loop
    v_points := round(v_target * p.ai_factor)::integer;
    if abs((p.shooting + p.speed + p.passing + p.dribbling + p.defending + p.physical + p.goalkeeping) - 7 * s.attr_base - v_points) > 2 then
      a := private.fantasy_ai_attrs(p.position, v_points);
      update public.fantasy_players set
        shooting = (a->>'shooting')::smallint, speed = (a->>'speed')::smallint, passing = (a->>'passing')::smallint,
        dribbling = (a->>'dribbling')::smallint, defending = (a->>'defending')::smallint,
        physical = (a->>'physical')::smallint, goalkeeping = (a->>'goalkeeping')::smallint
      where id = p.id;
    end if;
  end loop;
end;
$$;

-- Duas voltas pelo metodo do circulo, uma jornada por semana a partir da proxima segunda 21:00 de Lisboa.
create or replace function private.fantasy_schedule(p_league_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  ids uuid[]; n integer; r integer; i integer; a uuid; b uuid;
  v_today date := (now() at time zone 'Europe/Lisbon')::date;
  v_first date;
begin
  select array_agg(id order by slot) into ids from public.fantasy_teams where league_id = p_league_id;
  n := array_length(ids, 1);
  v_first := v_today + ((s.kickoff_dow - extract(dow from v_today)::integer + 7) % 7);
  if v_first = v_today then v_first := v_first + 7; end if;
  for r in 0 .. n - 2 loop
    for i in 0 .. n / 2 - 1 loop
      a := ids[1 + i]; b := ids[n - i];
      if r % 2 = 1 then select b, a into a, b; end if;
      insert into public.fantasy_fixtures (league_id, round, home_team_id, away_team_id, kickoff)
      values (p_league_id, r + 1, a, b, ((v_first + 7 * r) + s.kickoff_time) at time zone 'Europe/Lisbon'),
             (p_league_id, r + n, b, a, ((v_first + 7 * (r + n - 1)) + s.kickoff_time) at time zone 'Europe/Lisbon');
    end loop;
    ids := array[ids[1], ids[n]] || ids[2:n - 1];
  end loop;
end;
$$;

create or replace function private.fantasy_create_test_league()
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  v_id uuid; i integer;
  -- Clubes reais das distritais da AF Porto 2026/27, sorteados pelo Jon a 2026-11-11 (3 Liga Pro, 3 Elite,
  -- 2 Honra). So o nome; sem emblemas. Os jogadores de IA sao ficticios.
  names text[] := array['Gondomar S.C.', 'Gandra S.C.', 'U.D. Lavrense', 'Vilarinho',
    'U.D. Beiriz', 'Balio', 'Folgosa Maia F.C.', 'Atl. C. Alfenense'];
begin
  select id into v_id from public.fantasy_leagues where is_test and status = 'running';
  if v_id is not null then return v_id; end if;
  insert into public.fantasy_leagues (name, season, is_test) values ('Liga de teste', 1, true) returning id into v_id;
  for i in 1 .. s.team_count loop
    insert into public.fantasy_teams (league_id, slot, name) values (v_id, i, coalesce(names[i], 'Equipa ' || i));
  end loop;
  perform private.fantasy_ensure_squads(v_id);
  perform private.fantasy_schedule(v_id);
  return v_id;
end;
$$;

-- Fim de epoca: fecha a liga e abre a seguinte com as mesmas equipas e jogadores.
create or replace function private.fantasy_next_season(p_league_id uuid)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  old public.fantasy_leagues%rowtype; v_id uuid; t record; v_team uuid;
begin
  select * into old from public.fantasy_leagues where id = p_league_id for update;
  if old.status <> 'running' then return null; end if;
  update public.fantasy_leagues set status = 'finished', finished_at = now() where id = p_league_id;
  insert into public.fantasy_leagues (name, season, is_test) values (old.name, old.season + 1, old.is_test) returning id into v_id;
  for t in select * from public.fantasy_teams where league_id = p_league_id order by slot loop
    insert into public.fantasy_teams (league_id, slot, name) values (v_id, t.slot, t.name) returning id into v_team;
    insert into public.fantasy_players (league_id, team_id, user_id, ai_name, position, ai_factor,
      shooting, speed, passing, dribbling, defending, physical, goalkeeping, joined_at)
    select v_id, v_team, user_id, ai_name, position, ai_factor,
      shooting, speed, passing, dribbling, defending, physical, goalkeeping, joined_at
    from public.fantasy_players where team_id = t.id and left_at is null;
  end loop;
  perform private.fantasy_ensure_squads(v_id);
  perform private.fantasy_schedule(v_id);
  return v_id;
end;
$$;

-- Acima do joelho cada ponto vale metade.
create or replace function private.fantasy_eff(p_value numeric, p_knee integer)
returns numeric
language sql immutable set search_path = ''
as $$ select case when p_value <= p_knee then p_value else p_knee + (p_value - p_knee) / 2 end $$;

-- Plantel de uma equipa na hora da jornada: atributos efetivos (com forma) e o onze (1 GR + 4).
create or replace function private.fantasy_lineup(p_team_id uuid, p_kickoff timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  squad jsonb;
  gk jsonb;
  field jsonb;
begin
  with base as (
    select p.id, p.user_id, p.position,
      coalesce(fp.display_name, p.ai_name) as name,
      coalesce(fp.shooting, p.shooting, s.attr_base) as shooting, coalesce(fp.speed, p.speed, s.attr_base) as speed,
      coalesce(fp.passing, p.passing, s.attr_base) as passing, coalesce(fp.dribbling, p.dribbling, s.attr_base) as dribbling,
      coalesce(fp.defending, p.defending, s.attr_base) as defending, coalesce(fp.physical, p.physical, s.attr_base) as physical,
      coalesce(fp.goalkeeping, p.goalkeeping, s.attr_base) as goalkeeping,
      (p.user_id is not null and exists (
        select 1 from public.reward_ledger l
        where l.user_id = p.user_id and l.reason = 'presence' and l.status <> 'revoked'
          and l.game_day > (p_kickoff at time zone 'Europe/Lisbon')::date - s.form_days
          and l.game_day <= (p_kickoff at time zone 'Europe/Lisbon')::date)) as in_form
    from public.fantasy_players p
    left join public.fantasy_profiles fp on fp.user_id = p.user_id
    where p.team_id = p_team_id and p.left_at is null
  ),
  eff as (
    select id, user_id, position, name, in_form,
      private.fantasy_eff(least(99, shooting + case when in_form then s.form_bonus else 0 end), s.knee) as shooting,
      private.fantasy_eff(least(99, speed + case when in_form then s.form_bonus else 0 end), s.knee) as speed,
      private.fantasy_eff(least(99, passing + case when in_form then s.form_bonus else 0 end), s.knee) as passing,
      private.fantasy_eff(least(99, dribbling + case when in_form then s.form_bonus else 0 end), s.knee) as dribbling,
      private.fantasy_eff(least(99, defending + case when in_form then s.form_bonus else 0 end), s.knee) as defending,
      private.fantasy_eff(least(99, physical + case when in_form then s.form_bonus else 0 end), s.knee) as physical,
      private.fantasy_eff(least(99, goalkeeping + case when in_form then s.form_bonus else 0 end), s.knee) as goalkeeping
    from base
  ),
  ranked as (
    select e.*,
      (shooting + speed + passing + dribbling + defending + physical) / 6.0 as field_rating,
      row_number() over (order by (position = 'GR') desc, goalkeeping desc, (user_id is not null) desc, id) as gk_rank
    from eff e
  ),
  pick as (
    select r.*, row_number() over (order by field_rating desc, (user_id is not null) desc, id) as field_rank
    from ranked r where gk_rank > 1
  )
  select
    (select to_jsonb(r) - 'gk_rank' - 'field_rating' from ranked r where gk_rank = 1),
    (select coalesce(jsonb_agg(to_jsonb(p) - 'gk_rank' - 'field_rating' - 'field_rank' order by field_rank), '[]') from pick p where field_rank <= 4)
  into gk, field;
  return jsonb_build_object('gk', gk, 'field', field);
end;
$$;

-- Joga um jogo. Deterministico a partir da seed guardada.
create or replace function private.fantasy_play_fixture(p_fixture_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  f public.fantasy_fixtures%rowtype;
  lh jsonb; la jsonb;
  mid_h numeric; mid_a numeric; atk_h numeric; atk_a numeric; def_h numeric; def_a numeric;
  p_home numeric; i integer; side integer; atk numeric; dfs numeric; field jsonb; gk jsonb;
  w numeric; tot numeric; r numeric; acc numeric; shooter jsonb; j integer;
  goals integer[] := array[0, 0]; seq integer := 0; v_team uuid;
begin
  select * into f from public.fantasy_fixtures where id = p_fixture_id for update;
  if f.played_at is not null then return; end if;
  lh := private.fantasy_lineup(f.home_team_id, f.kickoff);
  la := private.fantasy_lineup(f.away_team_id, f.kickoff);
  if f.seed is null then f.seed := floor(random() * 2147483646)::integer + 1; end if;
  perform setseed((f.seed::double precision / 2147483647.0) * 2 - 1);

  select avg(((x->>'passing')::numeric + (x->>'dribbling')::numeric) / 2), avg(((x->>'speed')::numeric + (x->>'dribbling')::numeric) / 2),
         avg(((x->>'defending')::numeric + (x->>'physical')::numeric) / 2)
    into mid_h, atk_h, def_h from jsonb_array_elements(lh->'field') x;
  select avg(((x->>'passing')::numeric + (x->>'dribbling')::numeric) / 2), avg(((x->>'speed')::numeric + (x->>'dribbling')::numeric) / 2),
         avg(((x->>'defending')::numeric + (x->>'physical')::numeric) / 2)
    into mid_a, atk_a, def_a from jsonb_array_elements(la->'field') x;
  p_home := 1 / (1 + exp(-(mid_h - mid_a) / s.k_possession));

  for i in 1 .. s.moves loop
    if random() < p_home then
      side := 1; atk := atk_h; dfs := def_a; field := lh->'field'; gk := la->'gk'; v_team := f.home_team_id;
    else
      side := 2; atk := atk_a; dfs := def_h; field := la->'field'; gk := lh->'gk'; v_team := f.away_team_id;
    end if;
    if random() >= 1 / (1 + exp(-(s.base_chance + (atk - dfs) / s.k_chance))) then continue; end if;
    -- Rematador ao acaso, com peso no remate ao quadrado.
    select sum(((x->>'shooting')::numeric) ^ 2) into tot from jsonb_array_elements(field) x;
    r := random() * tot; acc := 0; shooter := field->0;
    for j in 0 .. jsonb_array_length(field) - 1 loop
      w := ((field->j->>'shooting')::numeric) ^ 2; acc := acc + w;
      if r < acc then shooter := field->j; exit; end if;
    end loop;
    seq := seq + 1;
    if random() < 1 / (1 + exp(-(s.base_goal + ((shooter->>'shooting')::numeric - (gk->>'goalkeeping')::numeric) / s.k_goal))) then
      goals[side] := goals[side] + 1;
      insert into public.fantasy_match_events (fixture_id, seq, team_id, player_id, player_name, kind)
      values (f.id, seq, v_team, (shooter->>'id')::uuid, shooter->>'name', 'goal');
    else
      insert into public.fantasy_match_events (fixture_id, seq, team_id, player_id, player_name, kind)
      values (f.id, seq, case when side = 1 then f.away_team_id else f.home_team_id end,
              (gk->>'id')::uuid, gk->>'name', 'save');
    end if;
  end loop;

  update public.fantasy_fixtures
  set home_goals = goals[1], away_goals = goals[2], seed = f.seed, played_at = now(),
      lineups = jsonb_build_object('home', lh, 'away', la, 'forma', s.form_bonus, 'itens', s.item_bonuses_enabled)
  where id = f.id;
end;
$$;

-- Corre de hora a hora: joga o que ja passou da hora e abre a epoca seguinte quando acaba.
create or replace function private.fantasy_play_due()
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare
  lg record; fx record; n integer := 0;
begin
  for lg in select id from public.fantasy_leagues where status = 'running' loop
    if exists (select 1 from public.fantasy_fixtures where league_id = lg.id and played_at is null and kickoff <= now()) then
      perform private.fantasy_ensure_squads(lg.id);
      perform private.fantasy_recalibrate_ai(lg.id);
      for fx in select id from public.fantasy_fixtures
                where league_id = lg.id and played_at is null and kickoff <= now() order by round, id loop
        perform private.fantasy_play_fixture(fx.id);
        n := n + 1;
      end loop;
    end if;
    if not exists (select 1 from public.fantasy_fixtures where league_id = lg.id and played_at is null) then
      perform private.fantasy_next_season(lg.id);
    end if;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Funcoes do cliente
-- ---------------------------------------------------------------------------

-- Pontos que a conta pode distribuir e nivel de conta.
create or replace function public.fantasy_my_points()
returns table (points integer, account_level integer)
language sql stable security definer set search_path = ''
as $$ select private.fantasy_points_for(auth.uid()), private.fantasy_account_level(auth.uid()) where auth.uid() is not null $$;

create or replace function public.fantasy_save_profile(
  p_display_name text, p_position text,
  p_shooting integer, p_speed integer, p_passing integer, p_dribbling integer,
  p_defending integer, p_physical integer, p_goalkeeping integer)
returns public.fantasy_profiles
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.fantasy_settings := private.fantasy_settings();
  v_uid uuid := auth.uid();
  v_attrs integer[] := array[p_shooting, p_speed, p_passing, p_dribbling, p_defending, p_physical, p_goalkeeping];
  v_spent integer := 0; x integer; v_row public.fantasy_profiles;
begin
  if v_uid is null then raise exception 'Precisas de entrar na conta.'; end if;
  if p_position is null or p_position not in ('GR', 'DEF', 'MED', 'ATA') then raise exception 'Posicao invalida.'; end if;
  if nullif(btrim(coalesce(p_display_name, '')), '') is null or char_length(btrim(p_display_name)) > 40 then
    raise exception 'Nome invalido.';
  end if;
  foreach x in array v_attrs loop
    if x is null or x < s.attr_base or x > s.attr_cap then
      raise exception 'Cada atributo fica entre % e %.', s.attr_base, s.attr_cap;
    end if;
    v_spent := v_spent + x - s.attr_base;
  end loop;
  if v_spent > private.fantasy_points_for(v_uid) then
    raise exception 'So tens % pontos para distribuir.', private.fantasy_points_for(v_uid);
  end if;
  insert into public.fantasy_profiles (user_id, display_name, position, shooting, speed, passing, dribbling, defending, physical, goalkeeping)
  values (v_uid, btrim(p_display_name), p_position, p_shooting, p_speed, p_passing, p_dribbling, p_defending, p_physical, p_goalkeeping)
  on conflict (user_id) do update set
    display_name = excluded.display_name, position = excluded.position,
    shooting = excluded.shooting, speed = excluded.speed, passing = excluded.passing, dribbling = excluded.dribbling,
    defending = excluded.defending, physical = excluded.physical, goalkeeping = excluded.goalkeeping, updated_at = now()
  returning * into v_row;
  -- A posicao na liga segue o perfil.
  update public.fantasy_players set position = p_position where user_id = v_uid and left_at is null;
  return v_row;
end;
$$;

-- Entra na liga de teste: equipa ao acaso, no lugar de um jogador de IA da mesma posicao (GR) ou de campo.
create or replace function public.fantasy_join_test_league()
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.fantasy_profiles%rowtype;
  v_league uuid; v_ai public.fantasy_players%rowtype; v_id uuid;
begin
  if v_uid is null then raise exception 'Precisas de entrar na conta.'; end if;
  if not exists (select 1 from auth.users where id = v_uid and email_confirmed_at is not null) then
    raise exception 'Confirma o email da conta antes de entrar na liga.';
  end if;
  select * into v_profile from public.fantasy_profiles where user_id = v_uid;
  if not found then raise exception 'Cria primeiro o teu jogador.'; end if;
  v_league := private.fantasy_create_test_league();
  select id into v_id from public.fantasy_players where league_id = v_league and user_id = v_uid and left_at is null;
  if v_id is not null then return v_id; end if;
  perform pg_advisory_xact_lock(hashtext('fantasy-join:' || v_league::text));
  select * into v_ai from public.fantasy_players
  where league_id = v_league and user_id is null and left_at is null
    and ((v_profile.position = 'GR') = (position = 'GR'))
  order by random() limit 1;
  if not found then
    select * into v_ai from public.fantasy_players
    where league_id = v_league and user_id is null and left_at is null
    order by random() limit 1;
  end if;
  if not found then raise exception 'A liga de teste esta cheia.'; end if;
  update public.fantasy_players set left_at = now() where id = v_ai.id;
  insert into public.fantasy_players (league_id, team_id, user_id, position)
  values (v_league, v_ai.team_id, v_uid, v_profile.position) returning id into v_id;
  return v_id;
end;
$$;

-- Sai da liga; a IA volta a preencher o lugar na proxima jornada.
create or replace function public.fantasy_leave_league()
returns void
language sql volatile security definer set search_path = ''
as $$ update public.fantasy_players set left_at = now() where user_id = auth.uid() and left_at is null $$;

revoke all on function private.fantasy_settings() from public, anon, authenticated;
revoke all on function private.fantasy_account_level(uuid) from public, anon, authenticated;
revoke all on function private.fantasy_points_for(uuid) from public, anon, authenticated;
revoke all on function private.fantasy_ai_attrs(text, integer) from public, anon, authenticated;
revoke all on function private.fantasy_ai_target(uuid) from public, anon, authenticated;
revoke all on function private.fantasy_ai_name() from public, anon, authenticated;
revoke all on function private.fantasy_add_ai(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.fantasy_ensure_squads(uuid) from public, anon, authenticated;
revoke all on function private.fantasy_recalibrate_ai(uuid) from public, anon, authenticated;
revoke all on function private.fantasy_schedule(uuid) from public, anon, authenticated;
revoke all on function private.fantasy_create_test_league() from public, anon, authenticated;
revoke all on function private.fantasy_next_season(uuid) from public, anon, authenticated;
revoke all on function private.fantasy_lineup(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.fantasy_play_fixture(uuid) from public, anon, authenticated;
revoke all on function private.fantasy_play_due() from public, anon, authenticated;
revoke all on function public.fantasy_my_points() from public, anon;
revoke all on function public.fantasy_save_profile(text, text, integer, integer, integer, integer, integer, integer, integer) from public, anon;
revoke all on function public.fantasy_join_test_league() from public, anon;
revoke all on function public.fantasy_leave_league() from public, anon;
grant execute on function public.fantasy_my_points() to authenticated;
grant execute on function public.fantasy_save_profile(text, text, integer, integer, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.fantasy_join_test_league() to authenticated;
grant execute on function public.fantasy_leave_league() to authenticated;

-- Liga de teste criada ja, com 8 equipas so de IA e o calendario a partir da proxima segunda.
select private.fantasy_create_test_league();

commit;

-- Jornadas: de hora a hora ao minuto 15 (as jornadas sao a segunda as 21:00 de Lisboa).
select cron.unschedule('footer-fantasy-play-due') where exists (select 1 from cron.job where jobname = 'footer-fantasy-play-due');
select cron.schedule('footer-fantasy-play-due', '15 * * * *', 'select private.fantasy_play_due()');
