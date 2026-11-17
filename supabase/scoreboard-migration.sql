-- Placard fisico (2026-11-17): o Raspberry Pi do placard envia os eventos dos botoes para o Footer.
-- Plano: https://claude.ai/artifact/JSbXVBzgS3nU7UjqVcffvt (respostas do Jon a 2026-11-17).
--
-- Como funciona:
-- 1. O admin do clube cria uma chave para o placard (placard_create_device). A chave so aparece uma vez;
--    guarda-se apenas o hash. O Pi nunca leva password nem a chave mestra do Supabase.
-- 2. O Pi grava cada botao localmente e envia lotes para public.placard_ingest(chave, eventos) pelo
--    endpoint /rest/v1/rpc/placard_ingest com a anon key. Cada evento traz um id unico gerado no Pi,
--    por isso reenviar nao duplica nada.
-- 3. Cada INICIO abre uma sessao. O Footer sugere o jogo aberto do clube mais perto dessa hora
--    (suggested_game_id); o admin aceita ou escolhe outro (placard_confirm_session).
-- 4. Com o jogo confirmado, os eventos aplicam-se: GOLO cria a linha em game_goals com game_s = relogio
--    do placard e sem marcador; ANULAR tira esse golo; FIM grava o resultado (o admin corrige se preciso).
--    DESTAQUE, TROCA, PAUSA e temperaturas ficam no registo para a app e o Footer Tracker.
-- game_s = segundos do relogio do placard desde o INICIO; game_videos.video_start_s = segundo do video
-- em que se ve/ouve o INICIO.
-- Depende de: groups-migration.sql, game-goals-migration.sql, pgcrypto. Idempotente.

begin;

create extension if not exists pgcrypto with schema extensions;

-- 1. Placards (um por clube, para ja so os Futeboleiros)
create table if not exists public.scoreboard_devices (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  key_hash text not null unique,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

alter table public.scoreboard_devices enable row level security;
revoke all on public.scoreboard_devices from public, anon, authenticated;
grant select (id, group_id, name, active, created_at, last_seen_at) on public.scoreboard_devices to authenticated;

drop policy if exists "scoreboard devices admin read" on public.scoreboard_devices;
create policy "scoreboard devices admin read" on public.scoreboard_devices
  for select to authenticated
  using (private.is_group_admin(group_id));

-- 2. Sessoes (um INICIO -> FIM do placard)
create table if not exists public.scoreboard_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.scoreboard_devices(id) on delete cascade,
  session_key text not null check (char_length(session_key) between 1 and 64),
  group_id uuid not null references public.groups(id) on delete cascade,
  started_at timestamptz,
  status text not null default 'live' check (status in ('live', 'finished')),
  score_a integer not null default 0 check (score_a between 0 and 99),
  score_b integer not null default 0 check (score_b between 0 and 99),
  clock_s numeric not null default 0 check (clock_s >= 0),
  suggested_game_id text references public.games(id) on delete set null,
  game_id text references public.games(id) on delete set null,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, session_key)
);

create index if not exists scoreboard_sessions_group_idx on public.scoreboard_sessions (group_id, created_at desc);
create index if not exists scoreboard_sessions_game_idx on public.scoreboard_sessions (game_id);

alter table public.scoreboard_sessions enable row level security;
revoke all on public.scoreboard_sessions from public, anon, authenticated;
grant select on public.scoreboard_sessions to authenticated;

drop policy if exists "scoreboard sessions read" on public.scoreboard_sessions;
create policy "scoreboard sessions read" on public.scoreboard_sessions
  for select to authenticated
  using (private.is_group_member(group_id));

