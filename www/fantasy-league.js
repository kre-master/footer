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

  // Avatar Cromo classico (meia escala 256x512, ver assets/avatar/cromo-classico/256/manifesto.json).
  // Ainda nao ha aparencia por conta: reais usam os valores por omissao; IA tem aparencia ao calhas fixa pelo id.
  const AVATAR = {
    root: "assets/avatar/cromo-classico/256/",
    w: 256,
    h: 512,
    hair: {
      m: ["penteado-para-tras", "rapado", "encaracolado", "afro-curto", "comprido-apanhado"],
      f: ["coque", "rabo-de-cavalo-1", "rabo-de-cavalo-2", "rabo-de-cavalo-3", "curto-1", "curto-2", "curto-3", "curto-4",
        "encaracolado-solto-1", "encaracolado-solto-2", "encaracolado-solto-3", "encaracolado-solto-4",
        "trancas-1", "trancas-2", "trancas-3", "trancas-4"],
    },
    colors: ["preto", "castanho-escuro", "castanho", "ruivo", "loiro", "grisalho"],
    beards: ["sem", "bigode", "barba-por-fazer", "barba-curta", "pera"],
    // O que a IA pode sortear: só o aprovado pelo Jon (2026-11-11: todos os penteados, cores e barbas).
    get approved() {
      return { m: this.hair.m, f: this.hair.f, colors: this.colors, beards: this.beards };
    },
    defaults: { m: { tone: 4, hair: "penteado-para-tras", color: "castanho-escuro" }, f: { tone: 4, hair: "coque", color: "castanho-escuro" } },
    bust: { m: [81, 0, 209, 128], f: [64, 0, 192, 128] },
  };

  function hashString(value) {
    let h = 2166136261;
    for (const ch of String(value)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function pick(list, n) {
    return list[n % list.length];
  }

  // Linha de avatar_profiles (escolhida pelo jogador) -> aparencia; valores fora das listas caem no omissao.
  function fromProfileRow(row) {
    if (!row || (row.silhouette !== "m" && row.silhouette !== "f")) return null;
    const sx = row.silhouette;
    const d = AVATAR.defaults[sx];
    const tone = Number(row.skin_tone);
    const app = {
      sx,
      tone: tone >= 1 && tone <= 6 ? tone : d.tone,
      hair: AVATAR.hair[sx].includes(row.hair_style) ? row.hair_style : d.hair,
      color: AVATAR.colors.includes(row.hair_color) ? row.hair_color : d.color,
    };
    if (sx === "m") app.beard = AVATAR.beards.includes(row.facial_hair) ? row.facial_hair : "bigode";
    if (row.equipped && typeof row.equipped === "object" && !Array.isArray(row.equipped)) app.equipped = row.equipped;
    return app;
  }

  function appearanceFor(player, profile) {
    if (profile?.avatar) return profile.avatar;
    const own = fromProfileRow(profile);
    if (own) return own;
    if (player?.user_id || !player?.id) return { sx: "m", ...AVATAR.defaults.m };
    const h = hashString(player.id);
    const sx = h % 5 === 0 ? "f" : "m";
    return { sx, tone: 1 + ((h >>> 3) % 6), hair: pick(AVATAR.approved[sx], h >>> 7), color: pick(AVATAR.approved.colors, h >>> 13),
      ...(sx === "m" ? { beard: pick(AVATAR.approved.beards, h >>> 17) } : {}) };
  }

  // Itens equipados (avatar_profiles.equipped, slot -> "gear-<slot>-0N"): chave em falta = kit Cromo
  // classico de origem; null = tirado (nao se desenha). Camisola e calcoes tem versao por silhueta.
  const ITEM_SLOTS = ["camisola", "calcoes", "meias", "chuteiras", "bola", "galhardete"];
  const ITEM_BY_SX = new Set(["camisola", "calcoes"]);

  function slotLayer(slot, sx, equipped, fallback) {
    if (!equipped || !Object.prototype.hasOwnProperty.call(equipped, slot)) return fallback;
    const id = equipped[slot];
    if (id === null) return null;
    if (typeof id !== "string" || !new RegExp(`^gear-${slot}-0[1-6]$`).test(id)) return fallback;
    return { ...fallback, src: `itens/${id}${ITEM_BY_SX.has(slot) ? `-${sx}` : ""}.webp` };
  }

  function avatarLayers(app) {
    const sx = app.sx === "f" ? "f" : "m";
    const eq = app.equipped;
    const layers = [
      slotLayer("galhardete", sx, eq, { src: "kit/galhardete.webp", box: [197, 70, 43, 55] }),
      { src: `bases/${sx}-pele-${app.tone}.webp` },
      slotLayer("meias", sx, eq, { src: "kit/meias.webp" }),
      slotLayer("chuteiras", sx, eq, { src: "kit/chuteiras.webp" }),
      slotLayer("calcoes", sx, eq, { src: `kit/${sx}-calcoes.webp` }),
      slotLayer("camisola", sx, eq, { src: `kit/${sx}-camisola.webp` }),
    ];
    const beard = sx === "m" ? app.beard || "bigode" : "sem";
    if (beard !== "sem") layers.push({ src: `barba/m-${beard}-${app.beardColor || app.color}.webp` });
    if (!(sx === "m" && app.hair === "rapado")) layers.push({ src: `cabelo/${sx}-${app.hair}-${app.color}.webp` });
    layers.push(slotLayer("bola", sx, eq, { src: "kit/bola.webp", box: [212, 462, 40, 40] }));
    return layers.filter(Boolean);
  }

  // width = largura do corpo inteiro em px; bust = recorte quadrado da cabeca com esse lado em px.
  function avatarHtml(app, { width = 128, bust = 0 } = {}) {
    const sx = app.sx === "f" ? "f" : "m";
    const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;
    // No busto da carta nao entram bola nem galhardete (camadas pequenas com caixa).
    const imgs = avatarLayers(app).filter((l) => !(bust === "fluid" && l.box)).map((l) => {
      const style = l.box
        ? `left:${pct(l.box[0], AVATAR.w)};top:${pct(l.box[1], AVATAR.h)};width:${pct(l.box[2], AVATAR.w)};height:${pct(l.box[3], AVATAR.h)}`
        : "left:0;top:0;width:100%;height:100%";
      return `<img src="${AVATAR.root}${l.src}" alt="" loading="lazy" decoding="async" style="${style}">`;
    }).join("");
    if (bust === "fluid") {
      // Enche o contentor: a largura do busto = largura do contentor; o peito fica por baixo, cortado.
      const [x0, , x1] = AVATAR.bust[sx];
      const k = AVATAR.w / (x1 - x0);
      return `<span class="fantasy-avatar-fluid" aria-hidden="true"><span class="fantasy-avatar" style="width:${(k * 100).toFixed(2)}%;left:${(-(x0 / (x1 - x0)) * 100).toFixed(2)}%">${imgs}</span></span>`;
    }
    if (bust) {
      const [x0, y0, x1] = AVATAR.bust[sx];
      const scale = bust / (x1 - x0);
      return `<span class="fantasy-avatar-bust" style="width:${bust}px;height:${bust}px" aria-hidden="true"><span class="fantasy-avatar" style="width:${AVATAR.w * scale}px;height:${AVATAR.h * scale}px;left:${-x0 * scale}px;top:${-y0 * scale}px">${imgs}</span></span>`;
    }
    return `<span class="fantasy-avatar is-full" style="width:${width}px;height:${width * 2}px" aria-hidden="true">${imgs}</span>`;
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
    // Sem a tabela (migracao por aplicar) fica foto.
    const cardPref = userId ? await client.from("card_preferences").select("portrait").eq("user_id", userId).maybeSingle() : { data: null };
    const userIds = [...new Set((players.data || []).map((p) => p.user_id).filter(Boolean))];
    const names = userIds.length
      ? (await client.from("fantasy_profiles").select("user_id, display_name").in("user_id", userIds)).data || []
      : [];
    const avatarIds = [...new Set([...userIds, userId].filter(Boolean))];
    const avatarRows = avatarIds.length
      ? await client.from("avatar_profiles").select("user_id, silhouette, skin_tone, hair_style, hair_color, facial_hair, equipped").in("user_id", avatarIds)
      : { data: [] };
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
      avatars: new Map((avatarRows.error ? [] : avatarRows.data || []).map((r) => [r.user_id, r])),
      events,
      summary,
      cardPortrait: cardPref?.error ? null : (cardPref?.data?.portrait || "photo"),
    };
  }

  function buildEditor(data, esc) {
    const build = state.build || emptyBuild();
    const left = state.points - pointsSpent(build);
    return `
      <div class="fantasy-build">
        <div class="fantasy-me">
          ${avatarHtml(appearanceFor(data.mine || { user_id: "me" }, data.avatars?.get(state.userId)), { width: 112 })}
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
        ${data.cardPortrait ? `<div class="fantasy-portrait" role="group" aria-label="Retrato na carta">
          <span>Na tua carta:</span>
          <button type="button" class="mini-btn ${data.cardPortrait === "photo" ? "is-on" : ""}" data-fantasy-portrait="photo" aria-pressed="${data.cardPortrait === "photo"}">Foto</button>
          <button type="button" class="mini-btn ${data.cardPortrait === "avatar" ? "is-on" : ""}" data-fantasy-portrait="avatar" aria-pressed="${data.cardPortrait === "avatar"}">Avatar</button>
        </div>` : ""}
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
            ${myTeam.map((p) => `<li>${avatarHtml(appearanceFor(p, p.user_id ? data.avatars?.get(p.user_id) : null), { bust: 40 })}<span class="fantasy-pos">${p.position}</span> ${p.user_id ? esc(data.names.get(p.user_id) || "Jogador") : `${esc(p.ai_name)} <span class="muted-pill">IA</span>`}</li>`).join("")}
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

  async function render(container, { client, user, defaultName = "", escapeHtml, onCardPortrait }) {
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
    paint(container, data, { client, user, defaultName, escapeHtml, esc, onCardPortrait });
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
    container.querySelectorAll("[data-fantasy-portrait]").forEach((button) => button.addEventListener("click", () => run(async () => {
      const portrait = button.dataset.fantasyPortrait;
      const { error } = await client.from("card_preferences").upsert({ user_id: user.id, portrait, updated_at: new Date().toISOString() });
      if (error) throw error;
      ctx.onCardPortrait?.(user.id, portrait);
    }, button.dataset.fantasyPortrait === "avatar" ? "A tua carta passa a mostrar o avatar." : "A tua carta volta a mostrar a foto.")));
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

  return { AVATAR, ITEM_SLOTS, fromProfileRow, appearanceFor, avatarLayers, avatarHtml, ATTRS, POSITIONS, emptyBuild, pointsSpent, validateBuild, stepAttr, sortStandings, roundsSummary, scorersLine, formatKickoff, render, reset };
});
