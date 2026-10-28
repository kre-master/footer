import test from "node:test";
import assert from "node:assert/strict";
import insights from "../player-insights.js";

const status = { distance: "preliminary", pace: "preliminary", max_speed: "indicative", sprints: "preliminary", passes: "detected" };

function row(overrides = {}) {
  return insights.buildGameRow({
    gameId: overrides.gameId || "g1",
    date: overrides.date || "2026-10-07T21:00:00",
    outcome: overrides.outcome || "win",
    mvp: overrides.mvp || false,
    metricStatus: status,
    tracking: overrides.tracking === undefined
      ? { validMinutes: 40, distanceM: 4000, maxSustainedKmh: 22, maxSustainedAtS: 300, sprints: 5, passesMade: 10, goalkeeperMin: 0 }
      : overrides.tracking,
  });
}

test("period pace is total distance over total valid minutes, not the mean of game paces", () => {
  const rows = [
    row({ gameId: "a", tracking: { validMinutes: 10, distanceM: 1500 } }),
    row({ gameId: "b", tracking: { validMinutes: 40, distanceM: 4000 } }),
  ];
  const summary = insights.summarize(rows);
  assert.equal(summary.pace.value, 5500 / 50);
  assert.notEqual(summary.pace.value, (150 + 100) / 2);
  assert.equal(summary.pace.games, 2);
});

test("untracked games count as played but never as zero metrics", () => {
  const rows = [row({ gameId: "a" }), row({ gameId: "b", tracking: null, outcome: "loss" })];
  const summary = insights.summarize(rows);
  assert.equal(summary.played, 2);
  assert.equal(summary.trackedGames, 1);
  assert.equal(summary.distance.games, 1);
  assert.equal(summary.distance.totalM, 4000);
  assert.equal(summary.wins, 1);
  assert.equal(summary.losses, 1);
});

test("a metric missing in every game stays absent instead of zero", () => {
  const summary = insights.summarize([row({ tracking: { validMinutes: 30, distanceM: 3000 } })]);
  assert.equal(summary.passes.total, null);
  assert.equal(summary.passes.games, 0);
  assert.equal(summary.maxSpeed.value, null);
});

test("max speed keeps the game and moment it came from", () => {
  const rows = [
    row({ gameId: "a", tracking: { validMinutes: 30, distanceM: 3000, maxSustainedKmh: 21, maxSustainedAtS: 100 } }),
    row({ gameId: "b", tracking: { validMinutes: 30, distanceM: 3000, maxSustainedKmh: 24.6, maxSustainedAtS: 812 } }),
  ];
  const summary = insights.summarize(rows);
  assert.equal(summary.maxSpeed.value, 24.6);
  assert.equal(summary.maxSpeed.gameId, "b");
  assert.equal(summary.maxSpeed.atS, 812);
  assert.equal(summary.maxSpeed.status, "indicative");
});

test("goalkeeper minutes are reported as context of the pace", () => {
  const summary = insights.summarize([row({ tracking: { validMinutes: 40, distanceM: 3600, goalkeeperMin: 6 } })]);
  assert.equal(summary.pace.goalkeeperMin, 6);
});

test("periods cover a month, the last 90 days, the season and everything", () => {
  const now = new Date(2026, 9, 21);
  const month = insights.periodRange("month:2026-10", now);
  assert.ok(insights.inPeriod("2026-10-14T21:00:00", month));
  assert.ok(!insights.inPeriod("2026-09-30T21:00:00", month));
  const season = insights.periodRange("season", now);
  assert.ok(insights.inPeriod("2026-09-02T21:00:00", season));
  assert.ok(!insights.inPeriod("2026-08-30T21:00:00", season));
  const recent = insights.periodRange("3m", now);
  assert.ok(insights.inPeriod("2026-08-01T21:00:00", recent));
  assert.ok(!insights.inPeriod("2026-07-01T21:00:00", recent));
  assert.ok(insights.inPeriod("2020-01-01T21:00:00", insights.periodRange("all", now)));
});

test("highlights compare the two latest analysed games without judging fitness", () => {
  const rows = [
    row({ gameId: "a", date: "2026-10-07T21:00:00", tracking: { validMinutes: 35, distanceM: 3400 } }),
    row({ gameId: "b", date: "2026-10-14T21:00:00", tracking: { validMinutes: 45, distanceM: 4500 } }),
  ];
  const facts = insights.highlights(rows, insights.summarize(rows));
  assert.equal(facts.length, 2);
  assert.match(facts[0], /14\/10 percorreste mais 1,1 km do que a 07\/10, com mais 10 min observados/);
  assert.match(facts[1], /m\/min/);
  facts.forEach((fact) => assert.doesNotMatch(fact, /forma|condi/i));
});

test("a single analysed game produces one prudent fact", () => {
  const rows = [row({ date: "2026-10-14T21:00:00" }), row({ gameId: "b", tracking: null })];
  const facts = insights.highlights(rows, insights.summarize(rows));
  assert.equal(facts.length, 1);
  assert.match(facts[0], /único analisado/);
});

test("quality labels explain each metric status", () => {
  assert.equal(insights.statusText("indicative"), "indicativo");
  assert.equal(insights.statusText("detected"), "detetado, sem auditoria");
  assert.equal(insights.statusText("unknown"), null);
});

test("weakestOf picks the least reliable status", () => {
  assert.equal(insights.weakestOf(["measured", "indicative", "detected"]), "indicative");
  assert.equal(insights.weakestOf([null, undefined]), null);
  assert.equal(insights.weakestOf([]), null);
});
