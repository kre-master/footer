-- Grupos e perfis novos sem aprovacao (2026-10-28). Correr no SQL Editor antes de publicar a app.
-- 1) Qualquer conta cria um grupo e fica logo dona dele; cada conta e dona de no maximo 2 grupos.
--    Fica um registo "approved" em group_requests, para o dono da app ver quem criou o que.
create or replace function public.create_group(p_name text, p_location text default '', p_schedule text default '', p_notes text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := left(btrim(coalesce(p_name, '')), 60);
  v_location text := left(btrim(coalesce(p_location, '')), 80);
  v_requester text;
  v_slug text;
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 then
    raise exception 'name_required' using errcode = '22023';
  end if;
  -- Dois pedidos ao mesmo tempo da mesma conta nao passam o limite.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if (select count(*) from public.group_members where user_id = v_user_id and role = 'owner') >= 2 then
    raise exception 'group_limit_reached' using errcode = 'P0001';
  end if;

  v_slug := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  v_slug := left(coalesce(nullif(v_slug, ''), 'grupo'), 30) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
  insert into public.groups (slug, name, created_by, default_location)
  values (v_slug, v_name, v_user_id, v_location)
  returning id into v_group_id;
  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  select left(coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), ''), 'Jogador'), 60)
  into v_requester from public.profiles where id = v_user_id;
  insert into public.group_requests (requested_by, requester_name, name, location, schedule, notes, status, group_id, decided_at, decided_by)
  values (v_user_id, coalesce(v_requester, 'Jogador'), v_name, v_location,
    left(btrim(coalesce(p_schedule, '')), 80), left(btrim(coalesce(p_notes, '')), 300), 'approved', v_group_id, now(), v_user_id);
  return v_group_id;
end;
$$;

revoke execute on function public.create_group(text, text, text, text) from public, anon;
grant execute on function public.create_group(text, text, text, text) to authenticated;

-- 2) "Nao estas na lista? Cria o teu perfil": o perfil novo fica logo ligado a conta.
--    Escolher um perfil que ja existe continua a passar pelo admin (player_claims pendente).
create or replace function public.create_own_player(p_group_id uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := left(btrim(coalesce(p_name, '')), 40);
  v_rating integer;
  v_player_id text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not private.is_group_member(p_group_id) then
    raise exception 'group_member_required' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 then
    raise exception 'name_required' using errcode = '22023';
  end if;
  if exists (select 1 from public.players where group_id = p_group_id and linked_user_id = v_user_id) then
    raise exception 'already_linked' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.player_claims where user_id = v_user_id and status = 'pending') then
    raise exception 'claim_pending' using errcode = 'P0001';
  end if;

  select coalesce(round(avg(overall))::integer, 60) into v_rating
  from public.players where group_id = p_group_id and not is_guest;
  v_player_id := 'p-' || gen_random_uuid()::text;
  insert into public.players (id, name, pace, shooting, passing, dribbling, defending, physical, overall, group_id, linked_user_id)
  values (v_player_id, v_name, v_rating, v_rating, v_rating, v_rating, v_rating, v_rating, v_rating, p_group_id, v_user_id);
  insert into public.player_claims (user_id, player_id, status) values (v_user_id, v_player_id, 'approved');
  return v_player_id;
end;
$$;
