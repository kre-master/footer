import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

// Resultados do jogo: curva de niveis, linhas de EXP e jogos por ver, iguais a migracao rewards-items.
const require = createRequire(import.meta.url);
const X = require("../xp-results.js");
const sql = (await readFile(new URL("../supabase/rewards-items-migration.sql", import.meta.url), "utf8")).replaceAll("\r\n", "\n");

test("curva de niveis: XP(L) = 30 (L-1)^2 + 70 (L-1), maximo 50", () => {
  assert.equal(X.xpForLevel(1), 0);
  assert.equal(X.xpForLevel(2), 100);
  assert.equal(X.xpForLevel(10), 3060);
  assert.equal(X.levelFromXp(99), 1);
  assert.equal(X.levelFromXp(100), 2);
  assert.equal(X.levelFromXp(3059), 9);
  assert.equal(X.levelFromXp(3060), 10);
  assert.equal(X.levelFromXp(10_000_000), 50);
  const p = X.progress(355);
  assert.deepEqual([p.level, p.into, p.span], [3, 95, 220]);
  assert.ok(sql.includes("30 * (greatest(p_level, 1) - 1) * (greatest(p_level, 1) - 1) + 70 * (greatest(p_level, 1) - 1)"));
});

test("itens: gear-<slot>-0N, camisola e calcoes por silhueta", () => {
  assert.deepEqual(X.parseItem("gear-bola-03"), { id: "gear-bola-03", slot: "bola", level: 3 });
  assert.equal(X.parseItem("gear-bola-07"), null);
  assert.equal(X.itemSrc("gear-camisola-01", "f"), "assets/avatar/cromo-classico/256/itens/gear-camisola-01-f.webp");
  assert.equal(X.itemSrc("gear-galhardete-01", "f"), "assets/avatar/cromo-classico/256/itens/gear-galhardete-01.webp");
});

test("conquista mostra percurso, nivel, raridade e item", () => {
  const l = X.lineFor({ reason: "achievement:r02:1", xp: 25, item_id: "gear-camisola-01", rarity: "common", status: "granted" });
  assert.equal(l.kind, "achievement");
  assert.equal(l.sub, "Presença em campo · nível 1");
  assert.equal(l.xp, 25);
  assert.equal(l.item.slot, "camisola");
  const held = X.lineFor({ reason: "achievement:r02:3", xp: 100, item_id: "gear-camisola-03", rarity: "rare", status: "held" });
  assert.equal(held.xp, 0);
  assert.ok(held.held);
});

test("jogos por ver: ordem das linhas, bonus quando ja houve linhas vistas", () => {
  const rows = [
    { id: "a", game_id: "g1", reason: "presence", xp: 100, status: "granted", created_at: "2026-11-11T23:00:00Z" },
    { id: "b", game_id: "g1", reason: "achievement:r02:1", xp: 25, item_id: "gear-camisola-01", rarity: "common", status: "granted", created_at: "2026-11-11T23:00:01Z" },
    { id: "c", game_id: "g1", reason: "win", xp: 60, status: "granted", created_at: "2026-11-11T23:00:00Z" },
    { id: "d", game_id: "g1", reason: "response", xp: 15, status: "granted", created_at: "2026-11-11T23:00:00Z" },
    { id: "e", game_id: "g1", reason: "mvp", xp: 80, status: "granted", created_at: "2026-11-12T23:10:00Z" },
    { id: "f", game_id: "g1", reason: "loss", xp: 15, status: "revoked", created_at: "2026-11-11T23:00:00Z" },
  ];
  const [first] = X.pendingScreens(rows, []);
  assert.equal(first.bonus, false);
  assert.deepEqual(first.lines.map((l) => l.kind), ["response", "presence", "win", "mvp", "achievement"]);
  assert.equal(first.gained, 280);
  const [bonus] = X.pendingScreens(rows, ["a", "b", "c", "d"]);
  assert.equal(bonus.bonus, true);
  assert.deepEqual(bonus.ids, ["e"]);
  assert.equal(X.pendingScreens(rows, ["a", "b", "c", "d", "e"]).length, 0);
  assert.equal(X.totalXp(rows), 280);
});

test("percursos da app batem certo com a migracao", () => {
  for (const id of ["r02", "r04", "r06", "r03", "r07", "r12"]) assert.ok(sql.includes(`"id": "${id}"`), `percurso ${id} falta`);
  for (const slot of ["camisola", "calcoes", "meias", "chuteiras", "bola", "galhardete"]) assert.ok(sql.includes(`"slot": "${slot}"`), `slot ${slot} falta`);
  assert.ok(sql.includes("perform private.evaluate_game_extras(g.id);"));
  assert.ok(sql.includes('"mvp": 80, "response": 15'));
});
