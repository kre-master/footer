-- Carta do jogador: retrato com foto (como ate agora) ou com o avatar (2026-11-11, pedido do Jon).
--
-- Uma linha por conta. Sem linha = foto. Cada conta so escreve a sua; todas as contas leem (a carta
-- de um jogador aparece aos colegas). Os ratings antigos deixam de aparecer na app (ratingsVisible).
--
-- Idempotente: pode correr mais de uma vez.

begin;

create table if not exists public.card_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  portrait text not null default 'photo' check (portrait in ('photo', 'avatar')),
  updated_at timestamptz not null default now()
);

alter table public.card_preferences enable row level security;
revoke all on public.card_preferences from public, anon, authenticated;
grant select, insert, update on public.card_preferences to authenticated;

drop policy if exists "card preferences read" on public.card_preferences;
create policy "card preferences read" on public.card_preferences for select to authenticated using (true);
drop policy if exists "card preferences insert own" on public.card_preferences;
create policy "card preferences insert own" on public.card_preferences for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists "card preferences update own" on public.card_preferences;
create policy "card preferences update own" on public.card_preferences for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

commit;
