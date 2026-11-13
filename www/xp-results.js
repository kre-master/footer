(function exposeXpResults(root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterXP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createXpResults(root) {
  // Resultados do jogo (2026-11-13): ecra de EXP depois de cada jogo verificado, nivel da conta e itens ganhos.
  // Le so o reward_ledger da propria conta (RLS). Quem escreve e o servidor (rewards-items-migration.sql).
  // Curva: XP total para o nivel L = 30 (L-1)^2 + 70 (L-1), maximo 50 (igual a public.xp_level).

  const MAX_LEVEL = 50;
  const ORDER = ["response", "presence", "win", "draw", "loss", "mvp"];
  const LABELS = {
    presence: "Presença",
    win: "Vitória",
    draw: "Empate",
    loss: "Derrota",
    mvp: "MVP oficial",
    response: "Respondeste à convocatória",
  };
  const ACHIEVEMENTS = {
    r02: "Presença em campo",
    r04: "Vitórias",
    r06: "Invencível",
    r03: "Assiduidade",
    r07: "MVP",
    r12: "Responde sempre",
  };
  const RARITY = {
    common: "Comum", uncommon: "Especial", rare: "Raro", epic: "Épico", legendary: "Lendário", mythic: "Mítico",
  };
  const SLOTS = {
    camisola: "Camisola", calcoes: "Calções", meias: "Meias", chuteiras: "Chuteiras", bola: "Bola", galhardete: "Galhardete",
  };
  const BY_SX = new Set(["camisola", "calcoes"]);
  const ITEM_ROOT = "assets/avatar/cromo-classico/256/itens/";
  const SEEN_LIMIT = 400;

  function xpForLevel(level) {
    const l = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level))) - 1;
    return 30 * l * l + 70 * l;
  }

  function levelFromXp(xp) {
    let level = 1;
    while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) level += 1;
    return level;
  }

  function progress(xp) {
    const total = Math.max(0, Math.floor(xp || 0));
    const level = levelFromXp(total);
    const start = xpForLevel(level);
    const next = level >= MAX_LEVEL ? start : xpForLevel(level + 1);
    return { total, level, start, next, into: total - start, span: next - start, pct: next > start ? (total - start) / (next - start) : 1 };
  }

  function parseItem(itemId) {
    const m = /^gear-([a-z]+)-0([1-6])$/.exec(itemId || "");
    return m ? { id: itemId, slot: m[1], level: Number(m[2]) } : null;
  }

  function itemSrc(itemId, sx) {
    const item = parseItem(itemId);
    if (!item) return "";
    return `${ITEM_ROOT}${item.id}${BY_SX.has(item.slot) ? `-${sx === "f" ? "f" : "m"}` : ""}.webp`;
  }

  function lineFor(row) {
    const reason = String(row.reason || "");
    const ach = /^achievement:([a-z0-9]+):([1-6])$/.exec(reason);
    if (ach) {
      return {
        kind: "achievement",
        label: "Nova conquista",
        sub: `${ACHIEVEMENTS[ach[1]] || ach[1].toUpperCase()} · nível ${ach[2]}`,
        rarity: row.rarity || null,
        xp: row.status === "granted" ? row.xp || 0 : 0,
        held: row.status === "held",
        item: parseItem(row.item_id),
        order: 100 + Number(ach[2]),
      };
    }
    const idx = ORDER.indexOf(reason);
    return {
      kind: reason,
      label: LABELS[reason] || reason,
      sub: "",
      rarity: null,
      xp: row.status === "granted" ? row.xp || 0 : 0,
      held: row.status === "held",
      item: null,
      order: idx < 0 ? 50 : idx,
    };
  }

  // Agrupa as linhas novas por jogo. Um jogo com linhas ja vistas aparece como bonus (ex.: MVP 24 h depois).
  function pendingScreens(rows, seenIds) {
    const seen = new Set(seenIds || []);
    const byGame = new Map();
    for (const row of rows || []) {
      if (!row?.game_id || (row.status !== "granted" && row.status !== "held")) continue;
      if (!byGame.has(row.game_id)) byGame.set(row.game_id, []);
      byGame.get(row.game_id).push(row);
    }
    const screens = [];
    for (const [gameId, list] of byGame) {
      const fresh = list.filter((row) => !seen.has(row.id));
      if (!fresh.length) continue;
      const bonus = fresh.length < list.length;
      const lines = fresh.map(lineFor).sort((a, b) => a.order - b.order);
      const at = list.reduce((max, row) => (row.created_at > max ? row.created_at : max), "");
      screens.push({ gameId, bonus, lines, ids: fresh.map((row) => row.id), gained: lines.reduce((s, l) => s + l.xp, 0), at });
    }
    return screens.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  }

  function totalXp(rows) {
    return (rows || []).reduce((sum, row) => sum + (row?.status === "granted" ? Number(row.xp) || 0 : 0), 0);
  }

  // ---------- Estado e leitura ----------

  const state = { userId: null, rows: null, loading: null, games: new Map(), sx: "m" };

  function seenKey(userId) {
    return `footer-xp-seen:${userId}`;
  }

  function readSeen(userId) {
    try {
      const raw = root?.localStorage?.getItem(seenKey(userId));
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function markSeen(userId, ids) {
    try {
      const next = [...new Set([...readSeen(userId), ...ids])].slice(-SEEN_LIMIT);
      root?.localStorage?.setItem(seenKey(userId), JSON.stringify(next));
    } catch {
      // Sem armazenamento: o ecra volta a aparecer na proxima abertura, sem mais efeitos.
    }
  }

  async function load(ctx, force = false) {
    const userId = ctx?.user?.id || null;
    if (!ctx?.client || !userId) return null;
    if (state.userId !== userId) {
      state.userId = userId;
      state.rows = null;
      state.games = new Map();
    }
    if (state.rows && !force) return state.rows;
    if (state.loading) return state.loading;
    state.loading = (async () => {
      const { data, error } = await ctx.client
        .from("reward_ledger")
        .select("id, game_id, reason, xp, item_id, rarity, status, created_at")
        .eq("user_id", userId)
        .in("status", ["granted", "held"])
        .order("created_at", { ascending: true });
      if (error) return null;
      state.rows = data || [];
      const { data: avatar } = await ctx.client.from("avatar_profiles").select("silhouette").eq("user_id", userId).maybeSingle();
      state.sx = avatar?.silhouette === "f" ? "f" : "m";
      return state.rows;
    })();
    try {
      return await state.loading;
    } finally {
      state.loading = null;
    }
  }

  async function loadGame(ctx, gameId) {
    if (state.games.has(gameId)) return state.games.get(gameId);
    const { data } = await ctx.client.from("games").select("id, date, score_a, score_b").eq("id", gameId).maybeSingle();
    state.games.set(gameId, data || null);
    return data || null;
  }

  // ---------- Ecra ----------

  function esc(ctx, value) {
    return ctx?.escapeHtml ? ctx.escapeHtml(String(value ?? "")) : String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }

  function dateLabel(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "short" });
    } catch {
      return "";
    }
  }

  function resultOf(screen) {
    const kinds = new Set(screen.lines.map((l) => l.kind));
    if (kinds.has("win")) return ["Vitória", "win"];
    if (kinds.has("draw")) return ["Empate", "draw"];
    if (kinds.has("loss")) return ["Derrota", "loss"];
    if (screen.bonus) return ["Bónus", "bonus"];
    return ["Não jogaste", "none"];
  }

  function screenHtml(ctx, screen, game, startXp) {
    const [result, tone] = resultOf(screen);
    const score = game && game.score_a != null && game.score_b != null ? `${game.score_a}–${game.score_b}` : "";
    const p = progress(startXp);
    const lines = screen.lines.map((line, i) => `
      <li class="xpr-line" data-i="${i}" data-pending="1">
        <span class="xpr-lbl">${esc(ctx, line.label)}${line.rarity ? ` <span class="xpr-chip" data-rarity="${esc(ctx, line.rarity)}">${esc(ctx, RARITY[line.rarity] || line.rarity)}</span>` : ""}
          ${line.sub || line.held ? `<small>${esc(ctx, line.sub)}${line.held ? `${line.sub ? " · " : ""}em espera` : ""}</small>` : ""}</span>
        <span class="xpr-xp">+${line.xp}</span>
      </li>`).join("");
    const items = screen.lines.filter((l) => l.item && !l.held);
    return `
      <div class="xpr-card" role="document">
        <div class="xpr-head">
          <p class="xpr-eyebrow">${esc(ctx, screen.bonus ? `Bónus do jogo de ${dateLabel(game?.date)}` : dateLabel(game?.date))}</p>
          <div class="xpr-score"><span class="xpr-res" data-tone="${tone}">${esc(ctx, result)}</span><span class="xpr-num">${esc(ctx, score)}</span></div>
        </div>
        <ul class="xpr-lines">${lines}</ul>
        <div class="xpr-total"><span>Total</span><span class="xpr-t" data-total>+0 EXP</span></div>
        <div class="xpr-lvl">
          <div class="xpr-lvlrow"><span>Nível <b data-level>${p.level}</b></span><span data-into>${p.into} / ${p.span} EXP</span></div>
          <div class="xpr-bar" role="progressbar" aria-label="Progresso do nível" aria-valuemin="0" aria-valuemax="100"><div class="xpr-fill" data-fill style="width:${Math.round(p.pct * 100)}%"></div></div>
          <div class="xpr-levelup" data-levelup hidden></div>
        </div>
        ${items.length ? `<div class="xpr-items" data-items hidden>
          <p class="xpr-eyebrow">Itens</p>
          ${items.map((line) => `
            <div class="xpr-item" data-rarity="${esc(ctx, line.rarity || "common")}">
              <img src="${esc(ctx, itemSrc(line.item.id, state.sx))}" alt="" width="56" height="56" loading="lazy">
              <div><strong>${esc(ctx, SLOTS[line.item.slot] || line.item.slot)}</strong> <span class="xpr-chip" data-rarity="${esc(ctx, line.rarity || "common")}">${esc(ctx, RARITY[line.rarity] || "")}</span>
                <small>Nível ${line.item.level} · novo no cacifo</small></div>
              <button class="primary-btn xpr-equip" type="button" data-equip="${esc(ctx, line.item.id)}">Equipar</button>
            </div>`).join("")}
        </div>` : ""}
        <div class="xpr-foot">
          <button class="ghost-btn" type="button" data-replay>Repetir</button>
          <button class="primary-btn" type="button" data-close>Continuar</button>
        </div>
      </div>`;
  }

  function animate(host, screen, startXp, reduce) {
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, reduce ? 0 : ms));
    const fill = host.querySelector("[data-fill]");
    const setBar = (xp) => {
      const p = progress(xp);
      host.querySelector("[data-level]").textContent = p.level;
      host.querySelector("[data-into]").textContent = `${p.into} / ${p.span} EXP`;
      fill.style.width = `${Math.round(p.pct * 100)}%`;
      host.querySelector(".xpr-bar")?.setAttribute("aria-valuenow", String(Math.round(p.pct * 100)));
    };
    let acc = 0;
    host.querySelectorAll(".xpr-line").forEach((li, i) => later(() => {
      li.removeAttribute("data-pending");
      const before = startXp + acc;
      acc += screen.lines[i].xp;
      host.querySelector("[data-total]").textContent = `+${acc} EXP`;
      const after = startXp + acc;
      if (levelFromXp(after) > levelFromXp(before)) {
        fill.style.width = "100%";
        later(() => {
          fill.classList.add("xpr-instant");
          setBar(after);
          requestAnimationFrame(() => fill.classList.remove("xpr-instant"));
          const up = host.querySelector("[data-levelup]");
          up.textContent = `Subiu ao nível ${levelFromXp(after)}`;
          up.hidden = false;
          up.classList.remove("xpr-pop");
          void up.offsetWidth;
          up.classList.add("xpr-pop");
        }, 450);
      } else {
        setBar(after);
      }
    }, 400 + i * 600));
    later(() => { const items = host.querySelector("[data-items]"); if (items) items.hidden = false; }, 400 + screen.lines.length * 600 + 250);
    return () => timers.forEach(clearTimeout);
  }

  function overlay() {
    let host = root.document.querySelector("#xp-results");
    if (!host) {
      host = root.document.createElement("div");
      host.id = "xp-results";
      host.className = "xpr hidden";
      host.setAttribute("role", "dialog");
      host.setAttribute("aria-modal", "true");
      host.setAttribute("aria-label", "Resultados do jogo");
      root.document.body.appendChild(host);
    }
    return host;
  }

  async function show(ctx, screen, startXp) {
    const game = await loadGame(ctx, screen.gameId);
    const host = overlay();
    const reduce = Boolean(root.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    host.innerHTML = screenHtml(ctx, screen, game, startXp);
    host.classList.remove("hidden");
    let stop = animate(host, screen, startXp, reduce);
    return new Promise((resolve) => {
      const close = () => {
        stop();
        host.classList.add("hidden");
        host.innerHTML = "";
        host.removeEventListener("click", onClick);
        resolve();
      };
      const onClick = (event) => {
        const equip = event.target.closest("[data-equip]");
        if (equip) {
          close();
          ctx.onEquip?.(equip.dataset.equip);
          return;
        }
        if (event.target.closest("[data-close]")) close();
        if (event.target.closest("[data-replay]")) {
          stop();
          host.innerHTML = screenHtml(ctx, screen, game, startXp);
          stop = animate(host, screen, startXp, reduce);
        }
      };
      host.addEventListener("click", onClick);
      host.querySelector("[data-close]")?.focus();
    });
  }

  // Mostra, por ordem, os jogos com EXP ainda por ver. Chamado depois de entrar na app.
  async function checkNew(ctx) {
    const rows = await load(ctx, true);
    if (!rows || !rows.length || overlay().classList.contains("hidden") === false) return;
    const userId = ctx.user.id;
    const screens = pendingScreens(rows, readSeen(userId));
    if (!screens.length) return;
    let shownXp = totalXp(rows) - screens.reduce((s, sc) => s + sc.gained, 0);
    for (const screen of screens) {
      await show(ctx, screen, shownXp);
      shownXp += screen.gained;
      markSeen(userId, screen.ids);
    }
    ctx.onDone?.();
  }

  // Reabre o ultimo jogo (botao no cartao de nivel do Eu).
  async function showLast(ctx) {
    const rows = await load(ctx);
    if (!rows?.length) return;
    const screens = pendingScreens(rows, []);
    const last = screens[screens.length - 1];
    if (!last) return;
    await show(ctx, { ...last, bonus: false }, totalXp(rows) - last.gained);
  }

  // Cartao de nivel no topo do Eu. Fica vazio enquanto nao ha EXP.
  async function mountChip(container, ctx) {
    if (!container) return;
    const rows = await load(ctx);
    container.querySelector(".xpr-chipcard")?.remove();
    if (!rows || !rows.length) return;
    const p = progress(totalXp(rows));
    const card = root.document.createElement("button");
    card.type = "button";
    card.className = "xpr-chipcard";
    card.setAttribute("aria-label", `Nível ${p.level}, ${p.total} EXP. Ver o último jogo`);
    card.innerHTML = `
      <span class="xpr-chipcard-lvl">Nível <b>${p.level}</b></span>
      <span class="xpr-chipcard-bar"><span style="width:${Math.round(p.pct * 100)}%"></span></span>
      <span class="xpr-chipcard-xp">${p.total} EXP · ver o último jogo</span>`;
    card.addEventListener("click", () => showLast(ctx));
    container.prepend(card);
  }

  function reset() {
    state.userId = null;
    state.rows = null;
    state.games = new Map();
  }

  return {
    xpForLevel, levelFromXp, progress, parseItem, itemSrc, lineFor, pendingScreens, totalXp,
    checkNew, showLast, mountChip, reset,
  };
});
