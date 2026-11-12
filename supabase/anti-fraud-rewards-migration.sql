-- Anti-fraude das recompensas (2026-11-11). Regras aprovadas pelo Jon a 2026-11-11.
--
-- Objetivo: XP e itens so nascem de jogos que outras contas reais confirmam, registados perto da hora
-- do jogo, e e o servidor que os atribui. Os jogos continuam livres para estatisticas.
--
-- O que faz:
-- 1. games ganha rasto escrito so pelo servidor: created_at, created_by, finished_at, event_id,
--    verification ('pending' | 'verified' | 'archive' | 'flagged') e verification_details.
-- 2. reward_settings: os numeros das regras numa linha so (7 contas, 48 h, 7 jogos de estagio...).
-- 3. reward_ledger: registo de recompensas por conta. O cliente so le as suas; so o servidor escreve.
-- 4. private.evaluate_game: decide se o jogo e verificado e escreve/revoga as recompensas.
--    Corre quando o jogo muda, em cada fecho do jogo / voto MVP e de hora a hora (pg_cron).
-- 5. Edicoes a jogos verificados ficam em game_audit_log. Depois das 48 h, se quem edita jogou
--    nesse jogo, o jogo fica 'flagged' e as recompensas em espera ate outro admin aprovar.
--
-- Jogo verificado (valores em reward_settings):
-- - pelo menos 7 contas distintas nas equipas, 2 em cada equipa, 4 do proprio clube (nao convidados);
-- - resultado (status 'finished') registado entre a hora do jogo e 48 h depois;
-- - pelo menos 7 dessas contas (e metade delas) fizeram o fecho do jogo ou votaram MVP nas 48 h;
-- - nenhum outro jogo verificado do mesmo clube nas 2 h antes ou depois.
-- Falhou e ja passaram as 48 h: 'archive' (conta para estatisticas, sem recompensa).
--
-- Por conta: so com email confirmado; no maximo 1 jogo recompensado por dia e 4 por semana
-- (dias e semanas de Lisboa). Itens Raro+ so para contas com 14 dias. Clube em estagio (menos de
-- 7 contas do clube em jogos verificados ou menos de 5 jogos verificados): XP normal, itens
-- Epico/Lendario/Mitico ficam em espera ('held') ate o estagio acabar.
--
-- Decidido: video e relogio nao contam como prova; os jogos que ja existem ficam 'archive'
-- (todos comecam do 0).
--
-- Os valores de XP em reward_settings.xp sao provisorios (proposta dos patamares, por aprovar).
-- Ainda nao ha itens nem conquistas na base de dados; private.grant_reward ja trata raridades
-- para quando houver.
--
-- A app nao precisa de mudar: o upsert dos jogos nao envia estas colunas e o servidor ignora-as.
--
-- Idempotente: pode correr mais de uma vez.

begin;

-- ---------------------------------------------------------------------------
-- 1. Regras
-- ---------------------------------------------------------------------------

