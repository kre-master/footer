import test from "node:test";
import assert from "node:assert/strict";
import tracking from "../tracking-metrics.js";

function sample() {
  const player = (label, team, extra = {}) => ({
    player_id: null, label, team, identity_status: "proposed",
    quality: { automatic_identity_share_pct: 50, eligible_for_awards: false },
    metrics: {
      time: { valid_position_time_s: 1200, valid_speed_time_s: 1100 },
      distance_observed_m: 1600, distance_per_valid_min_m: 80, mean_speed_kmh: 4.8,
      max_speed_sustained_kmh: 22, max_speed_sustained_interval_s: [100, 101], speed_p95_kmh: 12,
      distance_above_15_kmh_m: 120, speed_band_time_s: [500, 300, 200, 80, 20],
      sprint: { count: 2 }, high_intensity_runs: { count: 9 }, goalkeeper_time_s: 0,
      zone_share_pct: { defensiva: 30, media: 40, ofensiva: 30 }, late_activity_ratio: 0.9,
      period_metrics: [{ m_per_min: 85 }, { m_per_min: 80 }, { m_per_min: 76 }],
      heatmap: { rows_y: 2, cols_x: 2, values_row_major: [1, 2, 3, 4] },
      ...extra,
    },
  });
  return {
    schema_version: "footer.tracking-result.v1", status: "needs_review", test: true, game_label: "jogo de teste",
    players: [
      player("Zé", "A"),
      player("MARQUES", "A", { distance_per_valid_min_m: 90, max_speed_sustained_kmh: 27 }),
      player("MIGO", "A", { distance_per_valid_min_m: 95, goalkeeper_time_s: 900 }),
      player("CURTO", "B", { time: { valid_position_time_s: 300 }, distance_per_valid_min_m: 120 }),
    ],
    teams: { A: { team_width_m: 9, team_depth_m: 15, team_compactness_m: 6, centroid_distance_from_own_goal_m: 15, territory_attacking_half_pct: 24, per_minute: [] } },
    teammate_pairs: [{ a: "MARQUES", b: "Zé", seconds_together: 600, seconds_within_5m: 120, share_within_5m_pct: 20 }],
    closest_opponents: { "Zé": [{ opponent: "CURTO", seconds_within_3m: 90 }] },
  };
}

test("rejects files that are not tracker results", () => {
  assert.throws(() => tracking.parseResult("not json"), /JSON/);
  assert.throws(() => tracking.parseResult({ schema_version: "other" }), /footer\.tracking-result\.v1/);
  assert.throws(() => tracking.parseResult({ schema_version: "footer.tracking-result.v1", players: [] }), /jogadores/);
});

test("parses metrics, partner and rival without inventing values", () => {
  const r = tracking.parseResult(JSON.stringify(sample()));
  const ze = r.players.find((p) => p.label === "Zé");
  assert.equal(ze.validMinutes, 20);
  assert.equal(ze.partner.label, "MARQUES");
  assert.equal(ze.rival.label, "CURTO");
  assert.equal(r.players.find((p) => p.label === "MIGO").rival, null);
  assert.equal(r.test, true);
});

test("names only pre-fill the mapping, and ambiguous names stay unmapped", () => {
  const players = [{ id: "p1", name: "Ze" }, { id: "p2", name: "Marques" }, { id: "p3", name: "Migo" }, { id: "p4", name: "migo" }];
  const mapping = tracking.proposeMapping(["Zé", "MARQUES", "MIGO", "CURTO"], players);
  assert.deepEqual(mapping, { "Zé": "p1", MARQUES: "p2", MIGO: null, CURTO: null });
  const problems = tracking.mappingProblems({ a: "p1", b: "p1", c: null });
  assert.deepEqual(problems.duplicates, [["a", "b"]]);
  assert.deepEqual(problems.unmapped, ["c"]);
});

test("highlights skip goalkeepers and short appearances", () => {
  const h = tracking.gameHighlights(tracking.parseResult(sample()));
  assert.deepEqual(h.motor.labels, ["MARQUES"]);
  assert.deepEqual(h.lightning.labels, ["MARQUES"]);
  assert.equal(h.keepers[0].label, "MIGO");
});

