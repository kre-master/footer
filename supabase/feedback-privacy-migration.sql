-- Respostas pos-jogo privadas (2026-11-05). Idempotente.
-- 1) Cada conta so le as proprias respostas (antes o admin do grupo lia todas, com nome).
-- 2) group_feedback_answers: respostas do grupo SEM quem respondeu, para medias e para a regra de
--    respostas sem interesse. "is_mine" so marca as da propria conta; "repeated" = a mesma pessoa deu
--    exactamente a mesma resposta nos ultimos 4 jogos seguidos (este incluido).

begin;

drop policy if exists "feedback read own or admin" on public.game_feedback;
drop policy if exists "feedback read own" on public.game_feedback;
create policy "feedback read own" on public.game_feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.group_feedback_answers(p_group_id uuid)
returns table (game_id text, game_intensity integer, remaining_energy integer, is_mine boolean, repeated boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select answers.game_id, answers.game_intensity, answers.remaining_energy, answers.is_mine, answers.repeated
  from (
    select
      feedback.game_id,
      feedback.game_intensity,
      feedback.remaining_energy,
      coalesce(feedback.user_id = (select auth.uid()), false) as is_mine,
      (count(*) over recent = 4
        and min(feedback.game_intensity) over recent = max(feedback.game_intensity) over recent
        and min(feedback.remaining_energy) over recent = max(feedback.remaining_energy) over recent) as repeated
    from public.game_feedback as feedback
    join public.games as game on game.id = feedback.game_id
    where game.group_id = p_group_id
      and private.is_group_member(p_group_id)
    window recent as (partition by feedback.player_id order by game.date rows between 3 preceding and current row)
  ) as answers
  order by answers.game_id, answers.game_intensity, answers.remaining_energy;
$$;

revoke all on function public.group_feedback_answers(uuid) from public, anon;
grant execute on function public.group_feedback_answers(uuid) to authenticated;

commit;
