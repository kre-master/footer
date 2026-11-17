(function exposePlacard(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterPlacard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlacard() {
  // Placard fisico (2026-11-17): o que a app mostra das sessoes do placard (supabase/scoreboard-migration.sql).
  // Uma sessao = um INICIO -> FIM. O servidor sugere o jogo; o admin confirma e so entao os golos entram no jogo.
  // Aqui so ha funcoes puras (HTML em texto); a ligacao ao Supabase fica em app.js.

  const RECENT_MS = 36 * 3600 * 1000; // sessoes por confirmar mostram-se ate 36 h
  const STALE_LIVE_MS = 3 * 3600 * 1000; // "ao vivo" sem noticias ha 3 h deixa de piscar

  function formatClock(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function sessionFromRow(row) {
    return {
      id: row.id,
      deviceId: row.device_id,
      startedAt: row.started_at || row.created_at || null,
      status: row.status,
      scoreA: Number(row.score_a) || 0,
      scoreB: Number(row.score_b) || 0,
      clockS: Number(row.clock_s) || 0,
      suggestedGameId: row.suggested_game_id || null,
      gameId: row.game_id || null,
      confirmedAt: row.confirmed_at || null,
      updatedAt: row.updated_at || row.created_at || null,
    };
  }

  function deviceFromRow(row) {
    return { id: row.id, name: row.name, active: Boolean(row.active), createdAt: row.created_at, lastSeenAt: row.last_seen_at || null };
  }

  function isLive(session, now = Date.now()) {
    if (!session || session.status !== "live") return false;
    const updated = Date.parse(session.updatedAt || session.startedAt || "");
    return Number.isFinite(updated) && now - updated < STALE_LIVE_MS;
  }

  // A sessao mais recente ligada a este jogo (confirmada).
  function sessionForGame(sessions, gameId) {
    return (sessions || [])
      .filter((session) => session.gameId && session.gameId === gameId)
      .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))[0] || null;
  }

  // Sessoes por confirmar, das mais recentes para as mais antigas.
  function pendingSessions(sessions, now = Date.now()) {
    return (sessions || [])
      .filter((session) => !session.gameId)
      .filter((session) => now - Date.parse(session.startedAt || session.updatedAt || 0) < RECENT_MS)
      .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  }

  // Ha alguma coisa que valha a pena ir buscar de novo daqui a pouco?
  function needsPolling(sessions, now = Date.now()) {
    return (sessions || []).some((session) => isLive(session, now));
  }

  function scoreText(session) {
    return `${session.scoreA}–${session.scoreB}`;
  }

  function statusText(session, now = Date.now()) {
    if (session.status === "finished") return "terminado";
    return isLive(session, now) ? `ao vivo · ${formatClock(session.clockS)}` : `parado em ${formatClock(session.clockS)}`;
  }

  function gameOptionLabel(game, formatDate) {
    return `${formatDate(game.date)}${game.status === "finished" ? " · terminado" : ""}`;
  }

  // Escolha do jogo para uma sessao (admin): aceitar a sugestao ou outro jogo do clube.
  function renderSessionConfirm(session, { games, escape, formatDate }) {
    const suggested = games.find((game) => game.id === session.suggestedGameId) || null;
    const options = games
      .slice()
      .sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(session.startedAt)) - Math.abs(Date.parse(b.date) - Date.parse(session.startedAt)))
      .slice(0, 12);
    return `
      <div class="placard-session" data-placard-session="${escape(session.id)}">
        <div class="club-row-text">
          <strong>Placard ${escape(scoreText(session))} · ${escape(statusText(session))}</strong>
          <small>Começou ${escape(formatDate(session.startedAt))}. ${suggested ? `Sugestão: jogo de ${escape(formatDate(suggested.date))}.` : "Sem jogo sugerido: escolhe um."}</small>
        </div>
        <div class="placard-session-actions">
          ${suggested ? `<button type="button" class="primary-btn" data-placard-confirm="${escape(session.id)}" data-game="${escape(suggested.id)}">É este jogo</button>` : ""}
          <select data-placard-pick="${escape(session.id)}" aria-label="Escolher outro jogo">
            <option value="">${suggested ? "Outro jogo…" : "Escolher jogo…"}</option>
            ${options.map((game) => `<option value="${escape(game.id)}">${escape(gameOptionLabel(game, formatDate))}</option>`).join("")}
          </select>
        </div>
      </div>`;
  }

  // Faixa no jogo: resultado do placard ao vivo (ou a sugestao, para o admin).
  function renderGameBanner(game, sessions, { isAdmin, games, escape, formatDate, now = Date.now() }) {
    const session = sessionForGame(sessions, game.id);
    if (session && (isLive(session, now) || session.status === "finished")) {
      return `
        <div class="placard-banner ${isLive(session, now) ? "live" : ""}" data-placard-banner>
          <span class="placard-dot" aria-hidden="true"></span>
          <strong>Placard ${escape(scoreText(session))}</strong>
          <span>${escape(statusText(session, now))}</span>
        </div>`;
    }
    if (!isAdmin) return "";
    const pending = pendingSessions(sessions, now).filter((item) => item.suggestedGameId === game.id || !item.suggestedGameId);
    if (!pending.length) return "";
    return `<div class="placard-banner pending" data-placard-banner>${pending.map((item) => renderSessionConfirm(item, { games, escape, formatDate })).join("")}</div>`;
  }

  // Bloco "Placard" em Clube (so admin): chaves, sessoes por confirmar.
  function renderClubSection({ devices, sessions, games, newKey, escape, formatDate, remote, now = Date.now() }) {
    if (remote === false) {
      return `<h4>Placard</h4><p class="hint">Falta aplicar supabase/scoreboard-migration.sql no Supabase.</p>`;
    }
    const pending = pendingSessions(sessions, now);
    return `
      <h4>Placard</h4>
      <p class="hint">O placard envia os botões para aqui. Cada jogo do placard tem de ser ligado a um jogo do clube; só depois os golos entram, já com o minuto.</p>
      ${newKey ? `
        <div class="placard-key" data-placard-key>
          <strong>Chave nova do placard</strong>
          <code>${escape(newKey)}</code>
          <small>Copia agora para o Raspberry Pi (ficheiro de configuração). Não volta a aparecer.</small>
          <button type="button" class="ghost-btn" data-placard-copy>Copiar</button>
        </div>` : ""}
      ${pending.length ? `<div class="club-list">${pending.map((session) => renderSessionConfirm(session, { games, escape, formatDate })).join("")}</div>` : ""}
      <div class="club-list">
        ${(devices || []).map((device) => `
          <div class="club-row">
            <div class="club-row-text"><strong>${escape(device.name)}</strong>
              <small>${device.active ? "ligado" : "desligado"} · ${device.lastSeenAt ? `visto ${escape(formatDate(device.lastSeenAt))}` : "ainda não enviou nada"}</small></div>
            <button type="button" class="ghost-btn ${device.active ? "danger" : ""}" data-placard-active="${escape(device.id)}" data-active="${device.active ? "0" : "1"}">${device.active ? "Desligar" : "Ligar"}</button>
          </div>`).join("")}
      </div>
      <form class="placard-new" data-placard-new>
        <input name="name" maxlength="60" placeholder="Nome do placard (ex.: Mala)" required>
        <button type="submit" class="ghost-btn">Criar chave</button>
      </form>`;
  }

  return {
    formatClock, sessionFromRow, deviceFromRow, isLive, sessionForGame, pendingSessions, needsPolling,
    renderGameBanner, renderClubSection, renderSessionConfirm,
  };
});
