-- Endurecimento de seguranca (auditoria de 2026-10-28). Executar no SQL Editor ou com apply_migration.
-- 1) Um jogador so pode alterar a propria foto em public.players; admins do grupo continuam a poder tudo.
--    Aplica-se so a pedidos feitos diretamente pelo cliente (role authenticated/anon); as funcoes da app
--    (leave_group, etc.) correm como outro utilizador da base de dados e nao sao afetadas.
--    Sem SECURITY DEFINER de proposito: current_user tem de ser o papel de quem faz o pedido.
create or replace function private.players_guard_self_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and not private.is_group_admin(old.group_id)
     and (to_jsonb(new) - 'photo_data_url' - 'updated_at') is distinct from (to_jsonb(old) - 'photo_data_url' - 'updated_at') then
    raise exception 'players_self_update_only_photo' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists players_guard_self_update on public.players;
create trigger players_guard_self_update
  before update on public.players
  for each row execute function private.players_guard_self_update();

-- 2) Retirar permissoes que a app nunca usa. O RLS continua a ser a regra principal.
revoke insert, update, delete, truncate, trigger, references on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate, trigger, references on tables from anon;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;