test("speed bands add up to 100 % and roles follow the zones", () => {
  const r = tracking.parseResult(sample());
  const bands = tracking.speedBands(r.players[0]);
  assert.equal(Math.round(bands.reduce((a, b) => a + b.pct, 0)), 100);
  assert.equal(tracking.roleLabel(r.players.find((p) => p.label === "MIGO")), "Guarda-redes");
  assert.equal(tracking.roleLabel(r.players[0]), "Box-to-box");
});

test("storage failures never throw", () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); } };
  assert.deepEqual(tracking.loadStore(broken), {});
  assert.equal(tracking.saveStore(broken, { a: 1 }), false);
});

test("team heatmap sums the dwell time of the team's players", () => {
  const r = tracking.parseResult(sample());
  assert.deepEqual(tracking.teamHeatmap(r, "A").values, [3, 6, 9, 12]);
  assert.equal(tracking.teamHeatmap(r, "C"), null);
});

test("tracking table keeps RLS: members read published only, admins write", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync(new URL("../supabase/tracking-migration.sql", import.meta.url), "utf8");
  assert.match(sql, /alter table public\.game_tracking_results enable row level security/i);
  assert.match(sql, /revoke all on table public\.game_tracking_results from public, anon/i);
  assert.match(sql, /using \(status = 'published' or \(select public\.is_admin\(\)\)\)/i);
  assert.match(sql, /for insert to authenticated\s+with check \(\(select public\.is_admin\(\)\)\)/i);
  assert.match(sql, /for update to authenticated\s+using \(\(select public\.is_admin\(\)\)\)\s+with check \(\(select public\.is_admin\(\)\)\)/i);
  assert.match(sql, /for delete to authenticated\s+using \(\(select public\.is_admin\(\)\)\)/i);
  assert.match(sql, /references public\.games\(id\) on delete cascade/i);
  assert.match(sql, /where status = 'published'/i);
  const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
  assert.match(schema, /create table if not exists public\.game_tracking_results/i);
});

test("ball pass metrics are read when present and stay absent in older results", () => {
  const old = tracking.parseResult(sample());
  assert.equal(old.ball, null);
  assert.equal(old.players[0].passesMade, null);
  assert.equal(old.players[0].passPartner, null);
  assert.equal(tracking.gameHighlights(old).passer, null);

  const data = sample();
  data.players[0].metrics.passes_made_detected = 7;
  data.players[0].metrics.passes_received_detected = 5;
  data.players[0].metrics.top_pass_partner = { label: "MARQUES", passes: 4 };
  data.players[1].metrics.passes_made_detected = 9;
  data.players[2].metrics.passes_made_detected = 30; // goalkeeper: no highlight
  data.teams.A.ball_attacking_third_pct = 28.2;
  data.ball = { coverage_of_video_pct: 77.2, middle_third_pct: 42.7, passes_detected_total: 16,
    audit: { passes: { correct: 23, judged: 24 } } };
  const result = tracking.parseResult(data);
  assert.deepEqual(result.ball, { coveragePct: 77.2, middleThirdPct: 42.7, passesTotal: 16, passAudit: { correct: 23, judged: 24 }, verticalAudit: null, possessionAudit: null, zonesPct: null, passLinks: [] });
  assert.equal(result.players[0].passesMade, 7);
  assert.equal(result.players[0].passesReceived, 5);
  assert.deepEqual(result.players[0].passPartner, { label: "MARQUES", passes: 4 });
  assert.equal(result.teams.A.ballAttackingThirdPct, 28.2);
  assert.deepEqual(tracking.gameHighlights(result).passer, { value: 9, labels: ["MARQUES"] });
});

test("a new revision inherits confirmed associations for the same video labels", () => {
  const mapping = tracking.inheritMapping(["Zé", "MARQUES", "NOVO"], { "Zé": "p-ze", MARQUES: null }, { MARQUES: "p-marques", NOVO: null });
  assert.deepEqual(mapping, { "Zé": "p-ze", MARQUES: "p-marques", NOVO: null });
  assert.deepEqual(tracking.inheritMapping(["A"], undefined, { A: "p-a" }), { A: "p-a" });
});

