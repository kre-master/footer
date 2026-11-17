import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Verificacoes estruturais da migracao do placard (nao corre PostgreSQL).
// O comportamento e testado em tests/sql/scoreboard-scenarios.sql contra um Postgres local:
// stub -> game-goals-migration.sql -> scoreboard-migration.sql -> scenarios.

const sql = (await readFile(new URL("../supabase/scoreboard-migration.sql", import.meta.url), "utf8"))
  .replaceAll("\r\n", "\n");

test("a chave do placard so se guarda em hash", () => {
  assert.match(sql, /key_hash text not null unique/);
  assert.match(sql, /grant select \(id, group_id, name, active, created_at, last_seen_at\) on public\.scoreboard_devices to authenticated;/);
  assert.doesNotMatch(sql, /service_role/);
});

test("o cliente so le; escrever e so pelas funcoes", () => {
  for (const table of ["scoreboard_devices", "scoreboard_sessions", "game_scoreboard_events"]) {
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from public, anon, authenticated;`));
    assert.doesNotMatch(sql, new RegExp(`grant (insert|update|delete)[^;]*${table}`));
  }
});

test("o Pi entra com a anon key so pela funcao de entrada", () => {
  assert.match(sql, /grant execute on function public\.placard_ingest\(text, jsonb\) to anon, authenticated;/);
  assert.match(sql, /revoke all on function public\.placard_create_device\(uuid, text\) from public, anon;/);
  assert.match(sql, /revoke all on function public\.placard_confirm_session\(uuid, text\) from public, anon;/);
});

test("o jogo e sugerido e so o admin confirma (decisao do Jon a 2026-11-17)", () => {
  assert.match(sql, /suggested_game_id = private\.placard_suggest_game/);
  const confirm = sql.slice(sql.indexOf("create or replace function public.placard_confirm_session"));
  assert.match(confirm, /private\.is_group_admin\(s\.group_id\)/);
  const apply = sql.slice(sql.indexOf("create or replace function private.placard_apply_session"), sql.indexOf("create or replace function private.placard_unapply_session"));
  assert.match(apply, /s\.game_id is null then\s+return 0;/);
});
