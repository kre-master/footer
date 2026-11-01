-- Frequencia cardiaca do relogio no video do jogo (2026-11-02).
-- Cada jogador carrega o treino do seu relogio (.fit, .tcx ou .gpx) no historico do jogo; a app le o ficheiro no
-- proprio aparelho e guarda so a serie de batimentos (um valor a cada ~3 s), nunca o GPS nem o ficheiro.
-- Dados de saude: so o proprio le, altera e apaga. Nem os admins veem.

create table if not exists public.game_heart_rate (
  game_id text not null references public.games(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  file_name text check (char_length(file_name) <= 120),
  format text not null check (format in ('fit', 'tcx', 'gpx')),
  started_at timestamptz not null,
  series jsonb not null check (jsonb_typeof(series) = 'array' and jsonb_array_length(series) between 1 and 20000),
  adjust_s numeric not null default 0 check (adjust_s between -86400 and 86400),
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

alter table public.game_heart_rate enable row level security;
revoke all on table public.game_heart_rate from public, anon;
grant select, insert, update, delete on table public.game_heart_rate to authenticated;

drop policy if exists "heart rate read own" on public.game_heart_rate;
create policy "heart rate read own" on public.game_heart_rate for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "heart rate insert own" on public.game_heart_rate;
create policy "heart rate insert own" on public.game_heart_rate for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "heart rate update own" on public.game_heart_rate;
create policy "heart rate update own" on public.game_heart_rate for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "heart rate delete own" on public.game_heart_rate;
create policy "heart rate delete own" on public.game_heart_rate for delete to authenticated
using (user_id = (select auth.uid()));
