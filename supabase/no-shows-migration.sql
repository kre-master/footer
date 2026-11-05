-- Faltas (2026-11-05): quem disse "Vou" e nao apareceu. So o admin do grupo le e escreve.
-- Serve para a "fiabilidade" (disse Vou e apareceu), visivel so para admins. Idempotente.

begin;

create table if not exists public.event_no_shows (
  event_id text not null references public.events(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  marked_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (event_id, player_id)
);

alter table public.event_no_shows enable row level security;

drop policy if exists "no shows admin read" on public.event_no_shows;
create policy "no shows admin read" on public.event_no_shows
  for select to authenticated
  using (private.is_group_admin(private.event_group(event_id)));

drop policy if exists "no shows admin insert" on public.event_no_shows;
create policy "no shows admin insert" on public.event_no_shows
  for insert to authenticated
  with check (
    private.is_group_admin(private.event_group(event_id))
    and private.player_group(player_id) = private.event_group(event_id)
  );

drop policy if exists "no shows admin delete" on public.event_no_shows;
create policy "no shows admin delete" on public.event_no_shows
  for delete to authenticated
  using (private.is_group_admin(private.event_group(event_id)));

revoke all on public.event_no_shows from anon;
revoke all on public.event_no_shows from authenticated;
grant select, insert, delete on public.event_no_shows to authenticated;

commit;
