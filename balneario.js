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
  // DOM
  // ---------------------------------------------------------------------------

  const state = { userId: undefined, saved: null, choice: null, busy: false, message: "" };

  function optionButton(key, value, current, inner, text) {
    const on = String(current) === String(value);
    return `<button type="button" class="balneario-opt ${on ? "is-on" : ""}" data-balneario="${key}" data-value="${value}" aria-pressed="${on}" title="${text}">${inner}<span class="balneario-opt-label">${text}</span></button>`;
  }

  function html(esc) {
    const F = avatarApi();
    const A = F.AVATAR;
    const c = state.choice;
    const bust = (over) => F.avatarHtml({ ...c, ...over }, { bust: 56 });
    const dirty = !state.saved || !sameChoice(c, state.saved);
    return `
      <div class="panel-head">
        <div>
          <p class="eyebrow">Balneário</p>
          <h2>A tua aparência</h2>
        </div>
      </div>
      <div class="balneario">
        <div class="balneario-stage">
          ${F.avatarHtml(c, { width: 128 })}
          ${F.avatarHtml(c, { bust: 64 })}
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
      const { data, error } = await client.from("avatar_profiles")
        .select("silhouette, skin_tone, hair_style, hair_color, facial_hair").eq("user_id", user.id).maybeSingle();
      if (error) {
        container.innerHTML = `<p class="empty-state">Não foi possível abrir o Balneário (${esc(error.message || error)}).</p>`;
        state.userId = undefined;
        return;
      }
      state.choice = initialChoice(data);
      state.saved = data ? { ...state.choice } : null;
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
  }

  return { SKIN, HAIR_SWATCH, label, initialChoice, applyChoice, rpcArgs, sameChoice, render, reset };
});
