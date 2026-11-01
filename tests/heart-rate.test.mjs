import test from "node:test";
import assert from "node:assert/strict";
import heartRate from "../heart-rate.js";

const point = (second, hr, tag = "Trackpoint") => `<${tag}><Time>2026-10-28T21:00:${String(second).padStart(2, "0")}Z</Time>${hr == null ? "" : `<HeartRateBpm><Value>${hr}</Value></HeartRateBpm>`}</${tag}>`;

// Garmin Connect / Strava / HealthFit
const tcx = (points) => `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="Other"><Lap><Track>${points}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;

const gpxPoint = (second, hr, prefix = "gpxtpx") => `<trkpt lat="41.1" lon="-8.6"><time>2026-10-28T21:00:${String(second).padStart(2, "0")}Z</time><extensions><${prefix}:TrackPointExtension>${hr == null ? "" : `<${prefix}:hr>${hr}</${prefix}:hr>`}</${prefix}:TrackPointExtension></extensions></trkpt>`;
const gpx = (points) => `<?xml version="1.0"?><gpx version="1.1" creator="Strava"><trk><trkseg>${points}</trkseg></trk></gpx>`;

test("le TCX: tempo desde o primeiro ponto e FC", () => {
  const result = heartRate.parseWorkout(tcx(point(0, 100) + point(5, 120) + point(10, 140)));
  assert.equal(result.ok, true);
  assert.equal(result.format, "tcx");
  assert.deepEqual(result.samples, [{ t: 0, hr: 100 }, { t: 5, hr: 120 }, { t: 10, hr: 140 }]);
  assert.equal(result.startedAtMs, Date.parse("2026-10-28T21:00:00Z"));
  assert.equal(result.durationS, 10);
});

test("le GPX com extensao de FC (gpxtpx e ns3)", () => {
  for (const prefix of ["gpxtpx", "ns3"]) {
    const result = heartRate.parseWorkout(gpx(gpxPoint(0, 90, prefix) + gpxPoint(4, 110, prefix)));
    assert.equal(result.ok, true);
    assert.equal(result.format, "gpx");
    assert.deepEqual(result.samples, [{ t: 0, hr: 90 }, { t: 4, hr: 110 }]);
  }
});

test("ignora leituras impossiveis e pontos sem FC, mas o tempo conta desde o primeiro ponto", () => {
  const result = heartRate.parseWorkout(tcx(point(0, null) + point(3, 0) + point(6, 300) + point(9, 130)));
  assert.deepEqual(result.samples, [{ t: 9, hr: 130 }]);
});

test("ordena pontos fora de ordem", () => {
  const result = heartRate.parseWorkout(tcx(point(10, 140) + point(0, 100)));
  assert.deepEqual(result.samples.map((sample) => sample.hr), [100, 140]);
});

test("erros em linguagem simples", () => {
  assert.match(heartRate.parseWorkout("nada").error, /\.fit, \.tcx ou \.gpx/);
  assert.match(heartRate.parseWorkout(gpx(gpxPoint(0, null))).error, /frequencia cardiaca/);
  assert.equal(heartRate.parseWorkout(undefined).ok, false);
});

test("sliceForWindow: so o jogo, com t desde o inicio do jogo", () => {
  const workout = heartRate.parseWorkout(tcx([0, 10, 20, 30, 40, 50].map((s, i) => point(s, 100 + i * 10)).join("")));
  const start = Date.parse("2026-10-28T21:00:10Z");
  const slice = heartRate.sliceForWindow(workout, start, start + 30000);
  assert.deepEqual(slice.samples, [{ t: 0, hr: 110 }, { t: 10, hr: 120 }, { t: 20, hr: 130 }, { t: 30, hr: 140 }]);
  assert.equal(slice.coverage, 1);
});

test("sliceForWindow: treino que cobre so parte do jogo", () => {
  const workout = heartRate.parseWorkout(tcx(point(0, 100) + point(20, 120)));
  const start = Date.parse("2026-10-28T21:00:00Z");
  const slice = heartRate.sliceForWindow(workout, start, start + 40000);
  assert.equal(slice.coverage, 0.5);
  assert.equal(heartRate.sliceForWindow(workout, start + 3600000, start + 3700000).samples.length, 0);
});

test("summarize: media pesa pelo tempo e ignora falhas longas", () => {
  assert.equal(heartRate.summarize([]), null);
  const steady = heartRate.summarize([{ t: 0, hr: 100 }, { t: 10, hr: 200 }, { t: 20, hr: 200 }]);
  assert.deepEqual({ avg: steady.avg, max: steady.max, min: steady.min }, { avg: 150, max: 200, min: 100 });
  const gap = heartRate.summarize([{ t: 0, hr: 100 }, { t: 600, hr: 160 }]);
  assert.equal(gap.avg, 100);
  assert.equal(heartRate.summarize([{ t: 0, hr: 140 }]).avg, 140);
});

test("heartRateAt: interpola, aplica o ajuste e devolve null sem leitura perto", () => {
  const samples = [{ t: 0, hr: 100 }, { t: 10, hr: 120 }, { t: 100, hr: 150 }];
  assert.equal(heartRateAt(samples, 5), 110);
  assert.equal(heartRateAt(samples, 0), 100);
  assert.equal(heartRateAt(samples, 5, 5), 120);
  assert.equal(heartRateAt(samples, 50), null);
  assert.equal(heartRateAt(samples, 103), 150);
  assert.equal(heartRateAt([], 3), null);
  function heartRateAt(list, t, offset) { return heartRate.heartRateAt(list, t, offset); }
});

test("downsample: media por intervalo", () => {
  const out = heartRate.downsample([{ t: 0, hr: 100 }, { t: 2, hr: 110 }, { t: 6, hr: 120 }, { t: 12, hr: 130 }], 5);
  assert.deepEqual(out, [{ t: 0, hr: 105 }, { t: 5, hr: 120 }, { t: 10, hr: 130 }]);
});

// ---- FIT: ficheiro construido a mao (cabecalho, definicoes e dados) ----
const FIT_EPOCH = 631065600;
const fitSeconds = (iso) => Date.parse(iso) / 1000 - FIT_EPOCH;

function fitFile(messages, { header = 14 } = {}) {
  const body = Buffer.concat(messages);
  const head = Buffer.alloc(header);
  head[0] = header;
  head[1] = 0x20;
  head.writeUInt32LE(body.length, 4);
  head.write(".FIT", 8, "latin1");
  return new Uint8Array(Buffer.concat([head, body, Buffer.from([0, 0])]));
}

// Definicao de "record" (mensagem global 20) com hora (253), batimentos (3) e um campo de distancia (5, 4 bytes).
function fitRecordDefinition(local, { little = true, developer = false } = {}) {
  const global = Buffer.alloc(2);
  if (little) global.writeUInt16LE(20); else global.writeUInt16BE(20);
  const parts = [Buffer.from([0x40 | local | (developer ? 0x20 : 0), 0, little ? 0 : 1]), global, Buffer.from([3]),
    Buffer.from([253, 4, 0x86, 3, 1, 0x02, 5, 4, 0x86])];
  if (developer) parts.push(Buffer.from([1, 0, 2, 0]));
  return Buffer.concat(parts);
}

function fitRecord(local, iso, hr, { little = true, developer = false } = {}) {
  const data = Buffer.alloc(9);
  if (little) data.writeUInt32LE(fitSeconds(iso), 0); else data.writeUInt32BE(fitSeconds(iso), 0);
  data[4] = hr;
  const parts = [Buffer.from([local]), data];
  if (developer) parts.push(Buffer.from([7, 7]));
  return Buffer.concat(parts);
}

test("le FIT: tempo e FC das mensagens record", () => {
  const bytes = fitFile([
    fitRecordDefinition(0),
    fitRecord(0, "2026-10-28T21:00:00Z", 100),
    fitRecord(0, "2026-10-28T21:00:05Z", 130),
    fitRecord(0, "2026-10-28T21:00:09Z", 255),
  ]);
  const result = heartRate.parseWorkout(bytes);
  assert.equal(result.ok, true);
  assert.equal(result.format, "fit");
  assert.equal(result.startedAtMs, Date.parse("2026-10-28T21:00:00Z"));
  assert.deepEqual(result.samples, [{ t: 0, hr: 100 }, { t: 5, hr: 130 }]);
});

test("le FIT: cabecalho de 12 bytes, big-endian e campos de programador", () => {
  for (const options of [{ little: false }, { developer: true }]) {
    const bytes = fitFile([
      fitRecordDefinition(2, options),
      fitRecord(2, "2026-10-28T21:00:00Z", 90, options),
      fitRecord(2, "2026-10-28T21:00:02Z", 95, options),
    ], { header: 12 });
    assert.deepEqual(heartRate.parseWorkout(bytes).samples, [{ t: 0, hr: 90 }, { t: 2, hr: 95 }]);
  }
});

test("le FIT: hora comprimida e mensagens de outros tipos sao ignoradas", () => {
  const other = Buffer.concat([Buffer.from([0x41, 0, 0, 21, 0, 1, 0, 1, 0x02]), Buffer.from([1, 9])]);
  // Definicao de record sem hora (so FC), com hora comprimida no cabecalho do dado: 0x80 | local<<5 | deslocamento.
  const compactDef = Buffer.from([0x40 | 1, 0, 0, 20, 0, 1, 3, 1, 0x02]);
  const base = fitSeconds("2026-10-28T21:00:00Z");
  const bytes = fitFile([
    fitRecordDefinition(0),
    fitRecord(0, "2026-10-28T21:00:00Z", 100),
    other,
    compactDef,
    Buffer.from([0x80 | (1 << 5) | ((base + 4) & 0x1f), 110]),
    Buffer.from([0x80 | (1 << 5) | ((base + 8) & 0x1f), 120]),
  ]);
  assert.deepEqual(heartRate.parseWorkout(bytes).samples, [{ t: 0, hr: 100 }, { t: 4, hr: 110 }, { t: 8, hr: 120 }]);
});

test("FIT estragado ou so texto em bytes", () => {
  const bad = fitFile([fitRecordDefinition(0), Buffer.from([5, 1, 2])]);
  assert.equal(heartRate.parseWorkout(bad).ok, false);
  const asBytes = new TextEncoder().encode(tcx(point(0, 100) + point(5, 120)));
  assert.equal(heartRate.parseWorkout(asBytes).format, "tcx");
  assert.equal(heartRate.parseWorkout(asBytes.buffer).ok, true);
});

test("zonas: limites a 60, 70, 80 e 90 por cento da FC maxima", () => {
  const zone = (bpm) => heartRate.zoneFor(bpm, 200).zone;
  assert.deepEqual([100, 119, 120, 139, 140, 159, 160, 179, 180, 200].map(zone), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(heartRate.zoneFor(150, 0), null);
  assert.equal(heartRate.zoneFor(NaN, 200), null);
  assert.equal(heartRate.ZONES.length, 5);
});

test("zoneSeconds: tempo em cada zona, sem contar falhas longas", () => {
  const samples = [{ t: 0, hr: 100 }, { t: 10, hr: 150 }, { t: 20, hr: 190 }, { t: 400, hr: 190 }];
  assert.deepEqual(heartRate.zoneSeconds(samples, 200), [10, 0, 10, 0, 15]);
});