create table if not exists public.reward_settings (
  id boolean primary key default true check (id),
  min_accounts integer not null default 7 check (min_accounts > 0),
  min_accounts_per_team integer not null default 2 check (min_accounts_per_team >= 0),
  min_host_accounts integer not null default 4 check (min_host_accounts >= 0),
  min_confirmations integer not null default 7 check (min_confirmations > 0),
  window_hours integer not null default 48 check (window_hours > 0),
  overlap_hours integer not null default 2 check (overlap_hours >= 0),
  max_games_per_day integer not null default 1 check (max_games_per_day > 0),
  max_games_per_week integer not null default 4 check (max_games_per_week > 0),
  rare_min_account_days integer not null default 14 check (rare_min_account_days >= 0),
  trial_min_accounts integer not null default 7 check (trial_min_accounts >= 0),
  trial_min_games integer not null default 5 check (trial_min_games >= 0),
  xp jsonb not null default '{"presence": 100, "win": 60, "draw": 30, "loss": 15}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.reward_settings (id) values (true) on conflict (id) do nothing;

alter table public.reward_settings enable row level security;
revoke all on public.reward_settings from public, anon, authenticated;
grant select on public.reward_settings to authenticated;

drop policy if exists "reward settings read" on public.reward_settings;
create policy "reward settings read" on public.reward_settings for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. Rasto dos jogos
-- ---------------------------------------------------------------------------

-- Sem default no add column, para os jogos antigos ficarem com created_at vazio (origem desconhecida).
alter table public.games add column if not exists created_at timestamptz;
alter table public.games add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.games add column if not exists finished_at timestamptz;
alter table public.games add column if not exists event_id text references public.events(id) on delete set null;
alter table public.games add column if not exists verification text;
alter table public.games add column if not exists verification_details jsonb not null default '{}'::jsonb;

-- Jogos que ja existem: todos comecam do 0 (decisao do Jon, 2026-11-11).
update public.games
set verification = 'archive', verification_details = '{"reason": "legacy"}'::jsonb
where verification is null;

alter table public.games alter column verification set default 'pending';
alter table public.games alter column verification set not null;
alter table public.games drop constraint if exists games_verification_check;
alter table public.games add constraint games_verification_check
  check (verification in ('pending', 'verified', 'archive', 'flagged'));

create index if not exists games_verification_idx on public.games (verification, date);

-- ---------------------------------------------------------------------------
-- 3. Registo de recompensas e auditoria
-- ---------------------------------------------------------------------------

create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  game_id text references public.games(id) on delete set null,
  reason text not null check (reason ~ '^[a-z0-9_:-]{2,60}$'),
  xp integer not null default 0 check (xp >= 0),
  item_id text,
  rarity text check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
  status text not null check (status in ('granted', 'held', 'capped', 'revoked')),
  hold_reason text,
  game_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reward_ledger_one_per_game_reason
on public.reward_ledger (user_id, game_id, reason) where game_id is not null;
create index if not exists reward_ledger_user_day_idx on public.reward_ledger (user_id, game_day);
create index if not exists reward_ledger_group_idx on public.reward_ledger (group_id, status);
create index if not exists reward_ledger_held_idx on public.reward_ledger (status) where status = 'held';

alter table public.reward_ledger enable row level security;
revoke all on public.reward_ledger from public, anon, authenticated;
grant select on public.reward_ledger to authenticated;

drop policy if exists "reward ledger read own" on public.reward_ledger;
create policy "reward ledger read own" on public.reward_ledger for select to authenticated
using (user_id = (select auth.uid()) or private.is_platform_admin());

create table if not exists public.game_audit_log (
  id uuid primary key default gen_random_uuid(),
  game_id text references public.games(id) on delete set null,
  group_id uuid references public.groups(id) on delete cascade,
  action text not null check (action in ('edit', 'mvp_vote_deleted', 'approved')),
  changed_by uuid references auth.users(id) on delete set null,
  changes jsonb not null default '{}'::jsonb,
  needs_approval boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists game_audit_log_game_idx on public.game_audit_log (game_id, created_at desc);
create index if not exists game_audit_log_pending_idx on public.game_audit_log (group_id) where needs_approval and approved_at is null;

alter table public.game_audit_log enable row level security;
revoke all on public.game_audit_log from public, anon, authenticated;
grant select on public.game_audit_log to authenticated;

drop policy if exists "game audit read admin" on public.game_audit_log;
create policy "game audit read admin" on public.game_audit_log for select to authenticated
using (private.is_group_admin(group_id) or private.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 4. Funcoes de apoio
-- ---------------------------------------------------------------------------

create or replace function private.reward_settings()
returns public.reward_settings
language sql stable security definer set search_path = ''
as $$ select * from public.reward_settings where id $$;

-- Dia de Lisboa de um instante.
create or replace function private.lisbon_day(p_at timestamptz)
returns date
language sql stable set search_path = ''
as $$ select (p_at at time zone 'Europe/Lisbon')::date $$;

-- Contas nas equipas de um jogo: uma linha por conta, com a equipa e se e do proprio clube.
create or replace function private.game_roster(p_game_id text)
returns table (user_id uuid, player_id text, side text, is_host boolean)
language sql stable security definer set search_path = ''
as $$
  with g as (select * from public.games where id = p_game_id),
  slots as (
    select unnest(coalesce(g.team_a, '{}') || coalesce(g.bench_a, '{}')) as player_id, 'A'::text as side from g
    union all
    select unnest(coalesce(g.team_b, '{}') || coalesce(g.bench_b, '{}')), 'B' from g
  )
  select distinct on (p.linked_user_id) p.linked_user_id, p.id, s.side, not p.is_guest
  from slots s
  join public.players p on p.id = s.player_id
  where p.linked_user_id is not null
  order by p.linked_user_id, s.side
$$;

-- Clube em estagio: poucas contas do clube em jogos verificados, ou poucos jogos verificados.
create or replace function private.group_in_trial(p_group_id uuid)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.reward_settings := private.reward_settings();
  v_games integer;
  v_accounts integer;
begin
  if p_group_id is null then
    return true;
  end if;
  select count(*) into v_games from public.games where group_id = p_group_id and verification = 'verified';
  if v_games < s.trial_min_games then
    return true;
  end if;
  select count(distinct l.user_id) into v_accounts
  from public.reward_ledger l
  join public.games g on g.id = l.game_id and g.verification = 'verified'
  join public.players p on p.group_id = p_group_id and p.linked_user_id = l.user_id and not p.is_guest
  where l.group_id = p_group_id and l.status in ('granted', 'held', 'capped');
  return v_accounts < s.trial_min_accounts;
end;
$$;

-- Estado de uma recompensa para uma conta (sem limites por dia/semana, que dependem do jogo).
create or replace function private.reward_status(p_user_id uuid, p_group_id uuid, p_rarity text, out status text, out hold_reason text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.reward_settings := private.reward_settings();
  v_user auth.users%rowtype;
begin
  select * into v_user from auth.users where id = p_user_id;
  if not found then
    status := 'revoked'; hold_reason := 'account_deleted'; return;
  end if;
  if v_user.email_confirmed_at is null then
    status := 'held'; hold_reason := 'email_unconfirmed'; return;
  end if;
  if p_rarity in ('rare', 'epic', 'legendary', 'mythic')
     and v_user.created_at > now() - make_interval(days => s.rare_min_account_days) then
    status := 'held'; hold_reason := 'account_too_new'; return;
  end if;
  if p_rarity in ('epic', 'legendary', 'mythic') and private.group_in_trial(p_group_id) then
    status := 'held'; hold_reason := 'club_trial'; return;
  end if;
  status := 'granted'; hold_reason := null;
end;
$$;

-- Escreve (ou atualiza) uma recompensa de jogo. Respeita 1 jogo por dia e 4 por semana por conta.
-- Tambem e o ponto de entrada para futuras recompensas de itens (p_item_id + p_rarity).
create or replace function private.grant_reward(
  p_user_id uuid, p_game_id text, p_reason text, p_xp integer,
  p_item_id text default null, p_rarity text default null)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  s public.reward_settings := private.reward_settings();
  g public.games%rowtype;
  v_day date;
  v_status text;
  v_hold text;
  v_other_day integer;
  v_other_week integer;
begin
  select * into g from public.games where id = p_game_id;
  if not found or g.verification <> 'verified' then
    raise exception 'game_not_verified' using errcode = 'P0001';
  end if;
  v_day := private.lisbon_day(g.date);

  -- Outros jogos ja recompensados a esta conta no mesmo dia / semana (o primeiro a ser verificado ganha).
  select count(distinct game_id) filter (where game_day = v_day),
         count(distinct game_id) filter (where date_trunc('week', game_day) = date_trunc('week', v_day))
  into v_other_day, v_other_week
  from public.reward_ledger
  where user_id = p_user_id and game_id is not null and game_id <> p_game_id
    and status in ('granted', 'held');

  if v_other_day >= s.max_games_per_day then
    v_status := 'capped'; v_hold := 'daily_cap';
  elsif v_other_week >= s.max_games_per_week then
    v_status := 'capped'; v_hold := 'weekly_cap';
  else
    select r.status, r.hold_reason into v_status, v_hold from private.reward_status(p_user_id, g.group_id, p_rarity) r;
  end if;

  insert into public.reward_ledger (user_id, group_id, game_id, reason, xp, item_id, rarity, status, hold_reason, game_day)
  values (p_user_id, g.group_id, p_game_id, p_reason, greatest(coalesce(p_xp, 0), 0), p_item_id, p_rarity, v_status, v_hold, v_day)
  on conflict (user_id, game_id, reason) where game_id is not null do update
    set xp = excluded.xp, item_id = excluded.item_id, rarity = excluded.rarity, group_id = excluded.group_id,
        status = excluded.status, hold_reason = excluded.hold_reason, game_day = excluded.game_day, updated_at = now()
    where (public.reward_ledger.xp, public.reward_ledger.status, public.reward_ledger.hold_reason, public.reward_ledger.game_day)
          is distinct from (excluded.xp, excluded.status, excluded.hold_reason, excluded.game_day);
  return v_status;
end;
$$;

-- Liberta recompensas em espera quando a condicao passou (email confirmado, conta com idade, estagio acabou).
create or replace function private.refresh_held_rewards(p_group_id uuid default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_status text;
  v_hold text;
  v_count integer := 0;
begin
  for r in
    select l.id, l.user_id, l.group_id, l.rarity
    from public.reward_ledger l
    join public.games g on g.id = l.game_id
    where l.status = 'held' and l.hold_reason in ('email_unconfirmed', 'account_too_new', 'club_trial')
      and g.verification = 'verified'
      and (p_group_id is null or l.group_id = p_group_id)
  loop
    select s.status, s.hold_reason into v_status, v_hold from private.reward_status(r.user_id, r.group_id, r.rarity) s;
    if v_status = 'granted' then
      update public.reward_ledger set status = 'granted', hold_reason = null, updated_at = now() where id = r.id;
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Muda o estado de verificacao (so por aqui: o gatilho de guarda deixa passar com esta marca).
create or replace function private.set_game_verification(p_game_id text, p_state text, p_details jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_prev text := current_setting('footer.reward_eval', true);
begin
  perform set_config('footer.reward_eval', 'on', true);
  update public.games
  set verification = p_state, verification_details = coalesce(p_details, '{}'::jsonb)
  where id = p_game_id
    and (verification, verification_details) is distinct from (p_state, coalesce(p_details, '{}'::jsonb));
  perform set_config('footer.reward_eval', coalesce(v_prev, ''), true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Avaliacao de um jogo
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

  perform private.refresh_held_rewards(g.group_id);
  return 'verified';
end;
$$;

-- De hora a hora: fecha os jogos cujo prazo passou e liberta recompensas em espera.
create or replace function private.evaluate_pending_games()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id from public.games
    where verification = 'pending' and status = 'finished' and created_at is not null
    order by date
  loop
    perform private.evaluate_game(r.id);
    v_count := v_count + 1;
  end loop;
  perform private.refresh_held_rewards(null);
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Gatilhos
-- ---------------------------------------------------------------------------

-- Guarda: o cliente nao escreve o rasto nem a verificacao.
create or replace function private.games_reward_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  s public.reward_settings := private.reward_settings();
  v_evaluating boolean := coalesce(current_setting('footer.reward_eval', true), '') = 'on';
  v_uid uuid := (select auth.uid());
  v_changed boolean;
  v_editor_played boolean;
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := v_uid;
    new.verification := 'pending';
    new.verification_details := '{}'::jsonb;
    new.finished_at := case when new.status = 'finished' then now() end;
    return new;
  end if;

  new.created_at := old.created_at;
  new.created_by := old.created_by;
  if not v_evaluating then
    new.verification := old.verification;
    new.verification_details := old.verification_details;
  end if;

  if new.status = 'finished' and old.status is distinct from 'finished' then
    new.finished_at := now();
  elsif new.status <> 'finished' then
    new.finished_at := null;
  else
    new.finished_at := old.finished_at;
  end if;

  v_changed := (old.date, old.status, old.team_a, old.team_b, old.bench_a, old.bench_b, old.score_a, old.score_b)
    is distinct from (new.date, new.status, new.team_a, new.team_b, new.bench_a, new.bench_b, new.score_a, new.score_b);

  if v_changed and not v_evaluating and old.verification = 'verified' then
    -- Quem edita jogou neste jogo (antes ou depois da edicao)?
    select exists (
      select 1 from public.players p
      where p.linked_user_id = v_uid
        and p.id = any(coalesce(old.team_a, '{}') || coalesce(old.team_b, '{}') || coalesce(old.bench_a, '{}') || coalesce(old.bench_b, '{}')
                       || coalesce(new.team_a, '{}') || coalesce(new.team_b, '{}') || coalesce(new.bench_a, '{}') || coalesce(new.bench_b, '{}'))
    ) into v_editor_played;

    insert into public.game_audit_log (game_id, group_id, action, changed_by, changes, needs_approval)
    values (old.id, old.group_id, 'edit', v_uid,
      jsonb_build_object(
        'old', jsonb_build_object('date', old.date, 'status', old.status, 'team_a', old.team_a, 'team_b', old.team_b,
                                  'bench_a', old.bench_a, 'bench_b', old.bench_b, 'score_a', old.score_a, 'score_b', old.score_b),
        'new', jsonb_build_object('date', new.date, 'status', new.status, 'team_a', new.team_a, 'team_b', new.team_b,
                                  'bench_a', new.bench_a, 'bench_b', new.bench_b, 'score_a', new.score_a, 'score_b', new.score_b)),
      v_editor_played and now() > old.date + make_interval(hours => s.window_hours));

    if v_editor_played and now() > old.date + make_interval(hours => s.window_hours) then
      new.verification := 'flagged';
      new.verification_details := old.verification_details || jsonb_build_object('flagged_by', v_uid, 'flagged_at', now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists games_reward_guard on public.games;
create trigger games_reward_guard
before insert or update on public.games
for each row execute function private.games_reward_guard();

create or replace function private.games_reward_after()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.evaluate_game(new.id);
  return null;
end;
$$;

-- So quando muda algo que conta (a app reenvia todos os jogos em cada gravacao).
-- A propria avaliacao so muda verification/verification_details, por isso nao se volta a chamar.
drop trigger if exists games_reward_after_insert on public.games;
create trigger games_reward_after_insert
after insert on public.games
for each row execute function private.games_reward_after();

drop trigger if exists games_reward_after_update on public.games;
create trigger games_reward_after_update
after update on public.games
for each row
when ((old.date, old.status, old.team_a, old.team_b, old.bench_a, old.bench_b, old.score_a, old.score_b)
      is distinct from (new.date, new.status, new.team_a, new.team_b, new.bench_a, new.bench_b, new.score_a, new.score_b))
execute function private.games_reward_after();

-- Apagar um jogo revoga as recompensas dele (a linha fica no registo).
create or replace function private.games_reward_before_delete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.reward_ledger set status = 'revoked', hold_reason = 'game_deleted', updated_at = now()
  where game_id = old.id and status <> 'revoked';
  return old;
end;
$$;

drop trigger if exists games_reward_before_delete on public.games;
create trigger games_reward_before_delete
before delete on public.games
for each row execute function private.games_reward_before_delete();

-- Fecho do jogo e voto MVP contam como confirmacao: reavaliar o jogo.
create or replace function private.confirmation_reward_after()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if tg_table_name = 'game_mvp_votes' and exists (select 1 from public.games where id = old.game_id) then
      insert into public.game_audit_log (game_id, group_id, action, changed_by, changes)
      values (old.game_id, private.game_group(old.game_id), 'mvp_vote_deleted', (select auth.uid()),
              jsonb_build_object('voter_player_id', old.voter_player_id));
    end if;
    perform private.evaluate_game(old.game_id);
  else
    perform private.evaluate_game(new.game_id);
  end if;
  return null;
end;
$$;

drop trigger if exists game_feedback_reward_after on public.game_feedback;
create trigger game_feedback_reward_after
after insert or delete on public.game_feedback
for each row execute function private.confirmation_reward_after();

drop trigger if exists game_mvp_votes_reward_after on public.game_mvp_votes;
create trigger game_mvp_votes_reward_after
after insert or delete on public.game_mvp_votes
for each row execute function private.confirmation_reward_after();

-- A hora do voto e sempre a do servidor (conta para o prazo das 48 h).
create or replace function private.mvp_votes_server_time()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists game_mvp_votes_server_time on public.game_mvp_votes;
create trigger game_mvp_votes_server_time
before insert on public.game_mvp_votes
for each row execute function private.mvp_votes_server_time();

-- ---------------------------------------------------------------------------
-- 7. Aprovar uma edicao sinalizada (outro admin do clube, ou o dono da app)
-- ---------------------------------------------------------------------------

create or replace function public.approve_game_change(p_game_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  g public.games%rowtype;
  v_flagged_by uuid;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select * into g from public.games where id = p_game_id for update;
  if not found then
    raise exception 'game_not_found' using errcode = 'P0001';
  end if;
  if not (private.is_group_admin(g.group_id) or private.is_platform_admin()) then
    raise exception 'group_admin_required' using errcode = '42501';
  end if;
  if g.verification <> 'flagged' then
    raise exception 'game_not_flagged' using errcode = 'P0001';
  end if;
  v_flagged_by := nullif(g.verification_details ->> 'flagged_by', '')::uuid;
  if v_flagged_by = v_uid then
    raise exception 'cannot_approve_own_change' using errcode = 'P0001';
  end if;
  if not private.is_platform_admin() and exists (select 1 from private.game_roster(g.id) where user_id = v_uid) then
    raise exception 'approver_played_in_game' using errcode = 'P0001';
  end if;

  update public.game_audit_log set approved_by = v_uid, approved_at = now()
  where game_id = g.id and needs_approval and approved_at is null;
  insert into public.game_audit_log (game_id, group_id, action, changed_by)
  values (g.id, g.group_id, 'approved', v_uid);

  -- Volta a avaliar como se fosse novo: 'pending' e depois as regras normais.
  perform private.set_game_verification(g.id, 'pending', g.verification_details - 'flagged_by' - 'flagged_at');
  return private.evaluate_game(g.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Permissoes e tarefa de hora a hora
-- ---------------------------------------------------------------------------

revoke all on function private.reward_settings() from public, anon, authenticated;
revoke all on function private.lisbon_day(timestamptz) from public, anon, authenticated;
revoke all on function private.game_roster(text) from public, anon, authenticated;
revoke all on function private.group_in_trial(uuid) from public, anon, authenticated;
revoke all on function private.reward_status(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.grant_reward(uuid, text, text, integer, text, text) from public, anon, authenticated;
revoke all on function private.refresh_held_rewards(uuid) from public, anon, authenticated;
revoke all on function private.set_game_verification(text, text, jsonb) from public, anon, authenticated;
revoke all on function private.evaluate_game(text) from public, anon, authenticated;
revoke all on function private.evaluate_pending_games() from public, anon, authenticated;
revoke all on function private.games_reward_guard() from public, anon, authenticated;
revoke all on function private.games_reward_after() from public, anon, authenticated;
revoke all on function private.games_reward_before_delete() from public, anon, authenticated;
revoke all on function private.confirmation_reward_after() from public, anon, authenticated;
revoke all on function private.mvp_votes_server_time() from public, anon, authenticated;

revoke all on function public.approve_game_change(text) from public, anon;
grant execute on function public.approve_game_change(text) to authenticated;

commit;

-- Fora da transacao: se o pg_cron der erro aqui, ativa-o em Database > Extensions e corre so esta linha.
select cron.schedule('footer-evaluate-pending-games', '7 * * * *', 'select private.evaluate_pending_games()');
