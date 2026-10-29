-- Editar momentos (2026-10-29).
-- Quem marcou um momento pode corrigir o texto, o tempo e o pedaco; admins editam qualquer um.
-- So estas colunas mudam: o jogo, o video, o autor e a data ficam como estavam.
-- Correr depois de supabase/bookmarks-migration.sql.

revoke update on table public.game_video_bookmarks from authenticated;
grant update (moment_s, start_s, end_s, note) on table public.game_video_bookmarks to authenticated;

drop policy if exists "bookmarks update own or admin" on public.game_video_bookmarks;
create policy "bookmarks update own or admin" on public.game_video_bookmarks for update to authenticated
using (created_by = (select auth.uid()) or (select public.is_admin()))
with check (created_by = (select auth.uid()) or (select public.is_admin()));
