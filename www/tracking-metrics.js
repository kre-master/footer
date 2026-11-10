(function exposeTracking(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterTracking = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTrackingApi() {
  // Local test of video tracking metrics (claude/tracking-teste, 2026-10-10).
  // Results of the tracker (footer.tracking-result.v1) are imported by file and kept only in this
  // browser; nothing is sent to Supabase. Labels from the video are linked to players.id by a person,
  // with the name only used to pre-fill the choice.
  const STORAGE_KEY = "footer-tracking-test-v1";
  const SCHEMA = "footer.tracking-result.v1";
  const MIN_MINUTES_FOR_HIGHLIGHT = 10;

  function normalizeLabel(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  // Time series per player (version 5+): metres and seen seconds per game minute, sprints with their moment,
  // and a path sampled every 2 s (tenths of a second and of a metre in the file).
  function parseTimeline(t) {
    if (!t || !Array.isArray(t.distance_m) || !Array.isArray(t.seen_s) || t.distance_m.length !== t.seen_s.length) return null;
    const points = Array.isArray(t.path?.points)
      ? t.path.points.filter((q) => Array.isArray(q) && q.length === 3 && q.every((v) => finite(v) != null)).map(([ts, x, y]) => [ts / 10, x / 10, y / 10])
      : [];
    return {
      distanceM: t.distance_m.map((v) => finite(v) ?? 0),
      seenS: t.seen_s.map((v) => finite(v) ?? 0),
      sprints: Array.isArray(t.sprints)
        ? t.sprints.filter((s) => Array.isArray(s) && s.length === 3).map(([start, end, kmh]) => ({ start, end, kmh }))
        : [],
      path: points,
    };
  }

  function verticalPasses(v) {
    if (!v || finite(v.count) == null) return null;
    return {
      count: v.count,
      crossingMidline: finite(v.crossing_midline),
      inAttackingHalf: finite(v.in_attacking_half),
      inOwnHalf: finite(v.in_own_half),
      passes: finite(v.passes),
      status: v.status || "detected",
    };
  }

  function parseResult(text) {
    let data;
    try {
      data = typeof text === "string" ? JSON.parse(text) : text;
    } catch {
      throw new Error("O ficheiro não é JSON válido.");
    }
    if (!data || data.schema_version !== SCHEMA) throw new Error(`Esperava um ficheiro ${SCHEMA}.`);
    if (!Array.isArray(data.players) || !data.players.length) throw new Error("O ficheiro não tem jogadores.");
    const players = data.players.map((p) => {
      const m = p.metrics || {};
      const time = m.time || {};
      if (!p.label && !p.player_id) throw new Error("Há um jogador sem nome nem ID no ficheiro.");
      const heat = m.heatmap && Array.isArray(m.heatmap.values_row_major) ? m.heatmap : null;
      return {
        label: String(p.label || p.player_id),
        playerId: p.player_id ? String(p.player_id) : null,
        team: p.team || null,
        identityStatus: p.identity_status || "proposed",
        automaticSharePct: finite(p.quality?.automatic_identity_share_pct),
        eligibleForAwards: p.quality?.eligible_for_awards === true,
        validMinutes: finite(time.valid_position_time_s) == null ? null : time.valid_position_time_s / 60,
        distanceM: finite(m.distance_observed_m),
        metersPerMin: finite(m.distance_per_valid_min_m),
        meanSpeedKmh: finite(m.mean_speed_kmh),
        maxSustainedKmh: finite(m.max_speed_sustained_kmh),
        maxSustainedAtS: Array.isArray(m.max_speed_sustained_interval_s) ? m.max_speed_sustained_interval_s[0] : null,
        // Window of the top speed: 1 s in results before 2026-10-12, 2 s after (short box jumps read too fast).
        maxSustainedWindowS: finite(m.max_speed_sustained_window_s) ?? 1,
        p95Kmh: finite(m.speed_p95_kmh),
        above15M: finite(m.distance_above_15_kmh_m),
        sprints: finite(m.sprint?.count),
        highRuns: finite(m.high_intensity_runs?.count),
        bandTimeS: Array.isArray(m.speed_band_time_s) ? m.speed_band_time_s.map(Number) : null,
        zoneSharePct: m.zone_share_pct || null,
        goalkeeperMin: finite(m.goalkeeper_time_s) == null ? null : m.goalkeeper_time_s / 60,
        lateRatio: finite(m.late_activity_ratio),
        periodMetersPerMin: Array.isArray(m.period_metrics) ? m.period_metrics.map((t) => finite(t.m_per_min)) : null,
        heatmap: heat ? { rows: heat.rows_y, cols: heat.cols_x, values: heat.values_row_major.map(Number) } : null,
        // Ball (revision 2+): only the audited pass metrics; absent in older results.
        passesMade: finite(m.passes_made_detected),
        passesReceived: finite(m.passes_received_detected),
        // Vertical passes (2026-11-10): detected count only; absent in older results.
        verticalPasses: finite(m.vertical_passes_detected),
        passPartner: m.top_pass_partner?.label ? { label: String(m.top_pass_partner.label), passes: finite(m.top_pass_partner.passes) } : null,
        meanPosition: Array.isArray(m.mean_position_m) && m.mean_position_m.length === 2 && m.mean_position_m.every((v) => finite(v) != null)
          ? { x: m.mean_position_m[0], y: m.mean_position_m[1] } : null,
        timeline: parseTimeline(p.timeline),
      };
    });
    const closest = data.closest_opponents || {};
    const pairs = Array.isArray(data.teammate_pairs) ? data.teammate_pairs : [];
    players.forEach((p) => {
      const c = (closest[p.label] || [])[0];
      p.rival = c ? { label: c.opponent, seconds: c.seconds_within_3m } : null;
      const mine = pairs.filter((x) => x.a === p.label || x.b === p.label).sort((x, y) => y.share_within_5m_pct - x.share_within_5m_pct)[0];
      p.partner = mine ? { label: mine.a === p.label ? mine.b : mine.a, sharePct: mine.share_within_5m_pct } : null;
    });
    const teams = {};
    Object.entries(data.teams || {}).forEach(([key, t]) => {
      teams[key] = {
        widthM: finite(t.team_width_m),
        depthM: finite(t.team_depth_m),
        compactnessM: finite(t.team_compactness_m),
        fromOwnGoalM: finite(t.centroid_distance_from_own_goal_m),
        attackingHalfPct: finite(t.territory_attacking_half_pct),
        ballAttackingThirdPct: finite(t.ball_attacking_third_pct),
        // Attacks are shown as a count estimate only (blind audit 7/11); lanes and "dangerous" are not shown.
        attacks: t.attacks && finite(t.attacks.count) != null ? { count: t.attacks.count, status: t.attacks.status || "estimate" } : null,
        // Vertical passes by where they happen (detected, counts by below) and possession share (estimate).
        verticalPasses: verticalPasses(t.vertical_passes),
        possessionPct: t.possession_pct && finite(t.possession_pct.value) != null
          ? { value: t.possession_pct.value, status: t.possession_pct.status || "estimate" } : null,
        perMinute: Array.isArray(t.per_minute) ? t.per_minute.map((r) => ({ minute: r.minute, fromOwnGoalM: r.centroid_from_own_goal_m, seconds: r.seconds })) : [],
      };
    });
    const b = data.ball;
    const ball = b && typeof b === "object" ? {
      coveragePct: finite(b.coverage_of_video_pct),
      middleThirdPct: finite(b.middle_third_pct),
      passesTotal: finite(b.passes_detected_total),
      passAudit: b.audit?.passes ? { correct: finite(b.audit.passes.correct), judged: finite(b.audit.passes.judged) } : null,
      verticalAudit: b.audit?.vertical_passes ? { correct: finite(b.audit.vertical_passes.correct), judged: finite(b.audit.vertical_passes.judged) } : null,
      possessionAudit: b.audit?.possession ? { same: finite(b.audit.possession.same), judged: finite(b.audit.possession.judged) } : null,
      // 3 x 3 grid of ball time: rows from the camera side outwards, columns from x = 0 (B's goal) to A's goal.
      zonesPct: Array.isArray(b.zones?.pct_row_major) && b.zones.pct_row_major.length === 9 ? b.zones.pct_row_major.map(Number) : null,
      passLinks: Array.isArray(b.pass_links)
        ? b.pass_links.filter((l) => l && l.from && l.to && finite(l.count) != null).map((l) => ({ from: String(l.from), to: String(l.to), count: l.count }))
        : [],
    } : null;
    return {
      schema: SCHEMA,
      ball,
      metricStatus: data.metric_status && typeof data.metric_status === "object" ? data.metric_status : {},
      durationS: finite(data.source?.video_duration_s),
      // Which goal each video team defends (x = 0 or x = 39.5), to name corridors from the attacker's side.
      ownGoalX: data.attack_direction ? { A: finite(data.attack_direction.team_A_own_goal_x_m), B: finite(data.attack_direction.team_B_own_goal_x_m) } : null,
      test: data.test === true || data.status !== "published",
      label: data.game_label || data.game_id || "jogo analisado",
      runId: data.run_id || null,
      createdAt: data.created_at || null,
      pitch: data.calibration ? { lengthM: data.calibration.length_m, widthM: data.calibration.width_m } : null,
      players,
      teams,
    };
  }

  function proposeMapping(labels, players) {
    const byName = new Map();
    (players || []).forEach((p) => {
      const key = normalizeLabel(p.name);
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(p.id);
    });
    const mapping = {};
    labels.forEach((label) => {
      const ids = byName.get(normalizeLabel(label)) || [];
      mapping[label] = ids.length === 1 ? ids[0] : null;
    });
    return mapping;
  }

  // A new revision keeps the associations already confirmed for the same video labels.
  function inheritMapping(labels, previous, proposed) {
    const mapping = { ...(proposed || {}) };
    labels.forEach((label) => {
      if (previous && previous[label]) mapping[label] = previous[label];
    });
    return mapping;
  }

  function mappingProblems(mapping) {
    const seen = new Map();
    const duplicates = [];
    Object.entries(mapping || {}).forEach(([label, id]) => {
      if (!id) return;
      if (seen.has(id)) duplicates.push([seen.get(id), label]);
      else seen.set(id, label);
    });
    const unmapped = Object.entries(mapping || {}).filter(([, id]) => !id).map(([label]) => label);
    return { duplicates, unmapped };
  }

  function eligibleForHighlights(p) {
    return (p.validMinutes ?? 0) >= MIN_MINUTES_FOR_HIGHLIGHT && (p.goalkeeperMin ?? 0) < (p.validMinutes ?? 0) / 2;
  }

  function topBy(players, key, filter = () => true) {
    const rows = players.filter((p) => finite(p[key]) != null && filter(p));
    if (!rows.length) return null;
    const best = Math.max(...rows.map((p) => p[key]));
    return { value: best, labels: rows.filter((p) => p[key] === best).map((p) => p.label) };
  }

  function gameHighlights(result) {
    const players = result.players;
    const keeper = players.filter((p) => (p.goalkeeperMin ?? 0) >= 3).sort((a, b) => b.goalkeeperMin - a.goalkeeperMin);
    return {
      motor: topBy(players, "metersPerMin", eligibleForHighlights),
      lightning: topBy(players, "maxSustainedKmh", eligibleForHighlights),
      sprinter: topBy(players, "sprints", eligibleForHighlights),
      distance: topBy(players, "distanceM", eligibleForHighlights),
      passer: topBy(players, "passesMade", eligibleForHighlights),
      vertical: topBy(players, "verticalPasses", (p) => eligibleForHighlights(p) && p.verticalPasses > 0),
      keepers: keeper.map((p) => ({ label: p.label, minutes: p.goalkeeperMin })),
    };
  }

  function teamHeatmap(result, team) {
    const maps = result.players.filter((p) => p.team === team && p.heatmap);
    if (!maps.length) return null;
    const { rows, cols } = maps[0].heatmap;
    const values = new Array(rows * cols).fill(0);
    maps.forEach((p) => {
      if (p.heatmap.rows !== rows || p.heatmap.cols !== cols) return;
      p.heatmap.values.forEach((v, i) => { values[i] += v; });
    });
    return { rows, cols, values };
  }

  function roleLabel(p) {
    if ((p.goalkeeperMin ?? 0) >= (p.validMinutes ?? 0) / 2) return "Guarda-redes";
    const z = p.zoneSharePct;
    if (!z) return null;
    if ((z.defensiva ?? 0) >= 50) return "Mais atrás";
    if ((z.ofensiva ?? 0) >= 35) return "Mais à frente";
    return "Box-to-box";
  }

  // Short, specific quality tags shown next to a metric (never one generic banner).
  const STATUS_TAGS = {
    preliminary: "preliminar", indicative: "indicativa", detected: "contagem incompleta",
    estimate: "estimativa",
  };

  function statusTag(result, key) {
    return STATUS_TAGS[result?.metricStatus?.[key]] || null;
  }

  // Passes between one player and each teammate, from the detected pass links (both directions).
  function passPartners(result, label) {
    const byPartner = new Map();
    (result?.ball?.passLinks || []).forEach((l) => {
      if (l.from !== label && l.to !== label) return;
      const other = l.from === label ? l.to : l.from;
      const row = byPartner.get(other) || { label: other, made: 0, received: 0, total: 0 };
      if (l.from === label) row.made += l.count; else row.received += l.count;
      row.total += l.count;
      byPartner.set(other, row);
    });
    return [...byPartner.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }

  // The game in thirds (same split as the tracker's period metrics), plus the whole game.
  function gamePeriods(result) {
    const total = result?.durationS;
    if (!total) return [];
    const third = total / 3;
    const mm = (s) => `${Math.round(s / 60)}′`;
    return [
      { key: 0, label: "Jogo todo", from: 0, to: total },
      { key: 1, label: `0–${mm(third)}`, from: 0, to: third },
      { key: 2, label: `${mm(third)}–${mm(2 * third)}`, from: third, to: 2 * third },
      { key: 3, label: `${mm(2 * third)}–${mm(total)}`, from: 2 * third, to: total },
    ];
  }

  // Totals of one period from the per-minute series; minutes are split pro rata at the period edges.
  function periodStats(p, from, to, totalS = Infinity) {
    const tl = p?.timeline;
    if (!tl) return null;
    let metres = 0, seen = 0;
    tl.distanceM.forEach((d, i) => {
      // The last minute of the game is shorter (e.g. 29 s): share by the minute's real length.
      const start = i * 60, end = Math.min((i + 1) * 60, totalS);
      const share = end > start ? Math.max(0, Math.min(to, end) - Math.max(from, start)) / (end - start) : 0;
      metres += d * share;
      seen += tl.seenS[i] * share;
    });
    const sprints = tl.sprints.filter((s) => s.start >= from && s.start < to);
    return {
      metres, seenMin: seen / 60, metersPerMin: seen >= 30 ? metres / (seen / 60) : null,
      sprints: sprints.length, peakKmh: sprints.length ? Math.max(...sprints.map((s) => s.kmh)) : null,
    };
  }

  // Facts behind the short automatic sentences; each one is null when the data do not support it.
  function storyFacts(result, p) {
    const facts = {};
    const tl = p?.timeline;
    if (tl) {
      let best = null;
      tl.distanceM.forEach((d, i) => {
        if (tl.seenS[i] >= 45) {
          const rate = d / (tl.seenS[i] / 60);
          if (!best || rate > best.metersPerMin) best = { minute: i + 1, metersPerMin: rate };
        }
      });
      facts.bestMinute = best;
    }
    facts.peakAtS = p?.maxSustainedAtS ?? null;
    const z = p?.zoneSharePct;
    const own = result?.ownGoalX?.[p?.team];
    if (z && own != null && z.corredor_perto != null && z.corredor_longe != null) {
      // Attacking towards x = 0, the camera side (y = 0) is on the left; towards x = 39.5 it is on the right.
      const near = own > 0 ? "esquerdo" : "direito";
      const far = own > 0 ? "direito" : "esquerdo";
      const lanes = [["central", z.corredor_centro ?? 0], [near, z.corredor_perto], [far, z.corredor_longe]].sort((a, b) => b[1] - a[1]);
      facts.lane = lanes[0][1] >= 40 ? { name: lanes[0][0], pct: lanes[0][1] } : null;
    }
    facts.lateChangePct = p?.lateRatio != null ? Math.round((p.lateRatio - 1) * 100) : null;
    facts.passPartner = p?.passPartner || null;
    return facts;
  }

  // Team comparison: values are null when there is nothing to compare ("sem dados", never 0).
  function teamFaceOff(result) {
    const out = {};
    Object.keys(result?.teams || {}).forEach((key) => {
      const team = result.teams[key];
      const mine = (result.players || []).filter((p) => p.team === key);
      const minutes = mine.reduce((s, p) => s + (p.validMinutes ?? 0), 0);
      const metres = mine.reduce((s, p) => s + (p.distanceM ?? 0), 0);
      const withPasses = mine.filter((p) => p.passesMade != null);
      out[key] = {
        metersPerPlayerMin: minutes > 0 ? metres / minutes : null,
        passes: withPasses.length ? withPasses.reduce((s, p) => s + p.passesMade, 0) : null,
        attacks: team.attacks ? team.attacks.count : null,
        verticalPasses: team.verticalPasses ? team.verticalPasses.count : null,
        possessionPct: team.possessionPct ? team.possessionPct.value : null,
        widthM: team.widthM,
        compactnessM: team.compactnessM,
      };
    });
    return out;
  }

  function speedBands(p) {
    if (!p.bandTimeS) return null;
    const total = p.bandTimeS.reduce((a, b) => a + b, 0);
    if (!total) return null;
    const names = ["Parado/andar", "Trote", "Corrida", "Rápido", "Sprint"];
    return p.bandTimeS.map((s, i) => ({ name: names[i], pct: (100 * s) / total }));
  }

  function rankIn(players, label, key) {
    const rows = players.filter((p) => finite(p[key]) != null).sort((a, b) => b[key] - a[key]);
    const i = rows.findIndex((p) => p.label === label);
    return i < 0 ? null : { position: i + 1, of: rows.length };
  }

  // Game video (YouTube «não listado»): only the 11-character video id is kept.
  function parseYoutubeId(text) {
    const s = String(text || "").trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    let url;
    try {
      url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
    let id = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] || null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  // "26:29", "1:02:03", "95" or "" (= 0) -> seconds; null when it is not a time.
  function parseClock(text) {
    const s = String(text ?? "").trim().replace(",", ".");
    if (!s) return 0;
    if (!/^\d+(\.\d+)?$|^\d+(:[0-5]?\d){1,2}$/.test(s)) return null;
    return s.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
  }

  // Tracker seconds -> which video part and which second of it. A time before the first part goes
  // to the start of the first one; a time after the end of its part (gameEndS) has no video.
  function videoSeekTarget(parts, gameSeconds) {
    const list = (parts || []).filter((v) => v?.youtubeId).sort((a, b) => a.gameStartS - b.gameStartS);
    if (!list.length || gameSeconds == null || !Number.isFinite(Number(gameSeconds))) return null;
    const t = Number(gameSeconds);
    const part = [...list].reverse().find((v) => t >= v.gameStartS) || list[0];
    if (part.gameEndS != null && t >= part.gameEndS) return null;
    return { part, seconds: Math.max(0, Math.floor(part.videoStartS + Math.max(0, t - part.gameStartS))) };
  }

  function loadStore(storage) {
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  function saveStore(storage, data) {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  return {
    STORAGE_KEY, SCHEMA, MIN_MINUTES_FOR_HIGHLIGHT,
    normalizeLabel, parseResult, proposeMapping, inheritMapping, mappingProblems, gameHighlights, teamHeatmap, roleLabel, speedBands, rankIn, statusTag, passPartners, teamFaceOff, gamePeriods, periodStats, storyFacts,
    parseYoutubeId, parseClock, videoSeekTarget,
    loadStore, saveStore,
  };
});
