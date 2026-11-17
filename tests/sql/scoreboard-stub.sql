-- Supabase minimo para testar a migracao do placard (scoreboard-migration.sql).
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema if not exists extensions;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create schema private;
grant usage on schema private to authenticated;
create table public.groups (id uuid primary key default gen_random_uuid(), name text);
create table public.group_members (group_id uuid references public.groups(id), user_id uuid references auth.users(id), role text, primary key (group_id, user_id));
create function private.is_group_member(g uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists (select 1 from public.group_members where group_id=g and user_id=auth.uid()) $$;
create function private.is_group_admin(g uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists (select 1 from public.group_members where group_id=g and user_id=auth.uid() and role in ('owner','admin')) $$;
create table public.players (id text primary key, name text, group_id uuid references public.groups(id));
create table public.games (id text primary key, date timestamptz not null, status text not null, team_a text[] default '{}', team_b text[] default '{}', bench_a text[] default '{}', bench_b text[] default '{}', score_a int, score_b int, score_saved_at timestamptz, notes text default '', updated_at timestamptz default now(), group_id uuid references public.groups(id));
create function private.game_group(p text) returns uuid language sql stable security definer set search_path='' as $$ select group_id from public.games where id=p $$;
