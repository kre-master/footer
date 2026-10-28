(function exposePlayerInsights(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterInsights = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlayerInsightsApi() {
  // Metricas do tracking usadas no perfil. "status" e a chave em result.metricStatus.
  const METRICS = {
    distance: { status: "distance", label: "Distância", unit: "km" },
    pace: { status: "pace", label: "Ritmo", unit: "m/min" },
    maxSpeed: { status: "max_speed", label: "Velocidade máx.", unit: "km/h" },
    sprints: { status: "sprints", label: "Sprints", unit: "" },
    passes: { status: "passes", label: "Passes detetados", unit: "" },
  };

  const STATUS_TEXT = {
    measured: "medido",
    preliminary: "preliminar",
    indicative: "indicativo",
    detected: "detetado, sem auditoria",
    estimate: "estimativa",
  };

  function num(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  // Uma linha por jogo disputado no periodo. tracking e o jogador no resultado do tracker (ou null).
  function buildGameRow({ gameId, date, outcome = "open", mvp = false, tracking = null, metricStatus = {}, videoAvailable = false }) {
    const t = tracking || null;
    const minutes = num(t?.validMinutes);
    const distanceM = num(t?.distanceM);
    return {
      gameId,
      date,
      outcome,
      mvp: Boolean(mvp),
      tracked: Boolean(t),
      metricStatus: metricStatus || {},
      videoAvailable: Boolean(videoAvailable),
      minutes,
      distanceM,
      // Ritmo do jogo calculado aqui (distancia / minutos validos) para bater certo com o do periodo.
      pace: distanceM != null && minutes ? distanceM / minutes : null,
      maxSpeed: num(t?.maxSustainedKmh),
      maxSpeedAtS: num(t?.maxSustainedAtS),
      sprints: num(t?.sprints),
      passes: num(t?.passesMade),
      passesReceived: num(t?.passesReceived),
      goalkeeperMin: num(t?.goalkeeperMin),
      zoneSharePct: t?.zoneSharePct || null,
    };
  }

  function sumOf(rows, key) {
    const values = rows.map((row) => row[key]).filter((value) => value != null);
    return values.length ? { total: values.reduce((sum, value) => sum + value, 0), games: values.length } : { total: null, games: 0 };
  }

  // Estado mais fraco entre os jogos usados numa metrica (para o aviso de qualidade).
  const STATUS_RANK = ["measured", "detected", "preliminary", "indicative", "estimate"];
  function weakestOf(statuses) {
    return (statuses || [])
      .filter(Boolean)
      .sort((a, b) => STATUS_RANK.indexOf(b) - STATUS_RANK.indexOf(a))[0] || null;
  }

  function weakestStatus(rows, metric) {
    const key = METRICS[metric].status;
    return weakestOf(rows.map((row) => row.metricStatus?.[key]));
  }

  function summarize(rows, { teamGames = null } = {}) {
    const list = rows || [];
    const tracked = list.filter((row) => row.tracked);
    const distance = sumOf(tracked, "distanceM");
    // Ritmo do periodo = distancia total / minutos validos totais, so com jogos que tem os dois valores.
    const paceRows = tracked.filter((row) => row.distanceM != null && row.minutes);
    const paceDistance = paceRows.reduce((sum, row) => sum + row.distanceM, 0);
    const paceMinutes = paceRows.reduce((sum, row) => sum + row.minutes, 0);
    const speedRows = tracked.filter((row) => row.maxSpeed != null);
    const best = speedRows.reduce((top, row) => (!top || row.maxSpeed > top.maxSpeed ? row : top), null);
    const sprints = sumOf(tracked, "sprints");
    const passes = sumOf(tracked, "passes");
    const goalkeeper = sumOf(tracked, "goalkeeperMin");
    return {
      played: list.length,
      teamGames,
      wins: list.filter((row) => row.outcome === "win").length,
      draws: list.filter((row) => row.outcome === "draw").length,
      losses: list.filter((row) => row.outcome === "loss").length,
      mvps: list.filter((row) => row.mvp).length,
      trackedGames: tracked.length,
      minutes: sumOf(tracked, "minutes"),
      distance: { totalM: distance.total, games: distance.games, status: weakestStatus(tracked, "distance") },
      pace: {
        value: paceMinutes ? paceDistance / paceMinutes : null,
        games: paceRows.length,
        goalkeeperMin: goalkeeper.total,
        status: weakestStatus(tracked, "pace"),
      },
      maxSpeed: {
        value: best ? best.maxSpeed : null,
        gameId: best ? best.gameId : null,
        atS: best ? best.maxSpeedAtS : null,
        games: speedRows.length,
        status: weakestStatus(tracked, "maxSpeed"),
      },
      sprints: { total: sprints.total, games: sprints.games, status: weakestStatus(tracked, "sprints") },
      passes: { total: passes.total, games: passes.games, status: weakestStatus(tracked, "passes") },
    };
  }

  // Periodos: "month:AAAA-MM", "3m" (ultimos 90 dias), "season" (1 set - 31 ago) e "all".
  function periodRange(period, now = new Date()) {
    const value = String(period || "all");
    if (value.startsWith("month:")) {
      const [year, month] = value.slice(6).split("-").map(Number);
      return { from: new Date(year, month - 1, 1), to: new Date(year, month, 1), kind: "month" };
    }
    if (value === "3m") {
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      return { from, to: new Date(8.64e15), kind: "3m" };
    }
    if (value === "season") {
      const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: new Date(startYear, 8, 1), to: new Date(startYear + 1, 8, 1), kind: "season", startYear };
    }
    return { from: new Date(-8.64e15), to: new Date(8.64e15), kind: "all" };
  }

  function inPeriod(date, range) {
    const time = new Date(date).getTime();
    return Number.isFinite(time) && time >= range.from.getTime() && time < range.to.getTime();
  }

  function fmt(value, digits = 0) {
    return Number(value).toLocaleString("pt-PT", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function shortDate(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  // Um ou dois factos curtos, sem repetir os numeros dos cartoes e sem tirar conclusoes de forma fisica.
  function highlights(rows, summary) {
    const tracked = (rows || []).filter((row) => row.tracked && row.distanceM != null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const facts = [];
    if (tracked.length >= 2) {
      const prev = tracked[tracked.length - 2];
      const last = tracked[tracked.length - 1];
      const diffKm = (last.distanceM - prev.distanceM) / 1000;
      const diffMin = last.minutes != null && prev.minutes != null ? Math.round(last.minutes - prev.minutes) : null;
      if (Math.abs(diffKm) >= 0.05) {
        const minutesNote = diffMin && Math.abs(diffMin) >= 3
          ? `, com ${diffMin > 0 ? "mais" : "menos"} ${Math.abs(diffMin)} min observados`
          : "";
        facts.push(`No jogo de ${shortDate(last.date)} percorreste ${diffKm > 0 ? "mais" : "menos"} ${fmt(Math.abs(diffKm), 1)} km do que a ${shortDate(prev.date)}${minutesNote}.`);
      }
      if (last.pace != null && prev.pace != null) {
        const diffPace = last.pace - prev.pace;
        facts.push(Math.abs(diffPace) < 3
          ? `O ritmo foi parecido nos dois jogos (${fmt(prev.pace)} e ${fmt(last.pace)} m/min).`
          : `O ritmo passou de ${fmt(prev.pace)} para ${fmt(last.pace)} m/min.`);
      }
    } else if (tracked.length === 1) {
      const only = tracked[0];
      facts.push(`O jogo de ${shortDate(only.date)} foi o único analisado neste período${only.minutes ? `: ${fmt(only.minutes)} min observados` : ""}.`);
    }
    if (facts.length < 2 && summary && summary.teamGames && summary.played === summary.teamGames && summary.played > 1) {
      facts.push(`Estiveste nos ${summary.played} jogos do grupo neste período.`);
    }
    return facts.slice(0, 2);
  }

  function statusText(status) {
    return STATUS_TEXT[status] || null;
  }

  return { METRICS, buildGameRow, summarize, periodRange, inPeriod, highlights, statusText, weakestOf };
});