test("ball zones and team attacks are read only when complete", () => {
  const data = sample();
  data.ball = { zones: { pct_row_major: [7.5, 9.9, 6.6, 14.6, 22.3, 11.2, 6.6, 12.5, 8.8] } };
  data.teams.A.attacks = { count: 11, status: "estimate", lane_pct: { centro: 57 } };
  const result = tracking.parseResult(data);
  assert.equal(result.ball.zonesPct.length, 9);
  assert.deepEqual(result.teams.A.attacks, { count: 11, status: "estimate" }); // only the count is kept

  data.ball = { zones: { pct_row_major: [1, 2, 3] } };
  delete data.teams.A.attacks;
  const partial = tracking.parseResult(data);
  assert.equal(partial.ball.zonesPct, null);
  assert.equal(partial.teams.A.attacks, null);
});

test("status tags are specific and absent for unknown or measured metrics", () => {
  const data = sample();
  data.metric_status = { distance: "preliminary", max_speed: "indicative", passes: "detected", attacks: "estimate", ball_zones: "measured" };
  const result = tracking.parseResult(data);
  assert.equal(tracking.statusTag(result, "distance"), "preliminar");
  assert.equal(tracking.statusTag(result, "max_speed"), "indicativa");
  assert.equal(tracking.statusTag(result, "passes"), "contagem incompleta");
  assert.equal(tracking.statusTag(result, "attacks"), "estimativa");
  assert.equal(tracking.statusTag(result, "ball_zones"), null);
  assert.equal(tracking.statusTag(tracking.parseResult(sample()), "distance"), null);
});

test("pass partners add both directions and the face-off never turns missing data into 0", () => {
  const data = sample();
  data.players[0].metrics.mean_position_m = [10, 5];
  data.players[0].metrics.passes_made_detected = 3;
  data.players[1].metrics.passes_made_detected = 2;
  data.teams.B = { team_width_m: 8, team_compactness_m: 5 };
  data.ball = { pass_links: [{ from: "Zé", to: "MARQUES", count: 3 }, { from: "MARQUES", to: "Zé", count: 2 }, { from: "MIGO", to: "MARQUES", count: 1 }, { from: "bad" }] };
  const result = tracking.parseResult(data);
  assert.deepEqual(result.players[0].meanPosition, { x: 10, y: 5 });
  assert.equal(result.players[1].meanPosition, null);
  assert.deepEqual(tracking.passPartners(result, "Zé"), [{ label: "MARQUES", made: 3, received: 2, total: 5 }]);
  assert.deepEqual(tracking.passPartners(result, "MARQUES").map((r) => [r.label, r.total]), [["Zé", 5], ["MIGO", 1]]);
  const f = tracking.teamFaceOff(result);
  assert.equal(f.A.passes, 5);           // team A: 3 + 2 (MIGO has no pass data)
  assert.equal(f.A.attacks, null);       // no attacks in this file: "sem dados", not 0
  assert.equal(Math.round(f.A.metersPerPlayerMin), 80);  // 3 x 1600 m / 3 x 20 min
  assert.equal(f.B.passes, null);
});

