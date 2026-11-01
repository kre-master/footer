(function exposeHeartRate(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterHeartRate = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHeartRateApi() {
  // Frequencia cardiaca do relogio (2026-11-02). O jogador carrega o treino exportado do relogio
  // (TCX ou GPX: Garmin, Apple Watch via app, Huawei e Amazfit via Strava) e a app liga-o ao jogo pela hora.
  // Tudo se le no proprio aparelho; so a serie de FC (um valor a cada poucos segundos) pode ser guardada.
  const MIN_HR = 30;
  const MAX_HR = 230;
  // Intervalos mais longos que isto contam como falha do sensor, nao como tempo medido.
  const MAX_GAP_S = 15;

  function tagValue(block, name) {
    const match = block.match(new RegExp(`<(?:[\\w-]+:)?${name}\\b[^>]*>\\s*([^<]*?)\\s*</(?:[\\w-]+:)?${name}>`, "i"));
    return match ? match[1] : null;
  }

  function parseTime(value) {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }

  function readBlocks(text, tag, hrOf) {
    const blocks = text.match(new RegExp(`<(?:[\\w-]+:)?${tag}\\b[\\s\\S]*?</(?:[\\w-]+:)?${tag}>`, "gi")) || [];
    return blocks.map((block) => ({ ms: parseTime(tagValue(block, "time")), hr: hrOf(block) })).filter((point) => point.ms != null);
  }

  function parseTcxHr(block) {
    const bpm = block.match(/<(?:[\w-]+:)?HeartRateBpm\b[\s\S]*?<\/(?:[\w-]+:)?HeartRateBpm>/i);
    return bpm ? Number(tagValue(bpm[0], "Value")) : null;
  }

  // FIT (Garmin e outros): formato binario. So interessam as mensagens "record" (tipo 20): campo 253 = hora
  // (segundos desde 31/12/1989 UTC) e campo 3 = batimentos por minuto. O resto do ficheiro (GPS, voltas) e ignorado.
  const FIT_EPOCH_S = 631065600;
  const FIT_SIGNATURE = ".FIT";
  const FIT_RECORD = 20;

  function isFit(bytes) {
    return bytes.length >= 12 && String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === FIT_SIGNATURE;
  }

  function parseFitPoints(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const headerSize = bytes[0];
    const end = Math.min(bytes.length, headerSize + view.getUint32(4, true));
    const definitions = new Map();
    const points = [];
    let offset = headerSize;
    let lastTimestamp = null;
    while (offset < end) {
      const header = bytes[offset++];
      if (header & 0x80) {
        // Hora comprimida: so os 5 bits de baixo; o resto vem da ultima hora lida.
        const definition = definitions.get((header >> 5) & 0x03);
        if (!definition) break;
        const low = header & 0x1f;
        if (lastTimestamp != null) {
          let timestamp = (lastTimestamp & ~0x1f) + low;
          if (low < (lastTimestamp & 0x1f)) timestamp += 0x20;
          lastTimestamp = timestamp;
        }
        offset = readFitData(view, offset, definition, points, () => lastTimestamp, (value) => { lastTimestamp = value; }, true);
      } else if (header & 0x40) {
        const hasDeveloperFields = Boolean(header & 0x20);
        offset += 1; // reservado
        const little = bytes[offset++] === 0;
        const globalNumber = view.getUint16(offset, little);
        offset += 2;
        const fieldCount = bytes[offset++];
        const fields = [];
        for (let i = 0; i < fieldCount; i += 1) {
          fields.push({ number: bytes[offset], size: bytes[offset + 1] });
          offset += 3;
        }
        let developerSize = 0;
        if (hasDeveloperFields) {
          const developerCount = bytes[offset++];
          for (let i = 0; i < developerCount; i += 1) {
            developerSize += bytes[offset + 1];
            offset += 3;
          }
        }
        definitions.set(header & 0x0f, { globalNumber, little, fields, developerSize });
      } else {
        const definition = definitions.get(header & 0x0f);
        if (!definition) break;
        offset = readFitData(view, offset, definition, points, () => lastTimestamp, (value) => { lastTimestamp = value; }, false);
      }
    }
    return points;
  }

  function readFitData(view, start, definition, points, getTimestamp, setTimestamp, compressed) {
    let offset = start;
    let timestamp = compressed ? getTimestamp() : null;
    let hr = null;
    definition.fields.forEach((field) => {
      if (definition.globalNumber === FIT_RECORD && field.number === 253 && field.size === 4) {
        const value = view.getUint32(offset, definition.little);
        if (value !== 0xffffffff) {
          timestamp = value;
          setTimestamp(value);
        }
      } else if (definition.globalNumber === FIT_RECORD && field.number === 3 && field.size === 1) {
        const value = view.getUint8(offset);
        if (value !== 0xff) hr = value;
      }
      offset += field.size;
    });
    if (definition.globalNumber === FIT_RECORD && timestamp != null) points.push({ ms: (timestamp + FIT_EPOCH_S) * 1000, hr });
    return offset + definition.developerSize;
  }

  function finishWorkout(format, points) {
    points.sort((a, b) => a.ms - b.ms);
    const startedAtMs = points.length ? points[0].ms : null;
    const samples = points
      .filter((point) => Number.isFinite(point.hr) && point.hr >= MIN_HR && point.hr <= MAX_HR)
      .map((point) => ({ t: Math.round((point.ms - startedAtMs) / 100) / 10, hr: Math.round(point.hr) }));
    if (!samples.length) {
      return { ok: false, format, error: "O ficheiro nao tem frequencia cardiaca. Confirma que o relogio a media durante o jogo." };
    }
    return { ok: true, format, startedAtMs, durationS: samples[samples.length - 1].t, samples };
  }

  // Treino exportado (texto TCX/GPX ou bytes de um FIT): devolve { ok, format, startedAtMs, durationS, samples: [{ t, hr }] }
  // com t em segundos desde o inicio do treino.
  function parseWorkout(input) {
    if (input && typeof input === "object" && (input instanceof ArrayBuffer || ArrayBuffer.isView(input))) {
      const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      if (isFit(bytes)) {
        try {
          return finishWorkout("fit", parseFitPoints(bytes));
        } catch {
          return { ok: false, format: "fit", error: "Nao consegui ler este ficheiro .fit. Tenta exportar o treino em TCX ou GPX." };
        }
      }
      return parseWorkout(new TextDecoder("utf-8").decode(bytes));
    }
    const source = String(input ?? "");
    let format = null;
    let points = [];
    if (/<TrainingCenterDatabase\b/i.test(source)) {
      format = "tcx";
      points = readBlocks(source, "Trackpoint", parseTcxHr);
    } else if (/<gpx\b/i.test(source)) {
      format = "gpx";
      points = readBlocks(source, "trkpt", (block) => {
        const value = tagValue(block, "hr");
        return value == null ? null : Number(value);
      });
    } else {
      return { ok: false, error: "Formato nao reconhecido. Usa um ficheiro .fit, .tcx ou .gpx." };
    }
    return finishWorkout(format, points);
  }

  // Parte do treino que cai dentro do jogo; t passa a ser segundos desde o inicio do jogo.
  function sliceForWindow(workout, windowStartMs, windowEndMs) {
    if (!workout?.ok || !(windowEndMs > windowStartMs)) return { samples: [], coverage: 0 };
    const from = (windowStartMs - workout.startedAtMs) / 1000;
    const to = (windowEndMs - workout.startedAtMs) / 1000;
    const samples = workout.samples
      .filter((sample) => sample.t >= from && sample.t <= to)
      .map((sample) => ({ t: Math.round((sample.t - from) * 10) / 10, hr: sample.hr }));
    const covered = samples.length ? Math.min(to, workout.durationS) - Math.max(from, 0) : 0;
    return { samples, coverage: Math.max(0, Math.min(1, covered / (to - from))) };
  }

  // Media, maxima e minima; a media pesa cada valor pelo tempo ate ao seguinte (sem contar falhas longas).
  function summarize(samples) {
    if (!samples?.length) return null;
    let weighted = 0;
    let seconds = 0;
    samples.forEach((sample, index) => {
      const next = samples[index + 1];
      const dt = next ? Math.min(next.t - sample.t, MAX_GAP_S) : 0;
      weighted += sample.hr * dt;
      seconds += dt;
    });
    const values = samples.map((sample) => sample.hr);
    const avg = seconds > 0 ? weighted / seconds : values.reduce((sum, value) => sum + value, 0) / values.length;
    return { avg: Math.round(avg), max: Math.max(...values), min: Math.min(...values), count: samples.length };
  }

  // FC no segundo t do video (offsetS acerta o relogio com o video). null se nao ha leitura perto.
  function heartRateAt(samples, t, offsetS = 0) {
    if (!samples?.length || !Number.isFinite(t)) return null;
    const target = t + offsetS;
    let low = 0;
    let high = samples.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (samples[mid].t < target) low = mid + 1;
      else high = mid;
    }
    const after = samples[low];
    const before = low > 0 ? samples[low - 1] : null;
    if (before && after.t > target && target - before.t <= MAX_GAP_S && after.t - before.t <= MAX_GAP_S) {
      const share = (target - before.t) / (after.t - before.t);
      return Math.round(before.hr + (after.hr - before.hr) * share);
    }
    const nearest = [before, after].filter(Boolean).sort((a, b) => Math.abs(a.t - target) - Math.abs(b.t - target))[0];
    return nearest && Math.abs(nearest.t - target) <= MAX_GAP_S ? nearest.hr : null;
  }

  // Um valor a cada stepS segundos (media do intervalo): serie curta para guardar e desenhar.
  function downsample(samples, stepS = 5) {
    const buckets = new Map();
    (samples || []).forEach((sample) => {
      const key = Math.floor(sample.t / stepS);
      const bucket = buckets.get(key) || { sum: 0, count: 0 };
      bucket.sum += sample.hr;
      bucket.count += 1;
      buckets.set(key, bucket);
    });
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([key, bucket]) => ({ t: key * stepS, hr: Math.round(bucket.sum / bucket.count) }));
  }

  return { parseWorkout, sliceForWindow, summarize, heartRateAt, downsample, MAX_GAP_S };
});
