(function exposeMonthReview(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterMonthReview = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMonthReviewApi() {
  // Revisao do mes: quando abre e que cartoes (slides) mostra. Sem DOM, para testar em Node.
  function monthStart(key) {
    const [year, month] = String(key).split("-").map(Number);
    return new Date(year, month - 1, 1);
  }

  function monthEnd(key) {
    const [year, month] = String(key).split("-").map(Number);
    return new Date(year, month, 1);
  }

  function previousKey(key) {
    const [year, month] = String(key).split("-").map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  // games: [{ date, finished, mvpClosed, closedAt }] com todos os jogos do grupo (fechados ou nao).
  // Abre quando o mes acabou e todos os jogos desse mes tem resultado e MVP fechado.
  function reviewStatus({ key, now = new Date(), games = [] }) {
    const from = monthStart(key).getTime();
    const to = monthEnd(key).getTime();
    const inMonth = games.filter((game) => {
      const time = new Date(game.date).getTime();
      return Number.isFinite(time) && time >= from && time < to;
    });
    if (!inMonth.length) return { ready: false, reason: "sem-jogos", readyAt: null };
    if (new Date(now).getTime() < to) return { ready: false, reason: "em-curso", readyAt: null };
    if (inMonth.some((game) => !game.finished)) return { ready: false, reason: "jogo-por-fechar", readyAt: null };
    if (inMonth.some((game) => !game.mvpClosed)) return { ready: false, reason: "mvp-por-fechar", readyAt: null };
    const closes = inMonth.map((game) => new Date(game.closedAt || game.date).getTime()).filter(Number.isFinite);
    return { ready: true, reason: null, readyAt: new Date(Math.max(to, ...closes)) };
  }

  function number(value, digits = 0) {
    return new Intl.NumberFormat("pt-PT", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value) || 0);
  }

  // "+1,2 km face a setembro"; vazio quando nao ha termo de comparacao ou a diferenca e pequena.
  function delta(current, previous, { unit, digits = 0, minimum = 0, monthLabel }) {
    if (current == null || previous == null || !monthLabel) return "";
    const diff = current - previous;
    if (Math.abs(diff) < Math.max(minimum, Math.pow(10, -digits) / 2)) return `Igual a ${monthLabel}`;
    return `${diff > 0 ? "+" : "-"}${number(Math.abs(diff), digits)}${unit ? ` ${unit}` : ""} face a ${monthLabel}`;
  }

  // data: ver getMonthReviewData em app.js. Devolve so os slides que tem dados.
  function buildSlides(data) {
    const t = data.tracked || {};
    const prev = data.previous || null;
    const prevName = prev ? prev.label : "";
    const slides = [];
    slides.push({ key: "cover", tone: "blue", eyebrow: data.playerName, title: data.monthTitle, caption: data.message });
    slides.push({
      key: "presence", tone: "green", eyebrow: "Presenças", big: String(data.played), unit: data.teamGames ? `de ${data.teamGames} jogos` : "jogos",
      caption: `${data.wins}V · ${data.draws}E · ${data.losses}D`,
      delta: prev ? delta(data.played, prev.played, { unit: "jogos", monthLabel: prevName }) : "",
    });
    if (data.mvps > 0) {
      slides.push({ key: "mvp", tone: "violet", eyebrow: "MVP", big: String(data.mvps), unit: data.mvps === 1 ? "vez eleito" : "vezes eleito", caption: "Escolhido pelos colegas." });
    }
    if (!t.games) {
      slides.push({ key: "no-video", tone: "slate", eyebrow: "Vídeo", title: "Sem jogos analisados", caption: "Os números de vídeo aparecem aqui quando um jogo teu for analisado." });
    } else {
      const caption = `${t.games} ${t.games === 1 ? "jogo analisado" : "jogos analisados"} de ${data.played}`;
      if (t.distanceKm != null) {
        slides.push({ key: "distance", tone: "blue", eyebrow: "Distância", big: number(t.distanceKm, 1), unit: "km", caption, status: t.status?.distance || null,
          delta: delta(t.distanceKm, prev?.distanceKm, { unit: "km", digits: 1, minimum: 0.1, monthLabel: prevName }) });
      }
      if (t.paceMpm != null) {
        slides.push({ key: "pace", tone: "teal", eyebrow: "Ritmo", big: number(t.paceMpm), unit: "m/min", caption, status: t.status?.pace || null,
          delta: delta(t.paceMpm, prev?.paceMpm, { unit: "m/min", minimum: 3, monthLabel: prevName }) });
      }
      if (t.maxSpeedKmh != null) {
        slides.push({ key: "speed", tone: "orange", eyebrow: "Velocidade máx.", big: number(t.maxSpeedKmh, 1), unit: "km/h", caption: "Aproximada, na melhor corrida do mês.", status: t.status?.maxSpeed || null,
          delta: delta(t.maxSpeedKmh, prev?.maxSpeedKmh, { unit: "km/h", digits: 1, minimum: 0.5, monthLabel: prevName }),
          action: t.moment ? { type: "moment", gameId: t.moment.gameId, atS: t.moment.atS, label: "Ver o momento" } : null });
      }
      if (t.sprints != null) {
        slides.push({ key: "sprints", tone: "coral", eyebrow: "Sprints", big: number(t.sprints), unit: t.sprints === 1 ? "sprint" : "sprints", caption, status: t.status?.sprints || null,
          delta: delta(t.sprints, prev?.sprints, { unit: "", monthLabel: prevName }) });
      }
      if (t.passes != null) {
        slides.push({ key: "passes", tone: "gold", eyebrow: "Passes detetados", big: number(t.passes), unit: "passes", caption, status: t.status?.passes || null,
          delta: delta(t.passes, prev?.passes, { unit: "", monthLabel: prevName }) });
      }
    }
    if (data.awards?.count > 0) {
      slides.push({ key: "awards", tone: "gold", eyebrow: "Cartas", big: String(data.awards.count), unit: data.awards.count === 1 ? "carta recebida" : "cartas recebidas",
        caption: data.awards.firstCount ? `${data.awards.firstCount} ${data.awards.firstCount === 1 ? "nova" : "novas"} pela primeira vez.` : "Todas repetidas este mês." });
    }
    if (data.effort?.calories) {
      const parts = [];
      if (data.effort.intensity != null) parts.push(`Jogo ${number(data.effort.intensity, 1)}/10`);
      if (data.effort.energy != null) parts.push(`forma sentida ${number(data.effort.energy, 1)}/10`);
      slides.push({ key: "effort", tone: "coral", eyebrow: "Esforço (só tu vês)", big: `≈ ${number(data.effort.calories)}`, unit: "kcal", caption: parts.join(" · ") || "Estimativa com o teu peso.", status: "estimate" });
    }
    slides.push({ key: "end", tone: "blue", eyebrow: "Até ao próximo mês", title: "Boa época!", caption: (data.facts || []).join(" ") || "Continua a aparecer.", action: { type: "profile", label: "Ver o meu perfil" } });
    return slides;
  }

  return { reviewStatus, buildSlides, previousKey, monthStart, monthEnd };
});