test("timelines: periods, period totals and story facts come only from the data", () => {
  const old = tracking.parseResult(sample());
  assert.equal(old.players[0].timeline, null);
  assert.deepEqual(tracking.gamePeriods(old), []);  // no duration: no period filter
  assert.equal(tracking.periodStats(old.players[0], 0, 60), null);

  const data = sample();
  data.source = { video_duration_s: 180 };
  data.attack_direction = { team_A_own_goal_x_m: 39.5, team_B_own_goal_x_m: 0 };
  data.players[0].metrics.zone_share_pct = { corredor_perto: 50, corredor_centro: 30, corredor_longe: 20 };
  data.players[0].timeline = {
    distance_m: [60, 120, 30], seen_s: [60, 60, 10],
    sprints: [[70.5, 72, 22.1], [130, 131.5, 20.4]],
    path: { step_s: 2, points: [[0, 100, 50], [20, 120, 60], "bad"] },
  };
  const result = tracking.parseResult(data);
  const p = result.players[0];
  assert.deepEqual(p.timeline.path, [[0, 10, 5], [2, 12, 6]]);
  const periods = tracking.gamePeriods(result);
  assert.deepEqual(periods.map((q) => [q.key, q.from, q.to]), [[0, 0, 180], [1, 0, 60], [2, 60, 120], [3, 120, 180]]);
  const whole = tracking.periodStats(p, 0, 180, 180);
  assert.equal(whole.metres, 210);
  assert.equal(whole.sprints, 2);
  assert.equal(whole.peakKmh, 22.1);
  const last = tracking.periodStats(p, 120, 180, 180);
  assert.equal(last.metersPerMin, null);  // only 10 s seen: "sem dados", not a made-up rate
  const f = tracking.storyFacts(result, p);
  assert.deepEqual(f.bestMinute, { minute: 2, metersPerMin: 120 });  // minute 3 seen < 45 s is ignored
  assert.deepEqual(f.lane, { name: "esquerdo", pct: 50 });           // team A attacks towards x = 0
  data.players[0].team = "B";
  assert.equal(tracking.storyFacts(tracking.parseResult(data), tracking.parseResult(data).players[0]).lane.name, "direito");
});

test("a short last minute counts whole in the last period", () => {
  const data = sample();
  data.source = { video_duration_s: 90 };  // minute 2 lasts only 30 s
  data.players[0].timeline = { distance_m: [60, 40], seen_s: [60, 30], sprints: [], path: { points: [] } };
  const p = tracking.parseResult(data).players[0];
  assert.equal(tracking.periodStats(p, 0, 90, 90).metres, 100);
  assert.equal(tracking.periodStats(p, 60, 90, 90).metres, 40);
});

test("YouTube links of every common form give the 11-character video id", () => {
  const id = "dQw4w9WgXcQ";
  [
    id,
    `https://www.youtube.com/watch?v=${id}&t=42s`,
    `https://youtu.be/${id}?si=abc`,
    `youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}?start=5`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
  ].forEach((text) => assert.equal(tracking.parseYoutubeId(text), id, text));
  ["", null, "https://vimeo.com/123", "https://www.youtube.com/watch?v=short", "https://evil.com/watch?v=dQw4w9WgXcQ", "não é um link"]
    .forEach((text) => assert.equal(tracking.parseYoutubeId(text), null, String(text)));
});

test("video seek picks the part that covers the tracker time and applies its offsets", () => {
  const parts = [
    { youtubeId: "BBBBBBBBBBB", gameStartS: 1589.4, videoStartS: 0 },
    { youtubeId: "AAAAAAAAAAA", gameStartS: 0, videoStartS: 12 },
  ];
  assert.deepEqual(tracking.videoSeekTarget(parts, 100), { part: parts[1], seconds: 112 });
  assert.equal(tracking.videoSeekTarget(parts, 1600).part.youtubeId, "BBBBBBBBBBB");
  assert.equal(tracking.videoSeekTarget(parts, 1600).seconds, 10);
  assert.equal(tracking.videoSeekTarget(parts, 0).seconds, 12);
  assert.equal(tracking.videoSeekTarget([], 10), null);
  assert.equal(tracking.videoSeekTarget(parts, null), null);
});

test("video table keeps RLS: members read, only admins write", async () => {
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync(new URL("../supabase/video-migration.sql", import.meta.url), "utf8");
  assert.match(sql, /alter table public\.game_videos enable row level security/i);
  assert.match(sql, /revoke all on table public\.game_videos from public, anon/i);
  assert.match(sql, /for insert to authenticated\s+with check \(\(select public\.is_admin\(\)\)\)/i);
  assert.match(sql, /for update to authenticated\s+using \(\(select public\.is_admin\(\)\)\)\s+with check \(\(select public\.is_admin\(\)\)\)/i);
  assert.match(sql, /for delete to authenticated\s+using \(\(select public\.is_admin\(\)\)\)/i);
  assert.match(sql, /youtube_id text not null check \(youtube_id ~ '\^\[A-Za-z0-9_-\]\{11\}\$'\)/i);
  const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
  assert.match(schema, /create table if not exists public\.game_videos/i);
});

