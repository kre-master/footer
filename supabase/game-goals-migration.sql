-- Marcadores dos golos (2026-11-11): quem marcou e quem assistiu em cada golo de um jogo.
-- O admin do clube liga ou desliga o registo (game_goal_settings). Ligado: qualquer membro do clube
-- regista um golo ainda vazio; depois de registado, so o admin muda. Quem discordar deixa uma
-- sugestao (game_goal_suggestions) e o admin aceita ou recusa.
-- game_goals: uma linha por golo; position = 1.º, 2.º... golo dessa equipa; side = equipa que ganhou o golo.
-- own_goal = autogolo (AG), sem marcador. assist_id vazio = sem assistencia.
-- game_s: segundo da linha do tempo da analise (o mesmo dos tempos com ▶ do video), opcional.
-- Quando o placard registar golos sozinho, preenche os tempos e as pessoas so escolhem os nomes.
-- Idempotente.

begin;

-- 1. Interruptor por clube
create table if not exists public.game_goal_settings (
  group_id uuid primary key references public.groups(id) on delete cascade,
  enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.game_goal_settings enable row level security;

drop policy if exists "goal settings read" on public.game_goal_settings;
create policy "goal settings read" on public.game_goal_settings
  for select to authenticated
  using (private.is_group_member(group_id));

drop policy if exists "goal settings admin insert" on public.game_goal_settings;
create policy "goal settings admin insert" on public.game_goal_settings
  for insert to authenticated
  with check (private.is_group_admin(group_id));

drop policy if exists "goal settings admin update" on public.game_goal_settings;
create policy "goal settings admin update" on public.game_goal_settings
  for update to authenticated
  using (private.is_group_admin(group_id))
  with check (private.is_group_admin(group_id));

revoke all on public.game_goal_settings from public, anon;
revoke all on public.game_goal_settings from authenticated;
grant select, insert, update on public.game_goal_settings to authenticated;

create or replace function private.goals_enabled(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select enabled from public.game_goal_settings where group_id = p_group_id), false)
$$;

revoke all on function private.goals_enabled(uuid) from public, anon;
grant execute on function private.goals_enabled(uuid) to authenticated;

-- 2. Golos
create table if not exists public.game_goals (
  game_id text not null references public.games(id) on delete cascade,
  side text not null check (side in ('A', 'B')),
  position integer not null check (position between 1 and 99),
  scorer_id text references public.players(id) on delete set null,
  own_goal boolean not null default false,
  assist_id text references public.players(id) on delete set null,
  game_s numeric check (game_s is null or game_s >= 0),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (game_id, side, position),
  check (not (own_goal and scorer_id is not null)),
  check (assist_id is null or assist_id is distinct from scorer_id)
);

alter table public.game_goals enable row level security;

-- Os membros so veem os golos com o registo ligado; o admin ve sempre.
drop policy if exists "goals read" on public.game_goals;
create policy "goals read" on public.game_goals
  for select to authenticated
  using (
    private.is_group_admin(private.game_group(game_id))
    or (private.is_group_member(private.game_group(game_id)) and private.goals_enabled(private.game_group(game_id)))
  );

drop policy if exists "goals insert" on public.game_goals;
create policy "goals insert" on public.game_goals
  for insert to authenticated
  with check (
    private.is_group_admin(private.game_group(game_id))
    or (private.is_group_member(private.game_group(game_id)) and private.goals_enabled(private.game_group(game_id)))
  );

-- Um membro so completa um golo ainda sem marcador; o admin muda qualquer um.
drop policy if exists "goals update" on public.game_goals;
create policy "goals update" on public.game_goals
  for update to authenticated
  using (
    private.is_group_admin(private.game_group(game_id))
    or (
      private.is_group_member(private.game_group(game_id))
      and private.goals_enabled(private.game_group(game_id))
      and scorer_id is null and not own_goal
    )
  )
  with check (
    private.is_group_admin(private.game_group(game_id))
    or (private.is_group_member(private.game_group(game_id)) and private.goals_enabled(private.game_group(game_id)))
  );

drop policy if exists "goals admin delete" on public.game_goals;
create policy "goals admin delete" on public.game_goals
  for delete to authenticated
  using (private.is_group_admin(private.game_group(game_id)));

revoke all on public.game_goals from public, anon;
revoke all on public.game_goals from authenticated;
grant select, insert, update, delete on public.game_goals to authenticated;

-- 3. Sugestoes de correcao ("possivel erro")
create table if not exists public.game_goal_suggestions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  side text not null check (side in ('A', 'B')),
  position integer not null check (position between 1 and 99),
  scorer_id text references public.players(id) on delete set null,
  own_goal boolean not null default false,
  assist_id text references public.players(id) on delete set null,
  note text check (char_length(note) <= 200),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  check (not (own_goal and scorer_id is not null)),
  check (assist_id is null or assist_id is distinct from scorer_id)
);

create index if not exists game_goal_suggestions_game_idx on public.game_goal_suggestions (game_id);

alter table public.game_goal_suggestions enable row level security;

-- Cada um ve as suas; o admin ve todas as do clube.
drop policy if exists "goal suggestions read" on public.game_goal_suggestions;
create policy "goal suggestions read" on public.game_goal_suggestions
  for select to authenticated
  using (created_by = (select auth.uid()) or private.is_group_admin(private.game_group(game_id)));

drop policy if exists "goal suggestions insert" on public.game_goal_suggestions;
create policy "goal suggestions insert" on public.game_goal_suggestions
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'pending'
    and private.is_group_member(private.game_group(game_id))
    and private.goals_enabled(private.game_group(game_id))
  );

drop policy if exists "goal suggestions admin decide" on public.game_goal_suggestions;
create policy "goal suggestions admin decide" on public.game_goal_suggestions
  for update to authenticated
  using (private.is_group_admin(private.game_group(game_id)))
  with check (private.is_group_admin(private.game_group(game_id)));

drop policy if exists "goal suggestions delete" on public.game_goal_suggestions;
create policy "goal suggestions delete" on public.game_goal_suggestions
  for delete to authenticated
  using (
    (created_by = (select auth.uid()) and status = 'pending')
    or private.is_group_admin(private.game_group(game_id))
  );

revoke all on public.game_goal_suggestions from public, anon;
revoke all on public.game_goal_suggestions from authenticated;
grant select, insert, update, delete on public.game_goal_suggestions to authenticated;

commit;
