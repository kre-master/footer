import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const P = require("../placard.js");
const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (value) => String(value).slice(0, 16);
const NOW = Date.parse("2026-11-20T21:30:00Z");
const row = (extra) => ({ id: "s1", device_id: "d1", started_at: "2026-11-20T21:05:00Z", status: "live", score_a: 2, score_b: 1, clock_s: 1500, updated_at: "2026-11-20T21:29:40Z", ...extra });
const games = [{ id: "g1", date: "2026-11-20T21:00:00Z", status: "open" }, { id: "g2", date: "2026-11-13T21:00:00Z", status: "finished" }];

test("relogio mm:ss", () => {
  assert.equal(P.formatClock(0), "00:00");
  assert.equal(P.formatClock(754.6), "12:34");
  assert.equal(P.formatClock(5999), "99:59");
});

test("ao vivo so enquanto ha noticias e nao terminou", () => {
  assert.equal(P.isLive(P.sessionFromRow(row()), NOW), true);
  assert.equal(P.isLive(P.sessionFromRow(row({ status: "finished" })), NOW), false);
  assert.equal(P.isLive(P.sessionFromRow(row({ updated_at: "2026-11-20T17:00:00Z" })), NOW), false);
  assert.equal(P.needsPolling([P.sessionFromRow(row())], NOW), true);
});

test("jogadores veem o resultado ao vivo so com o jogo confirmado", () => {
  const pending = [P.sessionFromRow(row({ suggested_game_id: "g1" }))];
  assert.equal(P.renderGameBanner(games[0], pending, { isAdmin: false, games, escape: esc, formatDate: fmt, now: NOW }), "");
  const confirmed = [P.sessionFromRow(row({ game_id: "g1" }))];
  const html = P.renderGameBanner(games[0], confirmed, { isAdmin: false, games, escape: esc, formatDate: fmt, now: NOW });
  assert.match(html, /Placard 2–1/);
  assert.match(html, /ao vivo · 25:00/);
});

test("admin ve a sugestao e pode escolher outro jogo", () => {
  const pending = [P.sessionFromRow(row({ suggested_game_id: "g1" }))];
  const html = P.renderGameBanner(games[0], pending, { isAdmin: true, games, escape: esc, formatDate: fmt, now: NOW });
  assert.match(html, /data-placard-confirm="s1" data-game="g1"/);
  assert.match(html, /<option value="g2">/);
  assert.equal(P.renderGameBanner(games[1], [P.sessionFromRow(row({ suggested_game_id: "g1" }))], { isAdmin: true, games, escape: esc, formatDate: fmt, now: NOW }), "");
});

test("bloco do clube: chave nova aparece e o texto vem escapado", () => {
  const html = P.renderClubSection({ devices: [{ id: "d1", name: "<Mala>", active: true, lastSeenAt: null }], sessions: [], games, newKey: "abc123", escape: esc, formatDate: fmt, remote: true, now: NOW });
  assert.match(html, /abc123/);
  assert.match(html, /&lt;Mala&gt;/);
  assert.match(P.renderClubSection({ remote: false, escape: esc }), /scoreboard-migration\.sql/);
});
