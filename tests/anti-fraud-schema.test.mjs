import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Verificacoes estruturais da migracao anti-fraude (nao corre PostgreSQL).
// O comportamento e testado em tests/sql/anti-fraud-scenarios.sql contra um Postgres local
// (ver Footer_vault/04 - Estado tecnico.md).

const sql = (await readFile(new URL("../supabase/anti-fraud-rewards-migration.sql", import.meta.url), "utf8"))
  .replaceAll("\r\n", "\n");

test("regras aprovadas pelo Jon a 2026-11-11 sao os valores por defeito", () => {
  assert.match(sql, /min_accounts integer not null default 7/);
  assert.match(sql, /min_confirmations integer not null default 7/);
  assert.match(sql, /window_hours integer not null default 48/);
  assert.match(sql, /trial_min_accounts integer not null default 7/);
  assert.match(sql, /trial_min_games integer not null default 5/);
});

test("jogos que ja existem comecam do 0", () => {
  assert.match(sql, /set verification = 'archive', verification_details = '\{"reason": "legacy"\}'::jsonb\s+where verification is null/);
  assert.match(sql, /add column if not exists created_at timestamptz;/, "created_at sem default para os jogos antigos");
});

test("o cliente so le o registo de recompensas", () => {
  assert.match(sql, /revoke all on public\.reward_ledger from public, anon, authenticated;\s+grant select on public\.reward_ledger to authenticated;/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*reward_ledger/);
  assert.match(sql, /create policy "reward ledger read own" on public\.reward_ledger for select/);
});

test("video e relogio nao contam como prova", () => {
  const evaluate = sql.slice(sql.indexOf("create or replace function private.evaluate_game"), sql.indexOf("create or replace function private.evaluate_pending_games"));
  assert.match(evaluate, /public\.game_feedback/);
  assert.match(evaluate, /public\.game_mvp_votes/);
  assert.doesNotMatch(evaluate, /game_tracking_results|heart_rate|game_videos/);
});

test("o gatilho de guarda impede o cliente de escrever o rasto", () => {
  assert.match(sql, /new\.created_at := now\(\);\s+new\.created_by := v_uid;\s+new\.verification := 'pending';/);
  assert.match(sql, /new\.created_at := old\.created_at;\s+new\.created_by := old\.created_by;/);
  assert.match(sql, /create trigger games_reward_guard\s+before insert or update on public\.games/);
});

test("reavaliar so quando muda algo que conta (a app reenvia todos os jogos)", () => {
  const trigger = sql.slice(sql.indexOf("create trigger games_reward_after_update"));
  assert.match(trigger, /^create trigger games_reward_after_update\s+after update on public\.games\s+for each row\s+when \(/);
  assert.doesNotMatch(trigger.slice(0, trigger.indexOf("execute function")), /verification/);
});

test("funcoes internas sem execute para o cliente; so a aprovacao e publica", () => {
  for (const name of ["evaluate_game", "grant_reward", "set_game_verification", "refresh_held_rewards", "evaluate_pending_games"]) {
    assert.match(sql, new RegExp(`revoke all on function private\\.${name}\\([^)]*\\) from public, anon, authenticated;`), name);
  }
  assert.match(sql, /grant execute on function public\.approve_game_change\(text\) to authenticated;/);
  assert.doesNotMatch(sql, /grant execute on function private\./);
});
