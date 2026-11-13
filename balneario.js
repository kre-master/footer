(function exposeBalneario(root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterBalneario = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createBalneario(root) {
  // Balneario (2026-11-12): cada conta escolhe a aparencia do avatar Cromo classico.
  // Guarda em avatar_profiles via rpc set_avatar_profile. As listas vem de FooterFantasy.AVATAR.
  const SKIN = ["#fee3cf", "#fccdab", "#f2b17e", "#d78752", "#bb7845", "#7b543b"];
  const HAIR_SWATCH = {
    preto: "#1e1a1a", "castanho-escuro": "#3d2616", castanho: "#6e4426",
    ruivo: "#b2502a", loiro: "#d8b46a", grisalho: "#b4b0aa",
  };
  const LABELS = {
    "penteado-para-tras": "Para trás", rapado: "Rapado", encaracolado: "Encaracolado", "afro-curto": "Afro curto",
    "comprido-apanhado": "Apanhado", coque: "Coque", "rabo-de-cavalo": "Rabo-de-cavalo", curto: "Curto",
    "encaracolado-solto": "Caracóis", trancas: "Tranças",
    sem: "Sem", bigode: "Bigode", "barba-por-fazer": "Por fazer", "barba-curta": "Barba curta", pera: "Pera",
    preto: "Preto", "castanho-escuro": "Castanho-escuro", castanho: "Castanho", ruivo: "Ruivo", loiro: "Loiro", grisalho: "Grisalho",
  };

  function label(key) {
    if (LABELS[key]) return LABELS[key];
    const m = /^(.*)-(\d)$/.exec(key || "");
    return m && LABELS[m[1]] ? `${LABELS[m[1]]} ${m[2]}` : key;
  }

  function avatarApi() {
    return root?.FooterFantasy || null;
  }

  // Aparencia de partida: a linha guardada ou a de omissao.
  function initialChoice(row, A = avatarApi()?.AVATAR) {
    const fromRow = avatarApi()?.fromProfileRow?.(row);
    if (fromRow) return { ...fromRow };
    return { sx: "m", ...A.defaults.m, beard: "bigode" };
  }

  // Muda uma opcao e mantem a combinacao valida (penteado da silhueta certa, barba so no masculino).
  function applyChoice(choice, key, value, A = avatarApi()?.AVATAR) {
    const next = { ...choice };
    if (key === "sx") {
      if (value !== "m" && value !== "f") return choice;
      if (value === choice.sx) return choice;
      const d = A.defaults[value];
      next.sx = value;
      next.hair = d.hair;
      if (value === "m") next.beard = "bigode";
      else delete next.beard;
      return next;
    }
    if (key === "tone") {
      const tone = Number(value);
      if (!(tone >= 1 && tone <= 6)) return choice;
      next.tone = tone;
      return next;
    }
    if (key === "hair") return A.hair[choice.sx].includes(value) ? { ...next, hair: value } : choice;
    if (key === "color") return A.colors.includes(value) ? { ...next, color: value } : choice;
    if (key === "beard") return choice.sx === "m" && A.beards.includes(value) ? { ...next, beard: value } : choice;
    return choice;
  }

  function rpcArgs(choice) {
    return {
      p_silhouette: choice.sx,
      p_skin_tone: choice.tone,
      p_hair_style: choice.hair,
      p_hair_color: choice.color,
      p_facial_hair: choice.sx === "m" ? choice.beard || "sem" : "sem",
    };
  }

  function sameChoice(a, b) {
    return JSON.stringify(rpcArgs(a)) === JSON.stringify(rpcArgs(b));
  }

  // ---------------------------------------------------------------------------
  // Cacifo: itens vestidos (slot -> id; chave em falta = kit de origem; null = tirado) e kits guardados.
  // Os itens sao de teste: todas as contas podem vestir qualquer um (2026-11-13).
  // ---------------------------------------------------------------------------

  const SLOTS = [
    { key: "camisola", label: "Camisola" }, { key: "calcoes", label: "Calções" }, { key: "meias", label: "Meias" },
    { key: "chuteiras", label: "Chuteiras" }, { key: "bola", label: "Bola" }, { key: "galhardete", label: "Galhardete" },
  ];
  const TIERS = ["Common", "Special", "Rare", "Epic", "Legendary", "Mythic"];
  const MAX_KITS = 8;
  const itemId = (slot, n) => `gear-${slot}-0${n}`;

  function cleanEquipped(eq) {
    const out = {};
    if (!eq || typeof eq !== "object" || Array.isArray(eq)) return out;
    for (const { key } of SLOTS) {
      if (!Object.prototype.hasOwnProperty.call(eq, key)) continue;
      const v = eq[key];
      if (v === null || (typeof v === "string" && new RegExp(`^gear-${key}-0[1-6]$`).test(v))) out[key] = v;
    }
    return out;
  }

  // value: "origem" (apaga a chave), "nenhum" (null) ou o id do item.
  function setSlot(eq, slot, value) {
    if (!SLOTS.some((x) => x.key === slot)) return cleanEquipped(eq);
    const next = cleanEquipped(eq);
    if (value === "origem") delete next[slot];
    else if (value === "nenhum" || value === null) next[slot] = null;
    else if (typeof value === "string" && new RegExp(`^gear-${slot}-0[1-6]$`).test(value)) next[slot] = value;
    return next;
  }

  function clearAll() {
    return Object.fromEntries(SLOTS.map(({ key }) => [key, null]));
  }

  function sameEquipped(a, b) {
    const x = cleanEquipped(a), y = cleanEquipped(b);
    return SLOTS.every(({ key }) => (key in x ? x[key] : undefined) === (key in y ? y[key] : undefined));
  }

  function cleanKits(kits) {
    if (!Array.isArray(kits)) return [];
    return kits
      .filter((k) => k && typeof k.nome === "string" && k.nome.trim())
      .slice(0, MAX_KITS)
      .map((k) => ({ nome: k.nome.trim().slice(0, 24), equipped: cleanEquipped(k.equipped) }));
  }

  function addKit(kits, eq) {
    const list = cleanKits(kits);
    if (list.length >= MAX_KITS) return list;
    let n = list.length + 1;
    while (list.some((k) => k.nome === `Kit ${n}`)) n += 1;
    return [...list, { nome: `Kit ${n}`, equipped: cleanEquipped(eq) }];
  }

  function removeKit(kits, index) {
    return cleanKits(kits).filter((_, i) => i !== index);
  }

  function cacifoArgs(eq, kits) {
    return { p_equipped: cleanEquipped(eq), p_kits: cleanKits(kits) };
  }

  function slotValue(eq, slot) {
    if (!eq || !Object.prototype.hasOwnProperty.call(eq, slot)) return "origem";
    return eq[slot] === null ? "nenhum" : eq[slot];
  }

  // ---------------------------------------------------------------------------
  // DOM
  // ---------------------------------------------------------------------------

  const state = { userId: undefined, saved: null, choice: null, busy: false, message: "",
    cacifo: false, eq: {}, savedEq: {}, kits: [], savedKits: [], slot: "camisola" };

  function optionButton(key, value, current, inner, text) {
    const on = String(current) === String(value);
    return `<button type="button" class="balneario-opt ${on ? "is-on" : ""}" data-balneario="${key}" data-value="${value}" aria-pressed="${on}" title="${text}">${inner}<span class="balneario-opt-label">${text}</span></button>`;
  }

  function itemTile(slot, value, current) {
    const on = current === value;
    const isTier = value !== "origem" && value !== "nenhum";
    const n = isTier ? Number(value.slice(-1)) : 0;
    const text = value === "origem" ? "Cromo clássico" : value === "nenhum" ? "Nenhum" : TIERS[n - 1];
    const icon = isTier
      ? `<img src="assets/avatar/cromo-classico/256/itens/ico-${value}.webp" alt="" width="40" height="40" loading="lazy">`
      : `<span class="balneario-none" aria-hidden="true">${value === "nenhum" ? "∅" : "★"}</span>`;
    return `<button type="button" class="balneario-opt ${on ? "is-on" : ""}" data-cacifo-item="${value}" aria-pressed="${on}" title="${text}">${icon}<span class="balneario-opt-label">${text}</span></button>`;
  }

  function cacifoHtml(esc) {
    if (!state.cacifo) {
      return `<p class="muted">O cacifo abre quando a base de dados estiver atualizada.</p>`;
    }
    if (!state.saved) {
      return `<p class="muted">Guarda primeiro a aparência para abrires o cacifo.</p>`;
    }
    const dirty = !sameEquipped(state.eq, state.savedEq) || JSON.stringify(cleanKits(state.kits)) !== JSON.stringify(cleanKits(state.savedKits));
    const cur = slotValue(state.eq, state.slot);
    const options = ["origem", "nenhum", ...TIERS.map((_, i) => itemId(state.slot, i + 1))];
    return `
      <fieldset class="balneario-group">
        <legend>Cacifo</legend>
        <div class="balneario-row" role="tablist">
          ${SLOTS.map(({ key, label: l }) => {
            const v = slotValue(state.eq, key);
            const tag = v === "origem" ? "" : v === "nenhum" ? " · —" : ` · ${TIERS[Number(v.slice(-1)) - 1]}`;
            return `<button type="button" role="tab" class="balneario-opt ${key === state.slot ? "is-on" : ""}" data-cacifo-slot="${key}" aria-selected="${key === state.slot}">${l}<span class="balneario-opt-label">${esc(tag)}</span></button>`;
          }).join("")}
        </div>
        <div class="balneario-grid">${options.map((v) => itemTile(state.slot, v, cur)).join("")}</div>
      </fieldset>
      <fieldset class="balneario-group">
        <legend>Kits guardados</legend>
        <div class="balneario-row">
          ${cleanKits(state.kits).map((k, i) => `<span class="balneario-kit"><button type="button" class="balneario-opt" data-cacifo-kit="${i}" title="Vestir ${esc(k.nome)}">${esc(k.nome)}</button><button type="button" class="balneario-kit-del" data-cacifo-kit-del="${i}" aria-label="Apagar ${esc(k.nome)}">×</button></span>`).join("") || `<span class="muted">Ainda sem kits.</span>`}
        </div>
        <div class="actions">
          <button type="button" class="ghost-btn" data-cacifo-kit-save ${cleanKits(state.kits).length >= MAX_KITS ? "disabled" : ""}>Guardar kit</button>
          <button type="button" class="ghost-btn" data-cacifo-clear>Tirar tudo</button>
        </div>
      </fieldset>
      <div class="actions">
        <button type="button" class="primary-btn" data-cacifo-save ${state.busy || !dirty ? "disabled" : ""}>${dirty ? "Guardar cacifo" : "Cacifo guardado"}</button>
        ${dirty ? `<button type="button" class="ghost-btn" data-cacifo-undo ${state.busy ? "disabled" : ""}>Desfazer</button>` : ""}
      </div>
      <p class="muted">Itens de teste: podes vestir qualquer um. Quando houver inventário, só os que tiveres ganho.</p>`;
  }

  function html(esc) {
    const F = avatarApi();
    const A = F.AVATAR;
    const c = state.choice;
    const bust = (over) => F.avatarHtml({ ...c, ...over }, { bust: 56 });
    const dirty = !state.saved || !sameChoice(c, state.saved);
    const worn = { ...c, equipped: state.eq };
    return `
      <div class="panel-head">
        <div>
          <p class="eyebrow">Balneário</p>
          <h2>A tua aparência</h2>
        </div>
      </div>
      <div class="balneario">
        <div class="balneario-stage">
          ${F.avatarHtml(worn, { width: 128 })}
          ${F.avatarHtml(worn, { bust: 64 })}
        </div>
        <div class="balneario-controls">
          <fieldset class="balneario-group">
            <legend>Silhueta</legend>
            <div class="balneario-row">
              ${optionButton("sx", "m", c.sx, "", "Homem")}
              ${optionButton("sx", "f", c.sx, "", "Mulher")}
            </div>
          </fieldset>
          <fieldset class="balneario-group">
            <legend>Pele</legend>
            <div class="balneario-row">
              ${SKIN.map((hex, i) => optionButton("tone", i + 1, c.tone, `<span class="balneario-swatch" style="background:${hex}"></span>`, `Tom ${i + 1}`)).join("")}
            </div>
          </fieldset>
          <fieldset class="balneario-group">
            <legend>Penteado</legend>
            <div class="balneario-grid">
              ${A.hair[c.sx].map((h) => optionButton("hair", h, c.hair, bust({ hair: h }), esc(label(h)))).join("")}
            </div>
          </fieldset>
          <fieldset class="balneario-group">
            <legend>Cor do cabelo</legend>
            <div class="balneario-row">
              ${A.colors.map((col) => optionButton("color", col, c.color, `<span class="balneario-swatch" style="background:${HAIR_SWATCH[col]}"></span>`, esc(label(col)))).join("")}
            </div>
          </fieldset>
          ${c.sx === "m" ? `
          <fieldset class="balneario-group">
            <legend>Barba</legend>
            <div class="balneario-grid">
              ${A.beards.map((b) => optionButton("beard", b, c.beard, bust({ beard: b }), esc(label(b)))).join("")}
            </div>
          </fieldset>` : ""}
          <div class="actions">
            <button type="button" class="primary-btn" data-balneario-save ${state.busy || !dirty ? "disabled" : ""}>${dirty ? "Guardar aparência" : "Aparência guardada"}</button>
            ${dirty && state.saved ? `<button type="button" class="ghost-btn" data-balneario-undo ${state.busy ? "disabled" : ""}>Desfazer</button>` : ""}
          </div>
          ${state.message ? `<p class="fantasy-message" role="status">${esc(state.message)}</p>` : ""}
          ${cacifoHtml(esc)}
          <p class="muted">A aparência é grátis e podes mudá-la quando quiseres. Aparece na liga fantasia e na tua carta, se escolheres "Avatar".</p>
        </div>
      </div>`;
  }

  async function render(container, { client, user, escapeHtml, onSaved } = {}) {
    if (!container) return;
    const F = avatarApi();
    const esc = escapeHtml || ((v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]));
    if (!F || !client || !user) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    if (state.userId !== user.id) {
      state.userId = user.id;
      state.saved = null;
      state.choice = null;
      state.message = "";
      const cols = "silhouette, skin_tone, hair_style, hair_color, facial_hair, equipped";
      let { data, error } = await client.from("avatar_profiles").select(`${cols}, kits`).eq("user_id", user.id).maybeSingle();
      state.cacifo = !error;
      if (error) {
        // Sem a coluna kits (migracao do cacifo por aplicar): a aparencia continua a funcionar.
        ({ data, error } = await client.from("avatar_profiles").select(cols).eq("user_id", user.id).maybeSingle());
      }
      if (error) {
        container.innerHTML = `<p class="empty-state">Não foi possível abrir o Balneário (${esc(error.message || error)}).</p>`;
        state.userId = undefined;
        return;
      }
      state.choice = initialChoice(data);
      state.saved = data ? { ...state.choice } : null;
      state.eq = cleanEquipped(data?.equipped);
      state.savedEq = { ...state.eq };
      state.kits = cleanKits(data?.kits);
      state.savedKits = cleanKits(state.kits);
    }
    paint(container, { client, user, esc, onSaved });
  }

  function paint(container, ctx) {
    container.innerHTML = html(ctx.esc);
    container.querySelectorAll("[data-balneario]").forEach((button) => button.addEventListener("click", () => {
      state.choice = applyChoice(state.choice, button.dataset.balneario, button.dataset.value);
      state.message = "";
      paint(container, ctx);
    }));
    container.querySelector("[data-balneario-undo]")?.addEventListener("click", () => {
      state.choice = { ...state.saved };
      state.message = "";
      paint(container, ctx);
    });
    container.querySelectorAll("[data-cacifo-slot]").forEach((b) => b.addEventListener("click", () => {
      state.slot = b.dataset.cacifoSlot;
      paint(container, ctx);
    }));
    container.querySelectorAll("[data-cacifo-item]").forEach((b) => b.addEventListener("click", () => {
      state.eq = setSlot(state.eq, state.slot, b.dataset.cacifoItem);
      state.message = "";
      paint(container, ctx);
    }));
    container.querySelectorAll("[data-cacifo-kit]").forEach((b) => b.addEventListener("click", () => {
      const kit = cleanKits(state.kits)[Number(b.dataset.cacifoKit)];
      if (kit) state.eq = { ...kit.equipped };
      state.message = "";
      paint(container, ctx);
    }));
    container.querySelectorAll("[data-cacifo-kit-del]").forEach((b) => b.addEventListener("click", () => {
      state.kits = removeKit(state.kits, Number(b.dataset.cacifoKitDel));
      paint(container, ctx);
    }));
    container.querySelector("[data-cacifo-kit-save]")?.addEventListener("click", () => {
      state.kits = addKit(state.kits, state.eq);
      paint(container, ctx);
    });
    container.querySelector("[data-cacifo-clear]")?.addEventListener("click", () => {
      state.eq = clearAll();
      state.message = "";
      paint(container, ctx);
    });
    container.querySelector("[data-cacifo-undo]")?.addEventListener("click", () => {
      state.eq = { ...state.savedEq };
      state.kits = cleanKits(state.savedKits);
      state.message = "";
      paint(container, ctx);
    });
    container.querySelector("[data-cacifo-save]")?.addEventListener("click", async () => {
      state.busy = true;
      state.message = "";
      paint(container, ctx);
      const { data, error } = await ctx.client.rpc("set_avatar_cacifo", cacifoArgs(state.eq, state.kits));
      state.busy = false;
      if (error) {
        state.message = `Não foi possível guardar o cacifo (${error.message || error}).`;
      } else {
        state.savedEq = cleanEquipped(state.eq);
        state.savedKits = cleanKits(state.kits);
        state.message = "Cacifo guardado.";
        ctx.onSaved?.(ctx.user.id, data);
      }
      paint(container, ctx);
    });
    container.querySelector("[data-balneario-save]")?.addEventListener("click", async () => {
      state.busy = true;
      state.message = "";
      paint(container, ctx);
      const { data, error } = await ctx.client.rpc("set_avatar_profile", rpcArgs(state.choice));
      state.busy = false;
      if (error) {
        state.message = `Não foi possível guardar (${error.message || error}).`;
      } else {
        state.saved = { ...state.choice };
        state.message = "Aparência guardada.";
        ctx.onSaved?.(ctx.user.id, data);
      }
      paint(container, ctx);
    });
  }

  function reset() {
    state.userId = undefined;
    state.saved = null;
    state.choice = null;
    state.message = "";
    state.eq = {};
    state.savedEq = {};
    state.kits = [];
    state.savedKits = [];
  }

  return { SKIN, HAIR_SWATCH, SLOTS, TIERS, label, initialChoice, applyChoice, rpcArgs, sameChoice,
    cleanEquipped, setSlot, clearAll, sameEquipped, cleanKits, addKit, removeKit, cacifoArgs, slotValue, render, reset };
});
