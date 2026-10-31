(function exposeVideoLab(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterVideoLab = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createVideoLabApi() {
  // Leitor de video proprio (fora do YouTube), em testes. So aparece ao admin da plataforma,
  // na Galeria > Testes; o leitor do YouTube continua a ser o de toda a gente.
  const STORAGE_KEY = "footer-video-lab-src";
  // Video de exemplo (dominio publico) ate haver uma amostra de um jogo na NAS.
  const SAMPLE_SRC = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  // Dois botoes de velocidade: um so acelera (1x, 2x, 4x), o outro so abranda (1x, 0,5x, 0,25x).
  const FAST_RATES = [1, 2, 4];
  const SLOW_RATES = [1, 0.5, 0.25];
  const RATE_LABELS = { 2: "2×", 4: "4×", 0.5: "½×", 0.25: "¼×" };
  const MOMENTS_KEY = "footer-video-lab-moments";
  const MOMENT_BEFORE_S = 8;
  const MOMENT_AFTER_S = 5;
  const ZOOMS = [1, 2, 3, 5];
  const MAX_ZOOM = 5;
  const FRAME_S = 1 / 30;
  // Videos de teste no Bunny Stream (HLS: varias qualidades, o leitor escolhe pela rede).
  const BUNNY_CDN = "https://vz-fdc7df5c-b0e.b-cdn.net";
  const PRESETS = [
    { label: "Trecho 1080p", src: `${BUNNY_CDN}/552e75e1-463b-435d-a5d9-54bfd15a73c2/playlist.m3u8` },
    { label: "Trecho 4K", src: `${BUNNY_CDN}/03dc1f2d-cbe0-4609-a8ce-3455236951ce/playlist.m3u8` },
  ];
  // hls.js so e carregado quando se abre um video HLS (o resto da app nao precisa dele).
  const HLS_JS_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.light.min.js";
  let hlsScript = null;

  function loadHlsJs() {
    if (globalThis.Hls) return Promise.resolve(globalThis.Hls);
    if (!hlsScript) {
      hlsScript = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = HLS_JS_SRC;
        script.onload = () => resolve(globalThis.Hls);
        script.onerror = () => {
          hlsScript = null;
          reject(new Error("não consegui carregar o hls.js"));
        };
        document.head.appendChild(script);
      });
    }
    return hlsScript;
  }

  function isHlsSrc(src) {
    return /\.m3u8(\?|$)/i.test(src);
  }

  const ICONS = {
    play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>`,
    fs: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,
    exit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`,
  };

  function formatClock(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Limites do arrastar com zoom: o video (ampliado a partir do canto) nunca deixa ver o fundo.
  function clampPan(view) {
    const minX = view.width - view.width * view.zoom;
    const minY = view.height - view.height * view.zoom;
    view.x = clamp(view.x, minX, 0);
    view.y = clamp(view.y, minY, 0);
    return view;
  }

  // Zoom a volta de um ponto (dedos, rato ou centro): esse ponto fica no mesmo sitio do ecra.
  function zoomAround(view, nextZoom, px, py) {
    const zoom = clamp(nextZoom, 1, MAX_ZOOM);
    const ratio = zoom / view.zoom;
    view.x = px - (px - view.x) * ratio;
    view.y = py - (py - view.y) * ratio;
    view.zoom = zoom;
    return clampPan(view);
  }

  function readStoredSrc() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function storeSrc(src) {
    try {
      if (src) localStorage.setItem(STORAGE_KEY, src);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sem armazenamento (modo privado): o endereco so dura ate fechar.
    }
  }

  // Momentos do leitor de testes: ficam so neste telemovel, por endereco de video.
  function readMoments(src) {
    try {
      const all = JSON.parse(localStorage.getItem(MOMENTS_KEY) || "{}");
      return Array.isArray(all[src]) ? all[src] : [];
    } catch {
      return [];
    }
  }

  function writeMoments(src, moments) {
    try {
      const all = JSON.parse(localStorage.getItem(MOMENTS_KEY) || "{}");
      all[src] = moments;
      localStorage.setItem(MOMENTS_KEY, JSON.stringify(all));
    } catch {
      // Sem armazenamento: os momentos so duram ate fechar.
    }
  }

  function escapeAttr(value) {
    return String(value).replace(/[&"<>]/g, (char) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[char]);
  }

  // admin: ve tambem o endereco do video, o exemplo e o diagnostico; os jogadores so os videos.
  // games: jogos ja no Bunny ({ gameId, label, src }); moments: ponte para os momentos do grupo na app
  // ({ before, after, list, add, update, remove }). Sem jogo, os momentos ficam so neste telemovel.
  // embedded: leitor de um jogo dentro da app (Galeria, Historico): so o video e os momentos desse jogo.
  // Devolve { playClip({ start, end, note }), playReel(), seek(segundos) } para a app o comandar.
  function mount(container, { admin = false, games = [], moments = null, embedded = false } = {}) {
    if (!container) return null;
    const choices = [...games, ...PRESETS];
    const stored = readStoredSrc();
    const fallback = (games[0] || PRESETS[1]).src;
    const src = embedded ? fallback : admin ? stored || fallback : choices.some((choice) => choice.src === stored) ? stored : fallback;
    const beforeS = moments?.before ?? MOMENT_BEFORE_S;
    const afterS = moments?.after ?? MOMENT_AFTER_S;
    container.innerHTML = `
      <div class="lab ${embedded ? "lab-embedded" : ""}">
        <p class="lab-note" ${embedded ? "hidden" : ""}>🧪 Leitor de vídeo novo, em testes. Experimenta o zoom, a câmara lenta, o ecrã cheio e os momentos e diz ao João o que achas.</p>
        <form class="lab-source ${admin ? "" : "lab-source-players"}" data-lab-source ${embedded ? "hidden" : ""}>
          <input type="url" name="src" value="${escapeAttr(src)}" placeholder="Endereço do vídeo (.mp4)" autocomplete="off" required ${admin ? "" : "hidden"}>
          ${admin ? `<button type="submit" class="primary-btn">Carregar</button>
          <button type="button" class="ghost-btn" data-lab-sample>Exemplo</button>` : ""}
          ${choices.map((choice, index) => `<button type="button" class="ghost-btn ${choice.gameId ? "lab-choice-game" : ""}" data-lab-preset="${index}">${escapeAttr(choice.label)}</button>`).join("")}
        </form>
        <div class="lab-stage" data-lab-stage>
          <div class="lab-viewport" data-lab-viewport>
            <video class="lab-video" playsinline muted preload="metadata"></video>
          </div>
          <div class="lab-status" data-lab-status hidden></div>
          <div class="lab-clip" data-lab-clip hidden></div>
          <form class="lab-moment-form" data-lab-moment-form hidden>
            <div class="lab-moment-line">
              <span class="lab-moment-time" data-lab-moment-time>0:00</span>
              <input name="note" maxlength="140" placeholder="O que aconteceu?" autocomplete="off" required>
              <button type="submit" class="lab-btn" aria-label="Guardar momento">✓</button>
              <button type="button" class="lab-btn" data-lab-moment-cancel aria-label="Cancelar">✕</button>
            </div>
            <div class="lab-moment-adjust" data-lab-moment-adjust hidden>
              <span>Início</span><button type="button" data-lab-adjust="start:-5">−5</button><button type="button" data-lab-adjust="start:5">+5</button>
              <span>Fim</span><button type="button" data-lab-adjust="end:-5">−5</button><button type="button" data-lab-adjust="end:5">+5</button>
              <span class="lab-moment-window" data-lab-moment-window></span>
            </div>
            <p class="lab-moment-error" data-lab-moment-error hidden></p>
          </form>
          <div class="lab-controls">
            <div class="lab-row lab-row-seek">
              <input class="lab-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Posição no vídeo" data-lab-seek>
              <span class="lab-time" data-lab-time>0:00 / --:--</span>
            </div>
            <div class="lab-row lab-row-main">
              <button type="button" class="lab-btn lab-play" data-lab-play aria-label="Tocar">${ICONS.play}</button>
              <button type="button" class="lab-btn" data-lab-skip="-10" aria-label="Recuar 10 segundos">−10</button>
              <button type="button" class="lab-btn" data-lab-skip="10" aria-label="Avançar 10 segundos">+10</button>
              <button type="button" class="lab-btn" data-lab-frame="-1" aria-label="Imagem anterior">‹</button>
              <button type="button" class="lab-btn" data-lab-frame="1" aria-label="Imagem seguinte">›</button>
              <button type="button" class="lab-btn lab-fs" data-lab-fullscreen aria-label="Ecrã cheio">${ICONS.fs}</button>
            </div>
            <div class="lab-row lab-row-tools">
              <select class="lab-btn lab-quality" data-lab-quality aria-label="Qualidade" hidden></select>
              <div class="lab-corner">
                <button type="button" class="lab-btn" data-lab-fast aria-label="Mais rápido (2x, 4x)">⏩</button>
                <button type="button" class="lab-btn" data-lab-slow aria-label="Câmara lenta (0,5x, 0,25x)">🐢</button>
                <button type="button" class="lab-btn lab-mark" data-lab-mark aria-label="Marcar momento">🔖</button>
                <button type="button" class="lab-btn lab-zoom" data-lab-zoom aria-label="Zoom">🔍 1×</button>
              </div>
            </div>
          </div>
        </div>
        <div class="lab-moments-head">
          <small data-lab-moments-where></small>
          <button type="button" class="ghost-btn" data-lab-reel hidden>▶ All Highlights</button>
        </div>
        <ul class="lab-moments" data-lab-moments></ul>
        <details class="lab-diag" ${admin && !embedded ? "" : "hidden"}>
          <summary>Diagnóstico</summary>
          <dl data-lab-diag></dl>
        </details>
      </div>`;

    const stage = container.querySelector("[data-lab-stage]");
    const viewport = container.querySelector("[data-lab-viewport]");
    const video = container.querySelector("video");
    const seek = container.querySelector("[data-lab-seek]");
    const playButton = container.querySelector("[data-lab-play]");
    const timeLabel = container.querySelector("[data-lab-time]");
    const fastButton = container.querySelector("[data-lab-fast]");
    const slowButton = container.querySelector("[data-lab-slow]");
    const momentForm = container.querySelector("[data-lab-moment-form]");
    const momentTime = container.querySelector("[data-lab-moment-time]");
    const momentList = container.querySelector("[data-lab-moments]");
    const clipBar = container.querySelector("[data-lab-clip]");
    const reelButton = container.querySelector("[data-lab-reel]");
    const momentsWhere = container.querySelector("[data-lab-moments-where]");
    const adjustRow = container.querySelector("[data-lab-moment-adjust]");
    const momentWindow = container.querySelector("[data-lab-moment-window]");
    const momentError = container.querySelector("[data-lab-moment-error]");
    let currentSrc = src;
    let currentGame = null;
    let momentAt = 0;
    let resumeAfterMoment = false;
    let editing = null;
    let offsets = { before: beforeS, after: afterS };
    // Pedaco a tocar: um momento (repete ate "Continuar o jogo") ou o All Highlights (passa ao seguinte).
    let clip = null;
    const zoomButton = container.querySelector("[data-lab-zoom]");
    const fsButton = container.querySelector("[data-lab-fullscreen]");
    const status = container.querySelector("[data-lab-status]");
    const diag = container.querySelector("[data-lab-diag]");
    const form = container.querySelector("[data-lab-source]");
    const view = { zoom: 1, x: 0, y: 0, width: 1, height: 1 };
    let seeking = false;
    const qualitySelect = container.querySelector("[data-lab-quality]");
    let lastError = "";
    let hls = null;
    let mode = "MP4 direto";

    const showStatus = (text) => {
      status.textContent = text;
      status.hidden = !text;
    };

    const applyView = () => {
      view.width = viewport.clientWidth || 1;
      view.height = viewport.clientHeight || 1;
      clampPan(view);
      video.style.transform = view.zoom > 1 ? `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` : "";
      stage.classList.toggle("is-zoomed", view.zoom > 1);
      zoomButton.textContent = `🔍 ${Math.round(view.zoom * 10) / 10}×`;
    };

    const setZoom = (zoom, px = view.width / 2, py = view.height / 2) => {
      view.width = viewport.clientWidth || 1;
      view.height = viewport.clientHeight || 1;
      zoomAround(view, zoom, px, py);
      applyView();
    };

    const load = (url) => {
      currentSrc = url;
      currentGame = games.find((game) => game.src === url) || null;
      momentForm.hidden = true;
      clip = null;
      renderClipBar();
      renderMoments();
      lastError = "";
      showStatus("A carregar…");
      setZoom(1);
      if (hls) {
        hls.destroy();
        hls = null;
      }
      qualitySelect.hidden = true;
      if (!isHlsSrc(url)) {
        mode = "MP4 direto";
        video.src = url;
        video.load();
        return;
      }
      loadHlsJs().then((Hls) => {
        if (!stage.isConnected || form.src.value.trim() !== url) return;
        if (!Hls?.isSupported()) throw new Error("sem hls.js");
        mode = "HLS (hls.js)";
        hls = new Hls({ capLevelToPlayerSize: false });
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          // Qualidade: Auto (pela rede) ou fixa, para comparar a nitidez com zoom.
          qualitySelect.innerHTML = `<option value="-1">Auto</option>${data.levels.map((level, index) => `<option value="${index}">${level.height}p</option>`).join("")}`;
          qualitySelect.value = "-1";
          qualitySelect.hidden = false;
        });
        // Em Auto, o botao mostra a qualidade que esta mesmo a dar (ex.: "Auto · 1440p").
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          const auto = qualitySelect.querySelector('option[value="-1"]');
          const height = hls.levels[data.level]?.height;
          if (auto) auto.textContent = height ? `Auto · ${height}p` : "Auto";
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          lastError = `${data.type}: ${data.details}`;
          showStatus(`Erro: ${lastError}`);
          updateDiag();
        });
        hls.loadSource(url);
        hls.attachMedia(video);
      }).catch(() => {
        // iPhone antigo ou sem hls.js: o Safari toca HLS sozinho (sem escolher a qualidade).
        if (!video.canPlayType("application/vnd.apple.mpegurl")) {
          lastError = "este navegador não toca HLS";
          showStatus(`Erro: ${lastError}.`);
          return;
        }
        mode = "HLS nativo";
        video.src = url;
        video.load();
      });
    };

    const togglePlay = () => {
      if (video.paused || video.ended) video.play().catch((error) => showStatus(`Não consegui tocar: ${error.message}`));
      else video.pause();
    };

    const updateTime = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      seek.max = String(duration);
      if (!seeking) seek.value = String(video.currentTime);
      timeLabel.textContent = `${formatClock(video.currentTime)} / ${formatClock(duration || NaN)}`;
    };

    const updatePlayButton = () => {
      const playing = !video.paused && !video.ended;
      playButton.innerHTML = playing ? ICONS.pause : ICONS.play;
      playButton.setAttribute("aria-label", playing ? "Pausa" : "Tocar");
    };

    // Diagnostico para afinar o leitor: o que o telemovel recebe e se esta a conseguir acompanhar.
    const updateDiag = () => {
      let ahead = 0;
      for (let i = 0; i < video.buffered.length; i += 1) {
        if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime) {
          ahead = video.buffered.end(i) - video.currentTime;
        }
      }
      const quality = video.getVideoPlaybackQuality?.();
      const rows = [
        ["Endereço", video.currentSrc || "—"],
        ["Modo", mode],
        ["Resolução a tocar", video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : "—"],
        ["Rede estimada", hls?.bandwidthEstimate ? `${(hls.bandwidthEstimate / 1e6).toFixed(1)} Mbps` : "—"],
        ["Duração", formatClock(video.duration)],
        ["Já carregado à frente", `${ahead.toFixed(1)} s`],
        ["Estado", ["sem dados", "metadados", "imagem atual", "pode avançar", "pronto"][video.readyState] || "—"],
        ["Imagens perdidas", quality ? `${quality.droppedVideoFrames} de ${quality.totalVideoFrames}` : "—"],
        ["Velocidade", `${video.playbackRate}×`],
        ["Erro", lastError || "nenhum"],
      ];
      diag.innerHTML = rows.map(([label, value]) => `<dt>${label}</dt><dd>${escapeAttr(value)}</dd>`).join("");
    };

    video.addEventListener("loadedmetadata", () => {
      showStatus("");
      updateTime();
      updateDiag();
    });
    video.addEventListener("waiting", () => showStatus("A carregar…"));
    video.addEventListener("playing", () => showStatus(""));
    video.addEventListener("canplay", () => showStatus(""));
    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("durationchange", updateTime);
    video.addEventListener("play", updatePlayButton);
    video.addEventListener("pause", updatePlayButton);
    video.addEventListener("ended", updatePlayButton);
    video.addEventListener("error", () => {
      const code = video.error?.code;
      lastError = { 1: "cancelado", 2: "falha de rede", 3: "não consegui descodificar", 4: "formato ou endereço não suportado" }[code] || "desconhecido";
      showStatus(`Erro: ${lastError}. Confirma o endereço (tem de ser https e .mp4).`);
      updateDiag();
    });

    on(form, "submit", (event) => {
      event.preventDefault();
      const url = form.src.value.trim();
      storeSrc(url === SAMPLE_SRC ? "" : url);
      load(url);
    });
    container.querySelectorAll("[data-lab-preset]").forEach((button) => on(button, "click", () => {
      const { src: presetSrc } = choices[Number(button.dataset.labPreset)];
      form.src.value = presetSrc;
      storeSrc(presetSrc);
      load(presetSrc);
    }));
    on(qualitySelect, "change", () => {
      if (hls) hls.currentLevel = Number(qualitySelect.value);
    });
    on(container.querySelector("[data-lab-sample]"), "click", () => {
      form.src.value = SAMPLE_SRC;
      storeSrc("");
      load(SAMPLE_SRC);
    });
    on(playButton, "click", togglePlay);
    container.querySelectorAll("[data-lab-skip]").forEach((button) => on(button, "click", () => {
      leaveClip();
      video.currentTime = clamp(video.currentTime + Number(button.dataset.labSkip), 0, video.duration || 0);
    }));
    // Imagem a imagem: pausa e anda 1/30 s (bom para ver se foi falta ou fora de jogo).
    container.querySelectorAll("[data-lab-frame]").forEach((button) => on(button, "click", () => {
      video.pause();
      video.currentTime = clamp(video.currentTime + Number(button.dataset.labFrame) * FRAME_S, 0, video.duration || 0);
    }));
    on(seek, "input", () => {
      leaveClip();
      seeking = true;
      video.currentTime = Number(seek.value);
      timeLabel.textContent = `${formatClock(Number(seek.value))} / ${formatClock(video.duration)}`;
    });
    on(seek, "change", () => {
      seeking = false;
    });
    const setRate = (rate) => {
      video.playbackRate = rate;
      fastButton.textContent = rate > 1 ? RATE_LABELS[rate] : "⏩";
      slowButton.textContent = rate < 1 ? RATE_LABELS[rate] : "🐢";
      fastButton.classList.toggle("active", rate > 1);
      slowButton.classList.toggle("active", rate < 1);
    };
    on(fastButton, "click", () => {
      const rate = video.playbackRate;
      setRate(rate < 1 ? FAST_RATES[1] : FAST_RATES[(FAST_RATES.indexOf(rate) + 1) % FAST_RATES.length] ?? 1);
    });
    on(slowButton, "click", () => {
      const rate = video.playbackRate;
      setRate(rate > 1 ? SLOW_RATES[1] : SLOW_RATES[(SLOW_RATES.indexOf(rate) + 1) % SLOW_RATES.length] ?? 1);
    });
    // Um video novo volta a 1x; repoe os botoes a condizer.
    video.addEventListener("loadedmetadata", () => setRate(video.playbackRate || 1));

    // Onde ficam os momentos: num jogo, os do grupo (os mesmos do leitor do YouTube, via app);
    // num video de teste, so neste telemovel. Itens: { id, t, start, end, note, author, canEdit }.
    const localStore = {
      list: () => readMoments(currentSrc).map((item) => ({
        id: item.id, t: item.t, start: item.start ?? Math.max(0, item.t - beforeS), end: item.end ?? item.t + afterS,
        note: item.note, author: "", canEdit: true,
      })),
      async add(timing) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        writeMoments(currentSrc, [...readMoments(currentSrc), { id, t: timing.momentS, start: timing.startS, end: timing.endS, note: timing.note }]);
      },
      async update(id, timing) {
        writeMoments(currentSrc, readMoments(currentSrc).map((item) => (item.id === id ? { id, t: timing.momentS, start: timing.startS, end: timing.endS, note: timing.note } : item)));
      },
      async remove(id) {
        writeMoments(currentSrc, readMoments(currentSrc).filter((item) => item.id !== id));
      },
    };
    const store = () => (currentGame && moments ? {
      list: () => moments.list(currentGame.gameId),
      add: (timing) => moments.add(currentGame.gameId, timing),
      update: (id, timing) => moments.update(id, timing),
      remove: (id) => moments.remove(id),
    } : localStore);
    const listMoments = () => store().list().sort((a, b) => a.t - b.t);

    function renderClipBar() {
      clipBar.hidden = !clip;
      if (!clip) return;
      clipBar.classList.toggle("is-reel", Boolean(clip.reel));
      clipBar.innerHTML = clip.reel
        ? `<button type="button" data-lab-clip-go="prev" aria-label="Momento anterior">◀</button>
           <span>${clip.index + 1}/${clip.reel.length}</span>
           <button type="button" data-lab-clip-go="next" aria-label="Momento seguinte">▶</button>
           <button type="button" data-lab-clip-go="exit" aria-label="Sair do All Highlights">✕</button>`
        : `<span class="lab-clip-note">🔖 ${escapeAttr(clip.note)}</span>
           <button type="button" data-lab-clip-go="exit">Continuar o jogo ▶</button>`;
    }
    // O video (HLS) pode ainda estar a carregar quando a app pede um momento: espera pelos metadados.
    const whenReady = (fn) => {
      if (video.readyState >= 1) fn();
      else video.addEventListener("loadedmetadata", fn, { once: true });
    };
    const playClip = (item, reel = null, index = 0) => {
      clip = { start: item.start, end: item.end, note: item.note, reel, index };
      renderClipBar();
      whenReady(() => {
        video.currentTime = item.start;
        video.play().catch(() => {});
      });
    };
    // Sair do pedaco: o video continua normalmente a partir dali.
    function leaveClip() {
      if (!clip) return;
      clip = null;
      renderClipBar();
    }
    on(clipBar, "click", (event) => {
      const action = event.target.closest("[data-lab-clip-go]")?.dataset.labClipGo;
      if (!action || !clip) return;
      if (action === "exit") return leaveClip();
      const { reel, index } = clip;
      if (!reel) return;
      const next = action === "next" ? index + 1 : Math.max(0, index - 1);
      if (next >= reel.length) return leaveClip();
      playClip(reel[next], reel, next);
    });
    video.addEventListener("timeupdate", () => {
      if (!clip || video.currentTime < clip.end) return;
      if (!clip.reel) {
        video.currentTime = clip.start;
        return;
      }
      if (clip.index + 1 < clip.reel.length) playClip(clip.reel[clip.index + 1], clip.reel, clip.index + 1);
      else {
        leaveClip();
        video.pause();
      }
    });
    on(reelButton, "click", () => {
      const items = listMoments();
      if (items.length) playClip(items[0], items, 0);
    });

    const renderMoments = () => {
      const items = listMoments();
      momentsWhere.textContent = embedded ? `Momentos · ${items.length}` : currentGame && moments
        ? `Momentos do grupo · ${items.length} (os mesmos do leitor do YouTube)`
        : items.length ? "Momentos só neste telemóvel (vídeo de teste)" : "";
      reelButton.hidden = items.length < 2;
      reelButton.textContent = `▶ All Highlights · ${items.length}`;
      momentList.innerHTML = items.map((item) => `
        <li>
          <button type="button" class="lab-moment-go" data-lab-moment-go="${escapeAttr(item.id)}">
            <b>▶ ${formatClock(item.t)}</b> <span>${escapeAttr(item.note)}</span>
            ${item.author ? `<small>${escapeAttr(item.author)} · ${Math.round(item.end - item.start)} s</small>` : ""}
          </button>
          ${item.canEdit ? `<button type="button" class="lab-moment-edit" data-lab-moment-edit="${escapeAttr(item.id)}" aria-label="Editar momento">✎</button>
          <button type="button" class="lab-moment-del" data-lab-moment-del="${escapeAttr(item.id)}" aria-label="Apagar momento">×</button>` : ""}
        </li>`).join("");
      const find = (id) => listMoments().find((item) => item.id === id);
      momentList.querySelectorAll("[data-lab-moment-go]").forEach((button) => on(button, "click", () => {
        const item = find(button.dataset.labMomentGo);
        if (item) playClip(item);
      }));
      momentList.querySelectorAll("[data-lab-moment-edit]").forEach((button) => on(button, "click", () => {
        const item = find(button.dataset.labMomentEdit);
        if (item) openMomentForm(item);
      }));
      momentList.querySelectorAll("[data-lab-moment-del]").forEach((button) => on(button, "click", async () => {
        if (!window.confirm("Apagar este momento?")) return;
        try {
          await store().remove(button.dataset.labMomentDel);
        } catch (error) {
          showStatus(error.message || "Não foi possível apagar o momento.");
        }
        renderMoments();
      }));
    };

    // Caixa do momento: pequena e transparente no canto de cima. A marcar so pede o texto;
    // a editar mostra tambem os ajustes do pedaco (inicio e fim em passos de 5 s).
    const updateWindow = () => {
      momentWindow.textContent = `${formatClock(Math.max(0, momentAt - offsets.before))}–${formatClock(momentAt + offsets.after)}`;
    };
    const showMomentError = (text) => {
      momentError.textContent = text;
      momentError.hidden = !text;
    };
    function openMomentForm(item = null) {
      resumeAfterMoment = !video.paused;
      video.pause();
      editing = item;
      momentAt = item ? item.t : video.currentTime;
      offsets = item ? { before: Math.max(0, item.t - item.start), after: Math.max(1, item.end - item.t) } : { before: beforeS, after: afterS };
      momentTime.textContent = `🔖 ${formatClock(momentAt)}`;
      momentForm.note.value = item ? item.note : "";
      adjustRow.hidden = !item;
      updateWindow();
      showMomentError("");
      momentForm.hidden = false;
      momentForm.note.focus();
    }
    const closeMoment = () => {
      momentForm.hidden = true;
      editing = null;
      if (resumeAfterMoment) video.play().catch(() => {});
    };
    on(container.querySelector("[data-lab-mark]"), "click", () => openMomentForm());
    on(container.querySelector("[data-lab-moment-cancel]"), "click", closeMoment);
    container.querySelectorAll("[data-lab-adjust]").forEach((button) => on(button, "click", () => {
      const [edge, delta] = button.dataset.labAdjust.split(":");
      const change = Number(delta);
      if (edge === "start") offsets.before = clamp(offsets.before - change, 0, 60);
      else offsets.after = clamp(offsets.after + change, 1, 60);
      updateWindow();
    }));
    on(momentForm, "submit", async (event) => {
      event.preventDefault();
      const note = momentForm.note.value.trim();
      if (!note) return;
      const timing = {
        momentS: Math.round(momentAt * 10) / 10,
        startS: Math.max(0, Math.floor(momentAt - offsets.before)),
        endS: Math.ceil(momentAt + offsets.after),
        note,
      };
      const saveButton = momentForm.querySelector("button[type=submit]");
      saveButton.disabled = true;
      try {
        if (editing) await store().update(editing.id, timing);
        else await store().add(timing);
        renderMoments();
        closeMoment();
      } catch (error) {
        showMomentError(error.message || "Não foi possível guardar o momento.");
      } finally {
        saveButton.disabled = false;
      }
    });
    on(zoomButton, "click", () => {
      const next = ZOOMS.find((level) => level > view.zoom + 0.05) ?? 1;
      setZoom(next);
    });

    // Tocar no video: pausa ou continua. Arrastar (com zoom): escolhe a zona. Dois dedos: zoom.
    const pointers = new Map();
    let gesture = null;
    const local = (event) => {
      const rect = viewport.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    on(viewport, "pointerdown", (event) => {
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, local(event));
      if (pointers.size === 1) {
        const point = pointers.get(event.pointerId);
        gesture = { type: "pan", startX: point.x, startY: point.y, viewX: view.x, viewY: view.y, moved: false };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        gesture = { type: "pinch", distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom, moved: true };
      }
    });
    on(viewport, "pointermove", (event) => {
      if (!pointers.has(event.pointerId) || !gesture) return;
      pointers.set(event.pointerId, local(event));
      if (gesture.type === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        setZoom(gesture.zoom * (distance / gesture.distance), (a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
      }
      const point = pointers.get(event.pointerId);
      const dx = point.x - gesture.startX;
      const dy = point.y - gesture.startY;
      if (Math.abs(dx) + Math.abs(dy) > 8) gesture.moved = true;
      if (!gesture.moved || view.zoom <= 1) return;
      view.x = gesture.viewX + dx;
      view.y = gesture.viewY + dy;
      applyView();
    });
    const endPointer = (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      const tapped = gesture && !gesture.moved && event.type === "pointerup";
      if (pointers.size === 0) gesture = null;
      else if (gesture?.type === "pinch") {
        // Sobra um dedo: continua a arrastar a partir daqui, sem contar como toque.
        const point = [...pointers.values()][0];
        gesture = { type: "pan", startX: point.x, startY: point.y, viewX: view.x, viewY: view.y, moved: true };
      }
      if (tapped) togglePlay();
    };
    on(viewport, "pointerup", endPointer);
    on(viewport, "pointercancel", endPointer);
    // Roda do rato (computador): zoom onde esta o cursor.
    on(viewport, "wheel", (event) => {
      event.preventDefault();
      const point = local(event);
      setZoom(view.zoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2), point.x, point.y);
    }, { passive: false });

    // Ecra cheio: sem mexer durante 5 s (com o video a dar), a barra fica quase invisivel,
    // so com o contorno dos botoes; qualquer toque ou movimento volta a mostra-la.
    let idleTimer = null;
    const wake = () => {
      stage.classList.remove("is-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (stage.classList.contains("is-fullscreen") && !video.paused) stage.classList.add("is-idle");
      }, 5000);
    };
    ["pointerdown", "pointermove", "keydown"].forEach((type) => on(stage, type, wake));
    video.addEventListener("play", wake);
    video.addEventListener("pause", wake);

    const setFsUi = (active) => {
      stage.classList.toggle("is-fullscreen", active);
      fsButton.innerHTML = active ? ICONS.exit : ICONS.fs;
      fsButton.setAttribute("aria-label", active ? "Sair do ecrã cheio" : "Ecrã cheio");
      wake();
      requestAnimationFrame(() => setZoom(1));
    };
    on(fsButton, "click", async () => {
      const nativeElement = document.fullscreenElement || document.webkitFullscreenElement;
      if (stage.classList.contains("is-fullscreen")) {
        if (nativeElement) await Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => {});
        stage.classList.remove("pseudo-fullscreen");
        document.body.classList.remove("stage-open");
        setFsUi(false);
        return;
      }
      const request = stage.requestFullscreen || stage.webkitRequestFullscreen;
      try {
        if (!request) throw new Error("no fullscreen");
        await request.call(stage);
        screen.orientation?.lock?.("landscape").catch(() => {});
      } catch {
        // iPhone: sem ecra cheio para elementos; o leitor ocupa a pagina toda.
        stage.classList.add("pseudo-fullscreen");
        document.body.classList.add("stage-open");
      }
      setFsUi(true);
    });
    const onFsChange = () => {
      if (!stage.isConnected) return;
      if (!(document.fullscreenElement || document.webkitFullscreenElement) && !stage.classList.contains("pseudo-fullscreen")) setFsUi(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    // Teclado (computador): espaco pausa, setas andam 5 s, virgula e ponto andam uma imagem.
    const onKey = (event) => {
      if (!stage.isConnected || event.target.closest?.("input, textarea")) return;
      const keys = { " ": () => togglePlay(), ArrowLeft: () => { video.currentTime -= 5; }, ArrowRight: () => { video.currentTime += 5; },
        ",": () => { video.pause(); video.currentTime -= FRAME_S; }, ".": () => { video.pause(); video.currentTime += FRAME_S; } };
      if (!keys[event.key]) return;
      event.preventDefault();
      keys[event.key]();
    };
    document.addEventListener("keydown", onKey);

    // Quando a Galeria volta a desenhar, este leitor sai da pagina: para tudo o que ficou a correr.
    const timer = setInterval(() => {
      if (stage.isConnected) {
        if (container.querySelector(".lab-diag")?.open) updateDiag();
        return;
      }
      clearInterval(timer);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
      document.removeEventListener("keydown", onKey);
      clearTimeout(idleTimer);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      if (stage.classList.contains("pseudo-fullscreen")) document.body.classList.remove("stage-open");
    }, 1000);

    load(src);
    return {
      playClip: (item) => playClip(item),
      playReel: () => reelButton.click(),
      seek(seconds) {
        leaveClip();
        whenReady(() => {
          video.currentTime = Math.max(0, seconds);
          video.play().catch(() => {});
        });
        stage.scrollIntoView({ behavior: "smooth", block: "center" });
      },
    };
  }

  function on(element, type, handler, options) {
    if (element) element.addEventListener(type, handler, options);
  }

  return { mount, formatClock, clampPan, zoomAround, isHlsSrc, SAMPLE_SRC, PRESETS };
});
