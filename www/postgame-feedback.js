(function universalModuleDefinition(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FooterPostgame = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createPostgameFeedbackRules() {
  const INTENSITY_SCALE = Object.freeze({
    key: "gameIntensity",
    question: "Intensidade do jogo: Velhinhos ou Champions?",
    anchors: Object.freeze({
      1: "Velhinhos",
      5: "Bom ritmo",
      10: "Champions",
    }),
  });

  const ENERGY_SCALE = Object.freeze({
    key: "remainingEnergy",
    question: "Morreste ou jogavas mais meia hora?",
    anchors: Object.freeze({
      1: "Morri",
      5: "Ainda dava uns minutos",
      10: "Mais meia hora facil",
    }),
  });

  const POSTGAME_SCALES = Object.freeze({
    intensity: INTENSITY_SCALE,
    energy: ENERGY_SCALE,
  });

  function isScaleValue(value) {
    return Number.isInteger(value) && value >= 1 && value <= 10;
  }

  function isCheckinRequired({
    hasVote = false,
    hasFeedback = false,
    isTransitionGame = false,
    isAfterRollout = false,
    isBeforeRollout = false,
  } = {}) {
    if (hasFeedback || isBeforeRollout) return false;
    if (isTransitionGame) return true;
    return Boolean(isAfterRollout);
  }

  function compareDates(left, right) {
    const leftTime = Date.parse(left.date);
    const rightTime = Date.parse(right.date);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return leftTime - rightTime;
    }

    const leftDate = String(left.date ?? "");
    const rightDate = String(right.date ?? "");
    if (leftDate < rightDate) return -1;
    if (leftDate > rightDate) return 1;
    return 0;
  }

  function sortPendingCheckins(checkins) {
    return [...checkins].sort((left, right) => {
      const dateOrder = compareDates(left, right);
      if (dateOrder !== 0) return dateOrder;

      const leftId = String(left.id ?? "");
      const rightId = String(right.id ?? "");
      if (leftId < rightId) return -1;
      if (leftId > rightId) return 1;
      return 0;
    });
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  // Respostas sem interesse em contribuir (2026-11-05). Regras simples e explicaveis:
  // - "longe dos colegas": intensidade a 4+ pontos da mediana das outras respostas (precisa de 4+ outras);
  // - "contra a corrida": o video diz que o jogo teve ritmo normal ou alto (>= habitual) e a resposta diz 1-2,
  //   ou ritmo baixo (<= 92% do habitual) e a resposta diz 9-10;
  // - "tudo no minimo": 1 e 1;
  // - "sempre a mesma resposta": a mesma pessoa deu a mesma resposta nos ultimos 4 jogos (row.repeated, vem da base de dados).
  // A intensidade nao conta com "longe dos colegas", "sempre a mesma resposta", ou "contra a corrida" + "tudo no minimo".
  // A forma (pessoal) so deixa de contar quando a resposta inteira e descartada ("tudo no minimo" + outro sinal).
  function assessGameFeedback(rows, { gamePace = null, usualPace = null } = {}) {
    const list = Array.isArray(rows) ? rows : [];
    const hasPace = Number.isFinite(gamePace) && Number.isFinite(usualPace) && usualPace > 0;
    return list.map((row) => {
      const intensity = Number(row.gameIntensity);
      const energy = Number(row.remainingEnergy);
      const others = list.filter((other) => other !== row).map((other) => Number(other.gameIntensity));
      const othersMedian = others.length >= 4 ? median(others) : null;
      const reasons = [];
      if (othersMedian != null && Math.abs(intensity - othersMedian) >= 4) reasons.push("far_from_group");
      if (hasPace && ((gamePace >= usualPace && intensity <= 2) || (gamePace <= usualPace * 0.92 && intensity >= 9))) reasons.push("against_running");
      if (intensity === 1 && energy === 1) reasons.push("all_minimum");
      if (row.repeated) reasons.push("repeated");
      const dropIntensity = reasons.includes("far_from_group") || reasons.includes("repeated")
        || (reasons.includes("against_running") && reasons.includes("all_minimum"));
      const dropAll = reasons.includes("all_minimum") && reasons.length > 1;
      return {
        id: row.id,
        playerId: row.playerId,
        intensityTrusted: !dropIntensity && !dropAll,
        energyTrusted: !dropAll,
        reasons,
        othersMedian,
      };
    });
  }

  return Object.freeze({
    assessGameFeedback,
    median,
    INTENSITY_SCALE,
    ENERGY_SCALE,
    POSTGAME_SCALES,
    isScaleValue,
    isCheckinRequired,
    sortPendingCheckins,
  });
});
