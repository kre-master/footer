(function exposeFantasyLeague(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterFantasy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createFantasyLeagueApi() {
  // Liga Fantasia (liga de teste, 2026-11-11). O servidor joga as jornadas; aqui so se le e se
  // distribuem pontos. Atributos de fantasia: nunca aparecem no perfil nem nas estatisticas reais.
  const ATTRS = [
    { key: "shooting", label: "Remate" },
    { key: "speed", label: "Velocidade" },
    { key: "passing", label: "Passe" },
    { key: "dribbling", label: "Drible" },
    { key: "defending", label: "Defesa" },
    { key: "physical", label: "Físico" },
    { key: "goalkeeping", label: "Guarda-redes" },
  ];
  const POSITIONS = [
    { key: "GR", label: "Guarda-redes" },
    { key: "DEF", label: "Defesa" },
    { key: "MED", label: "Médio" },
    { key: "ATA", label: "Avançado" },
  ];
  const BASE = 40;
  const CAP = 75;

  function emptyBuild() {
    return Object.fromEntries(ATTRS.map((attr) => [attr.key, BASE]));
  }

  function pointsSpent(build) {
    return ATTRS.reduce((sum, attr) => sum + (Number(build?.[attr.key]) || BASE) - BASE, 0);
  }

  // Valida antes de enviar (o servidor volta a validar).
  function validateBuild(build, points, { base = BASE, cap = CAP } = {}) {
    for (const attr of ATTRS) {
      const value = Number(build?.[attr.key]);
      if (!Number.isInteger(value) || value < base || value > cap) return `${attr.label} fica entre ${base} e ${cap}.`;
    }
    const spent = pointsSpent(build);
    if (spent > points) return `Só tens ${points} pontos para distribuir.`;
    return null;
  }

  // Muda um atributo sem passar dos pontos nem dos limites. Devolve a construcao nova.
  function stepAttr(build, key, delta, points, { base = BASE, cap = CAP } = {}) {
    const next = { ...build };
    const value = (Number(next[key]) || base) + delta;
    if (value < base || value > cap) return build;
    next[key] = value;
    if (pointsSpent(next) > points) return build;
    return next;
  }

  function sortStandings(rows) {
    return [...(rows || [])].sort((a, b) =>
      b.points - a.points
      || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)
      || b.goals_for - a.goals_for
      || a.slot - b.slot);
  }

  // Ultima jornada jogada e proxima por jogar.
  function roundsSummary(fixtures) {
    const played = (fixtures || []).filter((f) => f.played_at);
    const pending = (fixtures || []).filter((f) => !f.played_at);
    const lastRound = played.length ? Math.max(...played.map((f) => f.round)) : null;
    const nextRound = pending.length ? Math.min(...pending.map((f) => f.round)) : null;
    return {
      lastRound,
      nextRound,
      last: played.filter((f) => f.round === lastRound),
      next: pending.filter((f) => f.round === nextRound),
      nextKickoff: pending.filter((f) => f.round === nextRound)[0]?.kickoff || null,
      totalRounds: (fixtures || []).length ? Math.max(...fixtures.map((f) => f.round)) : 0,
    };
  }

  function scorersLine(events, teamId) {
    const counts = new Map();
    (events || []).filter((e) => e.kind === "goal" && e.team_id === teamId).forEach((e) => {
      counts.set(e.player_name, (counts.get(e.player_name) || 0) + 1);
    });
    return [...counts.entries()].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(", ");
  }

  function formatKickoff(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  const state = { userId: undefined, build: null, position: "MED", name: "", points: 20, level: 1, message: "", busy: false };

  async function load(client, userId) {
    const { data: league, error: leagueError } = await client.from("fantasy_leagues")
      .select("id, name, season").eq("is_test", true).eq("status", "running").maybeSingle();
    if (leagueError) throw leagueError;
    if (!league) return { league: null };
    const [teams, players, fixtures, standings, profile, points] = await Promise.all([
      client.from("fantasy_teams").select("id, name, slot").eq("league_id", league.id),
      client.from("fantasy_players").select("id, team_id, user_id, ai_name, position").eq("league_id", league.id).is("left_at", null),
      client.from("fantasy_fixtures").select("id, round, home_team_id, away_team_id, kickoff, home_goals, away_goals, played_at").eq("league_id", league.id).order("round"),
      client.from("fantasy_standings").select("*").eq("league_id", league.id),
      userId ? client.from("fantasy_profiles").select("*").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
      userId ? client.rpc("fantasy_my_points") : Promise.resolve({ data: null }),
    ]);
    for (const result of [teams, players, fixtures, standings, profile, points]) if (result.error) throw result.error;
    const userIds = [...new Set((players.data || []).map((p) => p.user_id).filter(Boolean))];
    const names = userIds.length
      ? (await client.from("fantasy_profiles").select("user_id, display_name").in("user_id", userIds)).data || []
      : [];
    const summary = roundsSummary(fixtures.data);
    const lastIds = summary.last.map((f) => f.id);
    const events = lastIds.length
      ? (await client.from("fantasy_match_events").select("fixture_id, team_id, player_name, kind").in("fixture_id", lastIds).eq("kind", "goal")).data || []
      : [];
    return {
      league,
      teams: teams.data || [],
      players: players.data || [],
      fixtures: fixtures.data || [],
      standings: standings.data || [],
      profile: profile.data,
      points: Array.isArray(points.data) ? points.data[0] : points.data,
      names: new Map(names.map((n) => [n.user_id, n.display_name])),
      events,
      summary,
    };
  }

  function buildEditor(data, esc) {
    const build = state.build || emptyBuild();
    const left = state.points - pointsSpent(build);
    return `
      <div class="fantasy-build">
        <div class="fantasy-build-head">
          <label class="fantasy-field">Nome na liga
            <input type="text" maxlength="40" data-fantasy-name value="${esc(state.name)}">
          </label>
          <label class="fantasy-field">Posição
            <select data-fantasy-position>
              ${POSITIONS.map((p) => `<option value="${p.key}" ${p.key === state.position ? "selected" : ""}>${p.label}</option>`).join("")}
            </select>
          </label>
        </div>
        <p class="fantasy-points"><strong>${left}</strong> de ${state.points} pontos por distribuir · nível de conta ${state.level}</p>
        <div class="fantasy-attrs">
          ${ATTRS.map((attr) => `
            <div class="fantasy-attr">
              <span>${attr.label}</span>
              <button type="button" class="mini-btn" data-fantasy-step="${attr.key}" data-delta="-1" aria-label="Menos ${attr.label}">−</button>
              <strong>${build[attr.key]}</strong>
              <button type="button" class="mini-btn" data-fantasy-step="${attr.key}" data-delta="1" aria-label="Mais ${attr.label}">+</button>
              <span class="fantasy-bar" aria-hidden="true"><span style="width:${Math.round(((build[attr.key] - BASE) / (CAP - BASE)) * 100)}%"></span></span>
            </div>`).join("")}
        </div>
        <div class="actions">
          <button type="button" class="primary-btn" data-fantasy-save ${state.busy ? "disabled" : ""}>Guardar jogador</button>
          ${data.profile && !data.mine ? `<button type="button" class="ghost-btn" data-fantasy-join ${state.busy ? "disabled" : ""}>Entrar na liga de teste</button>` : ""}
          ${data.mine ? `<button type="button" class="ghost-btn" data-fantasy-leave ${state.busy ? "disabled" : ""}>Sair da liga</button>` : ""}
        </div>
        ${state.message ? `<p class="fantasy-message" role="status">${esc(state.message)}</p>` : ""}
        <p class="muted">Todos começam com 40 em tudo e 20 pontos; cada nível de conta dá mais 1. Quem foi a um jogo verificado nos 7 dias antes da jornada joga em forma (+2). Os itens ainda não dão bónus.</p>
      </div>`;
  }

  function renderHtml(data, esc, signedIn) {
    if (!data.league) return `<p class="empty-state">A liga de teste ainda não abriu.</p>`;
    const teamName = new Map(data.teams.map((t) => [t.id, t.name]));
    const mine = data.mine;
    const standings = sortStandings(data.standings);
    const s = data.summary;
    const result = (f) => `
      <li class="fantasy-fixture ${mine && (f.home_team_id === mine.team_id || f.away_team_id === mine.team_id) ? "is-mine" : ""}">
        <span>${esc(teamName.get(f.home_team_id))}</span>
        <strong>${f.played_at ? `${f.home_goals} – ${f.away_goals}` : "vs"}</strong>
        <span>${esc(teamName.get(f.away_team_id))}</span>
        ${f.played_at ? `<small>${esc([scorersLine(data.events.filter((e) => e.fixture_id === f.id), f.home_team_id), scorersLine(data.events.filter((e) => e.fixture_id === f.id), f.away_team_id)].filter(Boolean).join(" · "))}</small>` : ""}
      </li>`;
    const myTeam = mine ? data.players.filter((p) => p.team_id === mine.team_id) : [];
    return `
      <div class="panel-head">
        <div>
          <p class="eyebrow">Jogo simulado · não conta para as estatísticas reais</p>
          <h2>${esc(data.league.name)} · época ${data.league.season}</h2>
        </div>
      </div>
      ${signedIn ? `
        <section class="fantasy-section">
          <h3>O meu jogador</h3>
          ${mine ? `<p>Jogas no <strong>${esc(teamName.get(mine.team_id))}</strong>.</p>` : ""}
          ${buildEditor(data, esc)}
        </section>` : `<p class="empty-state">Entra na conta para criares o teu jogador.</p>`}
      ${mine ? `
        <section class="fantasy-section">
          <h3>${esc(teamName.get(mine.team_id))}</h3>
          <ul class="fantasy-squad">
            ${myTeam.map((p) => `<li><span class="fantasy-pos">${p.position}</span> ${p.user_id ? esc(data.names.get(p.user_id) || "Jogador") : `${esc(p.ai_name)} <span class="muted-pill">IA</span>`}</li>`).join("")}
          </ul>
        </section>` : ""}
      <section class="fantasy-section">
        <h3>Classificação</h3>
        <table class="fantasy-table">
          <thead><tr><th>#</th><th>Equipa</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GM-GS</th><th>Pts</th></tr></thead>
          <tbody>
            ${standings.map((row, i) => `
              <tr class="${mine && row.team_id === mine.team_id ? "is-mine" : ""}">
                <td>${i + 1}</td><td>${esc(row.name)}</td><td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td>
                <td>${row.goals_for}-${row.goals_against}</td><td><strong>${row.points}</strong></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </section>
      ${s.last.length ? `
        <section class="fantasy-section">
          <h3>Jornada ${s.lastRound} de ${s.totalRounds}</h3>
          <ul class="fantasy-fixtures">${s.last.map(result).join("")}</ul>
        </section>` : ""}
      ${s.next.length ? `
        <section class="fantasy-section">
          <h3>Próxima jornada: ${s.nextRound} · ${esc(formatKickoff(s.nextKickoff))}</h3>
          <ul class="fantasy-fixtures">${s.next.map(result).join("")}</ul>
        </section>` : ""}`;
  }

  async function render(container, { client, user, defaultName = "", escapeHtml }) {
    if (!container) return;
    const esc = escapeHtml || ((v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]));
    if (!client) {
      container.innerHTML = `<p class="empty-state">A liga precisa de ligação ao servidor.</p>`;
      return;
    }
    let data;
    try {
      data = await load(client, user?.id);
    } catch (error) {
      container.innerHTML = `<p class="empty-state">Não foi possível abrir a liga (${esc(error.message || error)}).</p>`;
      return;
    }
    if (state.userId !== (user?.id || null)) {
      reset();
      state.userId = user?.id || null;
    }
    data.mine = user ? data.players?.find((p) => p.user_id === user.id) : null;
    if (data.points) {
      state.points = data.points.points;
      state.level = data.points.account_level;
    }
    if (!state.build) {
      if (data.profile) {
        state.build = Object.fromEntries(ATTRS.map((a) => [a.key, data.profile[a.key]]));
        state.position = data.profile.position;
        state.name = data.profile.display_name;
      } else {
        state.build = emptyBuild();
        state.name = defaultName || "";
      }
    }
    paint(container, data, { client, user, defaultName, escapeHtml, esc });
  }

  function paint(container, data, ctx) {
    const { client, user, esc } = ctx;
    container.innerHTML = renderHtml(data, esc, Boolean(user));
    const reload = () => render(container, ctx);
    const repaint = () => paint(container, data, ctx);
    const run = async (fn, okMessage) => {
      state.busy = true;
      state.message = "";
      repaint();
      try {
        await fn();
        state.message = okMessage;
      } catch (error) {
        state.message = error.message || String(error);
      }
      state.busy = false;
      reload();
    };
    container.querySelectorAll("[data-fantasy-step]").forEach((button) => button.addEventListener("click", () => {
      state.build = stepAttr(state.build, button.dataset.fantasyStep, Number(button.dataset.delta), state.points);
      state.message = "";
      repaint();
    }));
    container.querySelector("[data-fantasy-position]")?.addEventListener("change", (event) => { state.position = event.target.value; });
    container.querySelector("[data-fantasy-name]")?.addEventListener("input", (event) => { state.name = event.target.value; });
    container.querySelector("[data-fantasy-save]")?.addEventListener("click", () => {
      const problem = validateBuild(state.build, state.points) || (state.name.trim() ? null : "Escolhe um nome para a liga.");
      if (problem) {
        state.message = problem;
        repaint();
        return;
      }
      run(async () => {
        const b = state.build;
        const { error } = await client.rpc("fantasy_save_profile", {
          p_display_name: state.name.trim(), p_position: state.position,
          p_shooting: b.shooting, p_speed: b.speed, p_passing: b.passing, p_dribbling: b.dribbling,
          p_defending: b.defending, p_physical: b.physical, p_goalkeeping: b.goalkeeping,
        });
        if (error) throw error;
      }, "Jogador guardado. As mudanças contam a partir da próxima jornada.");
    });
    container.querySelector("[data-fantasy-join]")?.addEventListener("click", () => run(async () => {
      const { error } = await client.rpc("fantasy_join_test_league");
      if (error) throw error;
    }, "Entraste na liga! Calhou-te uma equipa ao acaso."));
    container.querySelector("[data-fantasy-leave]")?.addEventListener("click", () => run(async () => {
      const { error } = await client.rpc("fantasy_leave_league");
      if (error) throw error;
    }, "Saíste da liga. Um jogador de IA fica com o teu lugar."));
  }

  function reset() {
    state.build = null;
    state.message = "";
  }

  return { ATTRS, POSITIONS, emptyBuild, pointsSpent, validateBuild, stepAttr, sortStandings, roundsSummary, scorersLine, formatKickoff, render, reset };
});
