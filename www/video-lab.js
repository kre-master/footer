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
  const SPEEDS = [1, 0.5, 0.25, 2];
  const ZOOMS = [1, 2, 3, 5];
  const MAX_ZOOM = 5;
  const FRAME_S = 1 / 30;

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

  function escapeAttr(value) {
    return String(value).replace(/[&"<>]/g, (char) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[char]);
  }

  function mount(container) {
    if (!container) return;
    const src = readStoredSrc() || SAMPLE_SRC;
    container.innerHTML = `
      <div class="lab">
        <p class="lab-note">🧪 Só tu vês isto. Leitor próprio em testes: o vídeo vem de um endereço direto (NAS ou serviço de vídeo), não do YouTube.</p>
        <form class="lab-source" data-lab-source>
          <input type="url" name="src" value="${escapeAttr(src)}" placeholder="Endereço do vídeo (.mp4)" autocomplete="off" required>
          <button type="submit" class="primary-btn">Carregar</button>
          <button type="button" class="ghost-btn" data-lab-sample>Exemplo</button>
        </form>
        <div class="lab-stage" data-lab-stage>
          <div class="lab-viewport" data-lab-viewport>
            <video class="lab-video" playsinline preload="metadata"></video>
          </div>
          <div class="lab-status" data-lab-status hidden></div>
          <div class="lab-controls">
            <input class="lab-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Posição no vídeo" data-lab-seek>
            <div class="lab-buttons">
              <button type="button" class="lab-btn lab-play" data-lab-play aria-label="Tocar">${ICONS.play}</button>
              <button type="button" class="lab-btn" data-lab-skip="-10" aria-label="Recuar 10 segundos">−10</button>
              <button type="button" class="lab-btn" data-lab-skip="10" aria-label="Avançar 10 segundos">+10</button>
              <button type="button" class="lab-btn" data-lab-frame="-1" aria-label="Imagem anterior">‹</button>
              <button type="button" class="lab-btn" data-lab-frame="1" aria-label="Imagem seguinte">›</button>
              <span class="lab-time" data-lab-time>0:00 / --:--</span>
              <button type="button" class="lab-btn" data-lab-speed aria-label="Velocidade">1×</button>
              <button type="button" class="lab-btn" data-lab-zoom aria-label="Zoom">🔍 1×</button>
              <button type="button" class="lab-btn" data-lab-fullscreen aria-label="Ecrã cheio">${ICONS.fs}</button>
            </div>
          </div>
        </div>
        <details class="lab-diag">
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
    const speedButton = container.querySelector("[data-lab-speed]");
    const zoomButton = container.querySelector("[data-lab-zoom]");
    const fsButton = container.querySelector("[data-lab-fullscreen]");
    const status = container.querySelector("[data-lab-status]");
    const diag = container.querySelector("[data-lab-diag]");
    const form = container.querySelector("[data-lab-source]");
    const view = { zoom: 1, x: 0, y: 0, width: 1, height: 1 };
    let seeking = false;
    let lastError = "";

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
      lastError = "";
      showStatus("A carregar…");
      setZoom(1);
      video.src = url;
      video.load();
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
        ["Resolução", video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : "—"],
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
    on(container.querySelector("[data-lab-sample]"), "click", () => {
      form.src.value = SAMPLE_SRC;
      storeSrc("");
      load(SAMPLE_SRC);
    });
    on(playButton, "click", togglePlay);
    container.querySelectorAll("[data-lab-skip]").forEach((button) => on(button, "click", () => {
      video.currentTime = clamp(video.currentTime + Number(button.dataset.labSkip), 0, video.duration || 0);
    }));
    // Imagem a imagem: pausa e anda 1/30 s (bom para ver se foi falta ou fora de jogo).
    container.querySelectorAll("[data-lab-frame]").forEach((button) => on(button, "click", () => {
      video.pause();
      video.currentTime = clamp(video.currentTime + Number(button.dataset.labFrame) * FRAME_S, 0, video.duration || 0);
    }));
    on(seek, "input", () => {
      seeking = true;
      video.currentTime = Number(seek.value);
      timeLabel.textContent = `${formatClock(Number(seek.value))} / ${formatClock(video.duration)}`;
    });
    on(seek, "change", () => {
      seeking = false;
    });
    on(speedButton, "click", () => {
      const next = SPEEDS[(SPEEDS.indexOf(video.playbackRate) + 1) % SPEEDS.length] ?? 1;
      video.playbackRate = next;
      speedButton.textContent = `${String(next).replace(".", ",")}×`;
      speedButton.classList.toggle("active", next !== 1);
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

    const setFsUi = (active) => {
      stage.classList.toggle("is-fullscreen", active);
      fsButton.innerHTML = active ? ICONS.exit : ICONS.fs;
      fsButton.setAttribute("aria-label", active ? "Sair do ecrã cheio" : "Ecrã cheio");
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
      video.pause();
      video.removeAttribute("src");
      video.load();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      if (stage.classList.contains("pseudo-fullscreen")) document.body.classList.remove("stage-open");
    }, 1000);

    load(src);
  }

  function on(element, type, handler, options) {
    if (element) element.addEventListener(type, handler, options);
  }

  return { mount, formatClock, clampPan, zoomAround, SAMPLE_SRC };
});
