import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { webcrypto } from "node:crypto";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8")
  .replace("bindEvents();\ninitApp();", "").replace("bindEvents();\r\ninitApp();", "");

function setup() {
  const stored = new Map();
  const calls = [];
  const fakeSupabase = {
    from(table) {
      return {
        upsert(rows) { calls.push({ table, op: "upsert", rows }); return Promise.resolve({ error: null }); },
        update(payload) {
          return { eq(column, value) { calls.push({ table, op: "update", payload, column, value }); return Promise.resolve({ error: null }); } };
        },
        select(columns) {
          return {
            eq(column, value) {
              return {
                maybeSingle() {
                  calls.push({ table, op: "select", columns, column, value });
                  return Promise.resolve({ data: { photo_data_url: "data:image/jpeg;base64,GRANDE" }, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
  const context = createContext({
    console, crypto: webcrypto, Intl, URL, URLSearchParams, fakeSupabase,
    window: { FIVE5_CONFIG: {}, crypto: webcrypto, addEventListener() {}, localStorage: null, location: { search: "", href: "http://localhost/", pathname: "/", origin: "http://localhost" } },
    document: { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, body: null },
    localStorage: { getItem: (key) => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
    alert() {},
  });
  runInContext(source, context);
  runInContext("supabaseClient = fakeSupabase; remoteEnabled = true;", context);
  const run = (code) => runInContext(code, context);
  return { run, stored, calls };
}

const player = (overrides = {}) => `({ id: "p1", name: "Ana", pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, overall: 60,
  photoDataUrl: "", photoThumb: "", photoSize: 0, linkedUserId: null, isGuest: false, guestScore0To10: null, ...${JSON.stringify(overrides)} })`;

test("base antiga: a foto vai na linha como sempre", () => {
  const { run } = setup();
  const row = run(`photoThumbsAvailable = false; playerToRow(${player({ photoDataUrl: "data:x" })})`);
  assert.equal(row.photo_data_url, "data:x");
  assert.equal("photo_thumb" in row, false);
});

test("com miniaturas: o lote nunca leva as fotos (um upsert sem a foto grande carregada apagava-a)", () => {
  const { run } = setup();
  const row = run(`photoThumbsAvailable = true; playerToRow(${player({ photoDataUrl: "", photoThumb: "t", photoSize: 900 })})`);
  assert.equal("photo_data_url" in row, false);
  assert.equal("photo_thumb" in row, false);
});

test("com miniaturas: so as fotos alteradas se gravam, a parte, e a marca limpa-se", async () => {
  const { run, calls } = setup();
  await run(`
    photoThumbsAvailable = true;
    state.players = [
      ${player({ id: "a", photoThumb: "ta", photoSize: 900 })},
      ${player({ id: "b", photoDataUrl: "data:novo", photoThumb: "tb", photoSize: 8, photoDirty: true })},
    ];
    saveRemoteState();
  `);
  const upsert = calls.find((call) => call.table === "players" && call.op === "upsert");
  assert.equal(upsert.rows.length, 2);
  assert.ok(upsert.rows.every((row) => !("photo_data_url" in row) && !("photo_thumb" in row)));
  const updates = calls.filter((call) => call.table === "players" && call.op === "update");
  assert.equal(updates.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(updates[0].payload)), { photo_data_url: "data:novo", photo_thumb: "tb" });
  assert.equal(updates[0].value, "b");
  assert.equal(run("state.players[1].photoDirty"), undefined);
});

test("copia local: com miniatura nao guarda a foto grande; sem ela guarda", () => {
  const { run, stored } = setup();
  run(`
    photoThumbsAvailable = true;
    state.players = [
      ${player({ id: "a", photoDataUrl: "GRANDE-A", photoThumb: "ta" })},
      ${player({ id: "b", photoDataUrl: "GRANDE-B", photoThumb: "" })},
    ];
    saveState();
  `);
  const saved = JSON.parse(stored.get("five-a-side-balancer-state-v1"));
  assert.equal(saved.players[0].photoDataUrl, "");
  assert.equal(saved.players[0].photoThumb, "ta");
  assert.equal(saved.players[1].photoDataUrl, "GRANDE-B");
  assert.equal(run("state.players[0].photoDataUrl"), "GRANDE-A");
});

test("foto grande: pede-se uma so vez e fica em memoria", async () => {
  const { run, calls } = setup();
  run(`photoThumbsAvailable = true; state.players = [${player({ id: "a", photoThumb: "ta", photoSize: 900 })}];`);
  const first = await run(`getFullPhotoSrc(state.players[0])`);
  const second = await run(`getFullPhotoSrc(state.players[0])`);
  assert.equal(first, "data:image/jpeg;base64,GRANDE");
  assert.equal(second, first);
  assert.equal(calls.filter((call) => call.op === "select").length, 1);
});

test("mostrar: a miniatura tem prioridade e jogador sem foto nao pede nada", () => {
  const { run } = setup();
  assert.equal(run(`getPlayerPhotoSrc(${player({ photoThumb: "t", photoDataUrl: "grande" })})`), "t");
  assert.equal(run(`getPlayerPhotoSrc(${player({ photoDataUrl: "grande" })})`), "grande");
  assert.equal(run(`hasPlayerPhoto(${player({ photoSize: 5 })})`), true);
  assert.equal(run(`hasPlayerPhoto(${player()})`), false);
});

test("percursos: marca a referencia, repoe o que ja foi pedido e desenha o espaco enquanto falta", () => {
  const { run } = setup();
  const result = run(`
    trackingPathCache.clear();
    trackingPathCache.set("r1|L1", [[0, 1, 2], [2, 3, 4]]);
    const row = { id: "r1", result: { players: [{ label: "L0", timeline: { sprints: [] } }, { label: "L1", timeline: { sprints: [] } }, { label: "L2" }, { label: "L3", timeline: { sprints: [], path: [[0, 9, 9]] } }] } };
    markTrackingPathRefs(row);
    row.result.players.map((p) => [p.label, p.timeline?.pathRef || null, Array.isArray(p.timeline?.path) ? p.timeline.path.length : null]);
  `);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [["L0", "r1|L0", null], ["L1", null, 2], ["L2", null, null], ["L3", null, 1]]);
  const slot = run(`renderPlayerPath({ pathRef: "r1|L0", sprints: [] }, 0, 1800)`);
  assert.match(slot, /data-path-slot data-path-ref="r1\|L0" data-path-from="0" data-path-to="1800"/);
  assert.equal(run(`renderPlayerPath({ sprints: [] }, 0, 1800)`).includes("data-path-slot"), false);
  const svg = run(`renderPlayerPath({ path: [[0, 1, 2], [2, 3, 4]], sprints: [] }, 0, 1800)`);
  assert.match(svg, /<svg class="tracking-heatmap"/);
});
