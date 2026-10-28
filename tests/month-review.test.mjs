import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const R = require("../month-review.js");

const game = (date, extra = {}) => ({ date, finished: true, mvpClosed: true, closedAt: date, ...extra });

test("review stays closed while the month is running", () => {
  const status = R.reviewStatus({ key: "2026-10", now: new Date("2026-10-28T23:00:00"), games: [game("2026-10-28T21:00:00")] });
  assert.equal(status.ready, false);
  assert.equal(status.reason, "em-curso");
});

test("review waits for results and MVP of every game in the month", () => {
  const now = new Date("2026-11-02T10:00:00");
  assert.equal(R.reviewStatus({ key: "2026-10", now, games: [game("2026-10-07T21:00:00"), game("2026-10-28T21:00:00", { finished: false })] }).reason, "jogo-por-fechar");
  assert.equal(R.reviewStatus({ key: "2026-10", now, games: [game("2026-10-28T21:00:00", { mvpClosed: false })] }).reason, "mvp-por-fechar");
  assert.equal(R.reviewStatus({ key: "2026-10", now, games: [game("2026-09-28T21:00:00")] }).reason, "sem-jogos");
});

test("review opens after the month and the last MVP lock", () => {
  const status = R.reviewStatus({
    key: "2026-10",
    now: new Date("2026-11-03T10:00:00"),
    games: [game("2026-10-07T21:00:00"), game("2026-10-31T21:00:00", { closedAt: "2026-11-01T21:00:00" })],
  });
  assert.equal(status.ready, true);
  assert.equal(status.readyAt.toISOString(), new Date("2026-11-01T21:00:00").toISOString());
});

test("previous month key crosses the year", () => {
  assert.equal(R.previousKey("2026-01"), "2025-12");
  assert.equal(R.previousKey("2026-10"), "2026-09");
});

const base = { playerName: "Joao", monthTitle: "outubro", message: "Boa.", played: 4, teamGames: 5, wins: 3, draws: 0, losses: 1, mvps: 0 };

test("slides skip metrics without data and explain a month without video", () => {
  const slides = R.buildSlides({ ...base, tracked: { games: 0 }, awards: { count: 0 }, facts: [] });
  assert.deepEqual(slides.map((s) => s.key), ["cover", "presence", "no-video", "end"]);
});

test("slides include tracked metrics with a comparison to the previous month", () => {
  const slides = R.buildSlides({
    ...base,
    mvps: 1,
    tracked: { games: 3, distanceKm: 12.3, paceMpm: 80, maxSpeedKmh: 21.5, sprints: 14, passes: null, status: { distance: "measured" }, moment: { gameId: "g1", atS: 90 } },
    previous: { label: "setembro", played: 3, distanceKm: 11.1, paceMpm: 79, maxSpeedKmh: 21.4, sprints: 10 },
    awards: { count: 2, firstCount: 1 },
    effort: { calories: 2100, intensity: 7.5, energy: 6 },
    facts: ["Facto."],
  });
  assert.deepEqual(slides.map((s) => s.key), ["cover", "presence", "mvp", "distance", "pace", "speed", "sprints", "awards", "effort", "end"]);
  const distance = slides.find((s) => s.key === "distance");
  assert.equal(distance.big, "12,3");
  assert.equal(distance.delta, "+1,2 km face a setembro");
  assert.equal(distance.status, "measured");
  assert.equal(slides.find((s) => s.key === "pace").delta, "Igual a setembro");
  assert.equal(slides.find((s) => s.key === "speed").action.gameId, "g1");
  assert.equal(slides.find((s) => s.key === "presence").delta, "+1 jogos face a setembro");
});
