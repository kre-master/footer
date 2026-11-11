import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

// Liga Fantasia: funcoes do cliente e verificacoes estruturais da migracao.
// O comportamento do servidor e testado em tests/sql/fantasy-league-scenarios.sql contra um Postgres local.
const require = createRequire(import.meta.url);
const F = require("../fantasy-league.js");
const sql = (await readFile(new URL("../supabase/fantasy-league-migration.sql", import.meta.url), "utf8")).replaceAll("\r\n", "\n");

test("todos comecam com 40 em tudo e 0 pontos gastos", () => {
  const b = F.emptyBuild();
  assert.equal(Object.keys(b).length, 7);
  assert.ok(Object.values(b).every((v) => v === 40));
  assert.equal(F.pointsSpent(b), 0);
});

test("distribuir pontos respeita o total e os limites 40..75", () => {
  let b = F.emptyBuild();
  for (let i = 0; i < 25; i += 1) b = F.stepAttr(b, "shooting", 1, 20);
  assert.equal(b.shooting, 60, "para nos 20 pontos");
  assert.equal(F.stepAttr(b, "speed", 1, 20), b, "sem pontos nao sobe");
  assert.equal(F.stepAttr(F.emptyBuild(), "speed", -1, 20).speed, 40, "nao desce de 40");
  let c = F.emptyBuild();
  for (let i = 0; i < 40; i += 1) c = F.stepAttr(c, "speed", 1, 60);
  assert.equal(c.speed, 75, "teto 75");
  assert.equal(F.validateBuild(b, 20), null);
  assert.match(F.validateBuild({ ...b, speed: 41 }, 20), /20 pontos/);
  assert.match(F.validateBuild({ ...b, speed: 76 }, 99), /entre 40 e 75/);
});

test("classificacao por pontos, diferenca e golos marcados", () => {
  const rows = [
    { name: "A", slot: 1, points: 6, goals_for: 5, goals_against: 5 },
    { name: "B", slot: 2, points: 6, goals_for: 6, goals_against: 3 },
    { name: "C", slot: 3, points: 6, goals_for: 7, goals_against: 4 },
    { name: "D", slot: 4, points: 9, goals_for: 1, goals_against: 0 },
  ];
  assert.deepEqual(F.sortStandings(rows).map((r) => r.name), ["D", "C", "B", "A"]);
});

test("resumo da ultima e da proxima jornada", () => {
  const fx = [
    { id: 1, round: 1, played_at: "x" }, { id: 2, round: 1, played_at: "x" },
    { id: 3, round: 2, played_at: null, kickoff: "2026-11-23T21:00:00Z" }, { id: 4, round: 3, played_at: null },
  ];
  const s = F.roundsSummary(fx);
  assert.equal(s.lastRound, 1);
  assert.equal(s.nextRound, 2);
  assert.equal(s.last.length, 2);
  assert.equal(s.nextKickoff, "2026-11-23T21:00:00Z");
  assert.equal(s.totalRounds, 3);
  assert.equal(F.roundsSummary([]).lastRound, null);
});

test("marcadores agrupados por equipa", () => {
  const ev = [
    { kind: "goal", team_id: "a", player_name: "Ana" }, { kind: "goal", team_id: "a", player_name: "Ana" },
    { kind: "goal", team_id: "a", player_name: "Rui" }, { kind: "goal", team_id: "b", player_name: "Bea" },
    { kind: "save", team_id: "a", player_name: "GR" },
  ];
  assert.equal(F.scorersLine(ev, "a"), "Ana ×2, Rui");
  assert.equal(F.scorersLine(ev, "b"), "Bea");
});

test("regras aprovadas: 8 equipas de 7 (5 contra 5), 20 pontos, forma +2, itens desligados", () => {
  assert.match(sql, /team_count integer not null default 8/);
  assert.match(sql, /squad_size integer not null default 7/);
  assert.match(sql, /start_points integer not null default 20/);
  assert.match(sql, /form_bonus integer not null default 2/);
  assert.match(sql, /item_bonuses_enabled boolean not null default false/);
  assert.match(sql, /field_rank <= 4/, "onze: 1 GR + 4 de campo");
});

test("separacao do futebol real: a liga nunca escreve em tabelas reais", () => {
  assert.doesNotMatch(sql, /(insert into|update|delete from)\s+public\.(games|players|reward_ledger|events|game_goals)\b/i);
});

test("o cliente so le; escritas so por funcoes", () => {
  assert.doesNotMatch(sql, /grant (insert|update|delete|all)[^;]*on public\.fantasy_/i);
  assert.match(sql, /grant execute on function public\.fantasy_save_profile/);
  assert.match(sql, /revoke all on function private\.fantasy_play_due\(\) from public, anon, authenticated;/);
  assert.match(sql, /email_confirmed_at is not null/, "entrar na liga exige email confirmado");
});

test("avatar: reais com os valores por omissao, IA ao calhas mas fixo pelo id", () => {
  assert.deepEqual(F.appearanceFor({ user_id: "u1" }), { sx: "m", tone: 4, hair: "penteado-para-tras", color: "castanho-escuro" });
  const a = F.appearanceFor({ id: "ia-1" });
  assert.deepEqual(F.appearanceFor({ id: "ia-1" }), a);
  assert.ok(a.tone >= 1 && a.tone <= 6);
  assert.ok(F.AVATAR.approved[a.sx].includes(a.hair));
  assert.ok(F.AVATAR.approved.colors.includes(a.color));
});

test("avatar: camadas pela ordem do manifesto e rapado sem cabelo", () => {
  const names = F.avatarLayers({ sx: "m", tone: 2, hair: "rapado", color: "preto" }).map((l) => l.src);
  assert.deepEqual(names, ["kit/galhardete.webp", "bases/m-pele-2.webp", "kit/meias-chuteiras.webp", "kit/m-calcoes.webp", "kit/m-camisola.webp", "kit/bola.webp"]);
  const f = F.avatarLayers({ sx: "f", tone: 4, hair: "coque", color: "loiro" }).map((l) => l.src);
  assert.ok(f.includes("cabelo/f-coque-loiro.webp"));
});

test("avatar: todos os ficheiros usados existem", async () => {
  const { access } = await import("node:fs/promises");
  for (const sx of ["m", "f"]) {
    for (let tone = 1; tone <= 6; tone += 1) {
      for (const hair of F.AVATAR.hair[sx]) {
        for (const color of F.AVATAR.colors) {
          for (const l of F.avatarLayers({ sx, tone, hair, color })) {
            await access(new URL(`../${F.AVATAR.root}${l.src}`, import.meta.url));
          }
        }
      }
    }
  }
});

test("carta: busto do avatar enche o retrato, sem bola nem galhardete", () => {
  const html = F.avatarHtml({ sx: "m", tone: 4, hair: "penteado-para-tras", color: "preto" }, { bust: "fluid" });
  assert.match(html, /fantasy-avatar-fluid/);
  assert.doesNotMatch(html, /galhardete|bola/);
  assert.match(html, /width:200\.00%;left:-63\.28%/);
});

test("carta: preferencias so escritas pela propria conta", async () => {
  const cp = (await readFile(new URL("../supabase/card-preferences-migration.sql", import.meta.url), "utf8"));
  assert.match(cp, /check \(portrait in \('photo', 'avatar'\)\)/);
  assert.match(cp, /with check \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.doesNotMatch(cp, /grant[^;]*delete[^;]*card_preferences/);
});