-- 3. Eventos (registo bruto; nunca se apaga)
create table if not exists public.game_scoreboard_events (
  id uuid primary key,
  session_id uuid not null references public.scoreboard_sessions(id) on delete cascade,
  device_id uuid not null references public.scoreboard_devices(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  seq integer not null check (seq >= 0),
  type text not null check (type in ('inicio', 'golo', 'anular', 'destaque', 'troca_lado', 'pausa', 'retoma', 'fim', 'temperatura')),
  side text check (side in ('A', 'B')),
  clock_s numeric not null check (clock_s >= 0),
  at timestamptz not null,
  score_a integer check (score_a between 0 and 99),
  score_b integer check (score_b between 0 and 99),
  data jsonb not null default '{}'::jsonb check (octet_length(data::text) <= 2000),
  received_at timestamptz not null default now(),
  -- Onde o evento foi aplicado (golo: a linha de game_goals; anular: o golo que tirou).
  applied_game_id text references public.games(id) on delete set null,
  applied_position integer,
  cancels_event_id uuid,
  applied_at timestamptz,
  apply_note text,
  check (type not in ('golo', 'anular') or side is not null),
  unique (session_id, seq)
);

create index if not exists game_scoreboard_events_session_idx on public.game_scoreboard_events (session_id, seq);
create index if not exists game_scoreboard_events_game_idx on public.game_scoreboard_events (applied_game_id);

alter table public.game_scoreboard_events enable row level security;
revoke all on public.game_scoreboard_events from public, anon, authenticated;
grant select on public.game_scoreboard_events to authenticated;

drop policy if exists "scoreboard events read" on public.game_scoreboard_events;
create policy "scoreboard events read" on public.game_scoreboard_events
  for select to authenticated
  using (private.is_group_member(group_id));

-- 4. Sugestao do jogo: jogo aberto do clube mais perto da hora do INICIO (ate 3 h), senao o mais perto
--    do mesmo dia em qualquer estado.
create or replace function private.placard_suggest_game(p_group_id uuid, p_at timestamptz)
returns text
language sql stable security definer set search_path = ''
as $$
  select id from public.games
  where group_id = p_group_id
    and p_at is not null
    and abs(extract(epoch from (date - p_at))) <= 3 * 3600
  order by (status = 'open') desc, abs(extract(epoch from (date - p_at)))
  limit 1
$$;

revoke all on function private.placard_suggest_game(uuid, timestamptz) from public, anon, authenticated;

-- 5. Aplicar os eventos de uma sessao ao jogo confirmado (por ordem; so os ainda por aplicar).
create or replace function private.placard_apply_session(p_session_id uuid)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  s public.scoreboard_sessions;
  e public.game_scoreboard_events;
  v_pos integer;
  v_target public.game_scoreboard_events;
  v_count integer := 0;
begin
  select * into s from public.scoreboard_sessions where id = p_session_id for update;
  if not found or s.game_id is null then
    return 0;
  end if;

  for e in
    select * from public.game_scoreboard_events
    where session_id = p_session_id and applied_at is null
    order by seq
  loop
    if e.type = 'golo' then
      select coalesce(max(position), 0) + 1 into v_pos
      from public.game_goals where game_id = s.game_id and side = e.side;
      if v_pos > 99 then
        update public.game_scoreboard_events set applied_at = now(), apply_note = 'demasiados golos' where id = e.id;
      else
        insert into public.game_goals (game_id, side, position, game_s, updated_by)
        values (s.game_id, e.side, v_pos, e.clock_s, null);
        update public.game_scoreboard_events
        set applied_game_id = s.game_id, applied_position = v_pos, applied_at = now()
        where id = e.id;
      end if;

    elsif e.type = 'anular' then
      -- O ultimo golo do placard nesta sessao, desse lado, ainda nao anulado.
      select g.* into v_target
      from public.game_scoreboard_events g
      where g.session_id = p_session_id and g.type = 'golo' and g.side = e.side
        and g.seq < e.seq and g.applied_game_id = s.game_id and g.applied_position is not null
        and not exists (
          select 1 from public.game_scoreboard_events a
          where a.session_id = p_session_id and a.type = 'anular' and a.cancels_event_id = g.id
        )
      order by g.seq desc
      limit 1;

      if v_target.id is null then
        update public.game_scoreboard_events set applied_at = now(), apply_note = 'sem golo para anular' where id = e.id;
      elsif exists (
        select 1 from public.game_goals
        where game_id = s.game_id and side = e.side and position > v_target.applied_position
      ) then
        -- Ha golos depois deste (registados a mao): nao se mexe na ordem; o admin resolve.
        update public.game_scoreboard_events
        set applied_at = now(), apply_note = 'golo nao e o ultimo; corrigir a mao'
        where id = e.id;
      else
        delete from public.game_goals
        where game_id = s.game_id and side = e.side and position = v_target.applied_position;
        update public.game_scoreboard_events
        set applied_game_id = s.game_id, applied_position = v_target.applied_position,
            cancels_event_id = v_target.id, applied_at = now()
        where id = e.id;
      end if;
      v_target := null;

    elsif e.type = 'fim' then
      -- Como na app: resultado gravado = jogo terminado.
      perform set_config('footer.placard_write', 'on', true);
      update public.games
      set score_a = coalesce(e.score_a, s.score_a),
          score_b = coalesce(e.score_b, s.score_b),
          score_saved_at = e.at,
          status = 'finished',
          updated_at = now()
      where id = s.game_id;
      perform set_config('footer.placard_write', 'off', true);
      update public.game_scoreboard_events set applied_game_id = s.game_id, applied_at = now() where id = e.id;

    else
      update public.game_scoreboard_events set applied_game_id = s.game_id, applied_at = now() where id = e.id;
    end if;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.placard_apply_session(uuid) from public, anon, authenticated;

-- 6. Desfazer o que uma sessao aplicou num jogo (quando o admin muda o jogo).
create or replace function private.placard_unapply_session(p_session_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  -- Golos do placard ainda presentes (os anulados ja sairam), mesmo que alguem ja tenha escolhido o marcador.
  delete from public.game_goals g
  using public.game_scoreboard_events e
  where e.session_id = p_session_id and e.type = 'golo'
    and g.game_id = e.applied_game_id and g.side = e.side and g.position = e.applied_position
    and not exists (
      select 1 from public.game_scoreboard_events a
      where a.session_id = p_session_id and a.type = 'anular' and a.cancels_event_id = e.id
    );

  update public.game_scoreboard_events
  set applied_game_id = null, applied_position = null, cancels_event_id = null, applied_at = null, apply_note = null
  where session_id = p_session_id;
end;
$$;

revoke all on function private.placard_unapply_session(uuid) from public, anon, authenticated;

-- 7. Entrada dos eventos (chamada pelo Pi com a anon key)
-- p_events: [{"id":uuid,"sessao":text,"seq":int,"tipo":text,"lado":"A"|"B"|null,"relogio_s":num,
--             "hora":timestamptz,"resultado":[a,b],"dados":{...}}], no maximo 500 por chamada.
create or replace function public.placard_ingest(p_key text, p_events jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  d public.scoreboard_devices;
  ev jsonb;
  v_session public.scoreboard_sessions;
  v_type text;
  v_side text;
  v_at timestamptz;
  v_seq integer;
  v_clock numeric;
  v_sa integer;
  v_sb integer;
  v_id uuid;
  v_new integer;
  v_accepted integer := 0;
  v_duplicates integer := 0;
  v_rejected jsonb := '[]'::jsonb;
  v_sessions uuid[] := '{}';
  v_sid uuid;
begin
  if p_key is null or char_length(p_key) < 32 then
    raise exception 'placard: chave invalida' using errcode = '28000';
  end if;

  select * into d from public.scoreboard_devices
  where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex') and active;
  if not found then
    raise exception 'placard: chave invalida' using errcode = '28000';
  end if;

  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 500 then
    raise exception 'placard: eventos tem de ser uma lista com ate 500' using errcode = '22023';
  end if;

  update public.scoreboard_devices set last_seen_at = now() where id = d.id;

  for ev in select value from jsonb_array_elements(p_events) loop
    begin
      v_id := (ev->>'id')::uuid;
      v_type := ev->>'tipo';
      v_side := nullif(ev->>'lado', '');
      v_seq := (ev->>'seq')::integer;
      v_clock := coalesce((ev->>'relogio_s')::numeric, 0);
      v_at := (ev->>'hora')::timestamptz;
      v_sa := (ev->'resultado'->>0)::integer;
      v_sb := (ev->'resultado'->>1)::integer;

      if v_id is null or v_seq is null or v_at is null or coalesce(ev->>'sessao', '') = '' then
        raise exception 'faltam campos';
      end if;

      if exists (select 1 from public.game_scoreboard_events where id = v_id) then
        v_duplicates := v_duplicates + 1;
        continue;
      end if;

      insert into public.scoreboard_sessions (device_id, session_key, group_id)
      values (d.id, ev->>'sessao', d.group_id)
      on conflict (device_id, session_key) do nothing;

      select * into v_session from public.scoreboard_sessions
      where device_id = d.id and session_key = ev->>'sessao';

      insert into public.game_scoreboard_events (id, session_id, device_id, group_id, seq, type, side, clock_s, at, score_a, score_b, data)
      values (v_id, v_session.id, d.id, d.group_id, v_seq, v_type, v_side, v_clock, v_at, v_sa, v_sb,
              case when jsonb_typeof(ev->'dados') = 'object' then ev->'dados' else '{}'::jsonb end)
      on conflict do nothing;
      get diagnostics v_new = row_count;

      if v_new = 0 then
        v_duplicates := v_duplicates + 1;
        continue;
      end if;
      v_accepted := v_accepted + 1;

      -- Estado da sessao: o placard e quem sabe o resultado e o relogio.
      update public.scoreboard_sessions
      set started_at = case when v_type = 'inicio' then v_at else coalesce(started_at, v_at) end,
          status = case when v_type = 'fim' then 'finished' else status end,
          score_a = case when v_sa is not null and v_seq >= (select coalesce(max(seq), 0) from public.game_scoreboard_events where session_id = v_session.id) then v_sa else score_a end,
          score_b = case when v_sb is not null and v_seq >= (select coalesce(max(seq), 0) from public.game_scoreboard_events where session_id = v_session.id) then v_sb else score_b end,
          clock_s = greatest(clock_s, v_clock),
          updated_at = now()
      where id = v_session.id;

      if not (v_session.id = any(v_sessions)) then
        v_sessions := v_sessions || v_session.id;
      end if;
    exception when others then
      v_rejected := v_rejected || jsonb_build_object('id', ev->>'id', 'erro', sqlerrm);
    end;
  end loop;

  -- Sugere o jogo e aplica o que ja tem jogo confirmado.
  foreach v_sid in array v_sessions loop
    update public.scoreboard_sessions s
    set suggested_game_id = private.placard_suggest_game(s.group_id, s.started_at)
    where s.id = v_sid and s.suggested_game_id is null and s.game_id is null;
    perform private.placard_apply_session(v_sid);
  end loop;

  return jsonb_build_object('aceites', v_accepted, 'repetidos', v_duplicates, 'rejeitados', v_rejected);
end;
$$;

revoke all on function public.placard_ingest(text, jsonb) from public;
grant execute on function public.placard_ingest(text, jsonb) to anon, authenticated;

-- 8. Admin: criar e desligar placards, confirmar o jogo de uma sessao
create or replace function public.placard_create_device(p_group_id uuid, p_name text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_key text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not private.is_group_admin(p_group_id) then
    raise exception 'so o admin do clube cria placards' using errcode = '42501';
  end if;
  insert into public.scoreboard_devices (group_id, name, key_hash)
  values (p_group_id, btrim(p_name), encode(extensions.digest(v_key, 'sha256'), 'hex'));
  return v_key; -- mostrada uma so vez; copiar para o Pi
end;
$$;

revoke all on function public.placard_create_device(uuid, text) from public, anon;
grant execute on function public.placard_create_device(uuid, text) to authenticated;

create or replace function public.placard_set_device_active(p_device_id uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_group uuid;
begin
  select group_id into v_group from public.scoreboard_devices where id = p_device_id;
  if v_group is null or not private.is_group_admin(v_group) then
    raise exception 'so o admin do clube muda o placard' using errcode = '42501';
  end if;
  update public.scoreboard_devices set active = p_active where id = p_device_id;
end;
$$;

revoke all on function public.placard_set_device_active(uuid, boolean) from public, anon;
grant execute on function public.placard_set_device_active(uuid, boolean) to authenticated;

-- Aceitar a sugestao (p_game_id = suggested_game_id) ou escolher outro jogo do clube.
-- Mudar de jogo tira do jogo anterior os golos que o placard tinha posto e aplica tudo no novo.
create or replace function public.placard_confirm_session(p_session_id uuid, p_game_id text)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  s public.scoreboard_sessions;
begin
  select * into s from public.scoreboard_sessions where id = p_session_id for update;
  if not found or not private.is_group_admin(s.group_id) then
    raise exception 'so o admin do clube confirma o jogo do placard' using errcode = '42501';
  end if;
  if p_game_id is not null and private.game_group(p_game_id) is distinct from s.group_id then
    raise exception 'o jogo tem de ser do mesmo clube' using errcode = '22023';
  end if;

  if s.game_id is not distinct from p_game_id then
    return private.placard_apply_session(p_session_id);
  end if;

  if s.game_id is not null then
    perform private.placard_unapply_session(p_session_id);
  end if;

  update public.scoreboard_sessions
  set game_id = p_game_id, confirmed_by = (select auth.uid()), confirmed_at = now(), updated_at = now()
  where id = p_session_id;

  return private.placard_apply_session(p_session_id);
end;
$$;

revoke all on function public.placard_confirm_session(uuid, text) from public, anon;
grant execute on function public.placard_confirm_session(uuid, text) to authenticated;

-- 9. A app grava todos os jogos de uma vez a partir da copia local. Uma copia antiga (aberta antes do FIM)
--    nao pode apagar o resultado que o placard gravou: num jogo com placard, o resultado so muda para um
--    resultado gravado igual ou mais recente. O admin corrige normalmente (a app grava a hora da correcao).
create or replace function private.games_placard_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(current_setting('footer.placard_write', true), '') = 'on' then
    return new;
  end if;
  if old.score_saved_at is not null
     and (new.score_saved_at is null or new.score_saved_at < old.score_saved_at)
     and exists (select 1 from public.scoreboard_sessions where game_id = old.id) then
    new.score_a := old.score_a;
    new.score_b := old.score_b;
    new.score_saved_at := old.score_saved_at;
    new.status := old.status;
  end if;
  return new;
end;
$$;

revoke all on function private.games_placard_guard() from public, anon, authenticated;

drop trigger if exists games_placard_guard on public.games;
create trigger games_placard_guard
before update on public.games
for each row execute function private.games_placard_guard();

commit;