test("clock text becomes seconds; anything else is rejected", () => {
  assert.equal(tracking.parseClock(""), 0);
  assert.equal(tracking.parseClock("95"), 95);
  assert.equal(tracking.parseClock("26:29"), 1589);
  assert.equal(tracking.parseClock("1:02:03"), 3723);
  assert.equal(tracking.parseClock("12,5"), 12.5);
  ["abc", "1:75", "-3", "1::2"].forEach((s) => assert.equal(tracking.parseClock(s), null, s));
});

test("a part with an end has no video after it", () => {
  const parts = [{ youtubeId: "AAAAAAAAAAA", gameStartS: 0, videoStartS: 0, gameEndS: 1589.3 }];
  assert.equal(tracking.videoSeekTarget(parts, 1500).seconds, 1500);
  assert.equal(tracking.videoSeekTarget(parts, 1589.3), null);
  assert.equal(tracking.videoSeekTarget(parts, 2000), null);
});

test("top speed window is read from the result and is 1 s in older results", () => {
  assert.equal(tracking.parseResult(sample()).players[0].maxSustainedWindowS, 1);
  const data = sample();
  data.players.forEach((p) => { p.metrics.max_speed_sustained_window_s = 2; });
  assert.equal(tracking.parseResult(data).players[0].maxSustainedWindowS, 2);
});

test("vertical passes and possession are read when present and stay null in older files", () => {
  const old = tracking.parseResult(sample());
  assert.equal(old.players[0].verticalPasses, null);
  assert.equal(old.teams.A.verticalPasses, null);
  assert.equal(old.teams.A.possessionPct, null);
  assert.equal(tracking.teamFaceOff(old).A.possessionPct, null);   // "sem dados", not 0

  const data = sample();
  data.players[0].metrics.vertical_passes_detected = 4;
  data.players[1].metrics.vertical_passes_detected = 6;
  data.players[2].metrics.vertical_passes_detected = 9;            // keeper most of the time: not a highlight
  data.teams.A.vertical_passes = { count: 10, crossing_midline: 5, in_attacking_half: 3, in_own_half: 2, passes: 40, status: "detected" };
  data.teams.A.possession_pct = { value: 54.2, status: "estimate" };
  data.teams.B = { team_width_m: 8, possession_pct: { value: 45.8 } };
  data.metric_status = { vertical_passes: "detected", possession: "estimate" };
  data.ball = { audit: { vertical_passes: { correct: 19, judged: 19 }, possession: { same: 17, judged: 20 } } };
  const result = tracking.parseResult(data);
  assert.equal(result.players[1].verticalPasses, 6);
  assert.deepEqual(result.teams.A.verticalPasses, { count: 10, crossingMidline: 5, inAttackingHalf: 3, inOwnHalf: 2, passes: 40, status: "detected" });
  assert.deepEqual(result.teams.B.possessionPct, { value: 45.8, status: "estimate" });
  assert.equal(result.teams.B.verticalPasses, null);
  assert.deepEqual(result.ball.verticalAudit, { correct: 19, judged: 19 });
  assert.deepEqual(result.ball.possessionAudit, { same: 17, judged: 20 });
  assert.equal(tracking.statusTag(result, "vertical_passes"), "contagem incompleta");
  assert.equal(tracking.statusTag(result, "possession"), "estimativa");
  assert.deepEqual(tracking.gameHighlights(result).vertical, { value: 6, labels: ["MARQUES"] });
  const f = tracking.teamFaceOff(result);
  assert.equal(f.A.verticalPasses, 10);
  assert.equal(f.A.possessionPct, 54.2);
  assert.equal(f.B.verticalPasses, null);
});
