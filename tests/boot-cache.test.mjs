import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { webcrypto } from "node:crypto";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8")
  .replace("bindEvents();\ninitApp();", "").replace("bindEvents();\r\ninitApp();", "");

const KEY = "footer-boot-cache-v1";

function setup({ session = { user: { id: "u1" } }, fastTimeout = false, online = true } = {}) {
  const stored = new Map();
  const listeners = [];
  const classes = new Set();
  const fakeSupabase = {
    auth: {
      getSession: async () => ({ data: { session } }),
      signOut: async () => {},
    },
  };
  const context = createContext({
    navigator: { onLine: online },
    console: { ...console, warn() {} }, crypto: webcrypto, Intl, URL, URLSearchParams, fakeSupabase, clearTimeout, setTimeout: fastTimeout ? (fn, ms) => setTimeout(fn, ms >= 5000 ? 0 : ms) : setTimeout,
    window: {
      FIVE5_CONFIG: { supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "k" }, crypto: webcrypto, addEventListener() {}, localStorage: null,
      supabase: { createClient: () => fakeSupabase },
      location: { search: "", href: "http://localhost/", pathname: "/", origin: "http://localhost" },
    },
    document: {
      querySelector() { return null; }, querySelectorAll() { return []; }, body: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), toggle() {} } },
      addEventListener: (name, handler, capture) => listeners.push({ name, handler, capture, on: true }),
      removeEventListener: (name) => listeners.push({ name, on: false }),
    },
    localStorage: { getItem: (k) => (stored.has(k) ? stored.get(k) : null), setItem: (k, v) => stored.set(k, v), removeItem: (k) => stored.delete(k) },
    alert() {},
  });
  context.window.localStorage = context.localStorage;
  runInContext(source, context);
  const run = (code) => runInContext(code, context);
  run(`var realRender = render; supabaseClient = fakeSupabase; updateAccessUi = () => {}; render = () => { renderCalls += 1; }; var renderCalls = 0;`);
  return { run, stored, listeners, classes };
}

const player = (id, extra = "") => `{ id: "${id}", name: "${id}", pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, overall: 60, photoDataUrl: "", photoThumb: "t-${id}", photoSize: 9, linkedUserId: null, isGuest: false, guestScore0To10: null${extra} }`;

// Carrega variaveis de uma conta admin com dados e grava a copia como o fim de loadRemoteState faria.
function fill(run, userId = "u1") {
  run(`
    remoteEnabled = true; photoThumbsAvailable = true;
    currentSession = { user: { id: "${userId}" } };
    currentProfile = { id: "${userId}", username: "ana" };
    myGroups = [{ id: "g1", slug: "futeboleiros", name: "Futeboleiros", role: "admin" }];
    activeGroupId = "g1"; groupsLoadedOk = true; isAdmin = true;
    groupMemberRoles = new Map([["u1", "admin"], ["u2", "player"]]);
    requesterTraits = new Map([["u3", { fitness: "regular" }]]);
    state.players = [${player("p1")}, ${player("p2", ', photoDataUrl: "GRANDE"')}];
    eventResponses = [{ id: "r1", eventId: "e1", playerId: "p1", userId: "u1", status: "going", updatedAt: "2026-11-06T10:00:00Z" }];
    mvpVoteCounts = [{ gameId: "g1", candidatePlayerId: "p1", votes: 2 }];
    trackingStore = { g1: { id: "t1", status: "published", result: { players: [{ label: "L0", timeline: { pathRef: "t1|L0" } }] }, mapping: {} } };
    homeVideoIndex = { futeboleiros: { "2026-11-01": { video: "a.mp4" } } };
    bootCacheReady = true;
    saveBootCache();
  `);
}

test("so grava a copia depois de uma carga completa e com sessao", () => {
  const { run, stored } = setup();
  run(`remoteEnabled = true; currentSession = { user: { id: "u1" } }; saveBootCache();`);
  assert.equal(stored.has(KEY), false);
  fill(run);
  assert.equal(stored.has(KEY), true);
  const saved = JSON.parse(stored.get(KEY));
  assert.equal(saved.userId, "u1");
  assert.equal(saved.remote.state.players[1].photoDataUrl, "", "a foto grande nao vai na copia quando ha miniatura");
});

test("arranque a quente: aplica a copia da mesma conta (incluindo Map e miniaturas)", async () => {
  const first = setup();
  fill(first.run);
  const second = setup();
  second.stored.set(KEY, first.stored.get(KEY));
  assert.equal(await second.run("warmStart()"), true);
  assert.equal(second.run("isAdmin"), true);
  assert.equal(second.run("activeGroupId"), "g1");
  assert.equal(second.run("groupMemberRoles instanceof Map && groupMemberRoles.get('u2')"), "player");
  assert.equal(second.run("requesterTraits.get('u3').fitness"), "regular");
  assert.equal(second.run("state.players.length"), 2);
  assert.equal(second.run("state.players[0].photoThumb"), "t-p1");
  assert.equal(second.run("eventResponses[0].status"), "going");
  assert.equal(second.run("trackingStore.g1.result.players[0].timeline.pathRef"), "t1|L0");
  assert.equal(second.run("homeVideoIndex.futeboleiros['2026-11-01'].video"), "a.mp4");
  assert.equal(second.run("currentSession.user.id"), "u1");
});

test("arranque a quente: recusa copia de outra conta e apaga-a", async () => {
  const first = setup();
  fill(first.run, "u1");
  const other = setup({ session: { user: { id: "u9" } } });
  other.stored.set(KEY, first.stored.get(KEY));
  assert.equal(await other.run("warmStart()"), false);
  assert.equal(other.stored.has(KEY), false);
  assert.equal(other.run("isAdmin"), false);
});

test("arranque a quente: recusa sem sessao, versao antiga, copia velha e convite por abrir", async () => {
  const first = setup();
  fill(first.run);
  const raw = first.stored.get(KEY);
  const withEdit = (edit) => { const copy = JSON.parse(raw); edit(copy); return JSON.stringify(copy); };

  const noSession = setup({ session: null });
  noSession.stored.set(KEY, raw);
  assert.equal(await noSession.run("warmStart()"), false);

  const oldVersion = setup();
  oldVersion.stored.set(KEY, withEdit((c) => { c.v = 0; }));
  assert.equal(await oldVersion.run("warmStart()"), false);

  const tooOld = setup();
  tooOld.stored.set(KEY, withEdit((c) => { c.at = Date.now() - 15 * 24 * 3600 * 1000; }));
  assert.equal(await tooOld.run("warmStart()"), false);

  const broken = setup();
  broken.stored.set(KEY, "{nao e json");
  assert.equal(await broken.run("warmStart()"), false);
  assert.equal(broken.stored.has(KEY), false);

  const invite = setup();
  invite.stored.set(KEY, raw);
  invite.stored.set("footer-pending-invite", "codigo");
  const inviteKey = invite.run("PENDING_INVITE_KEY");
  invite.stored.set(inviteKey, "codigo");
  assert.equal(await invite.run("warmStart()"), false);
});

test("durante a actualizacao nao se desenha nem se aceitam toques", () => {
  const { run } = setup();
  // render() verdadeiro: com a actualizacao activa sai logo (sem tocar no DOM) e fica marcado para desenhar no fim.
  run("bootRefreshActive = true; bootRefreshDirty = false; realRender();");
  assert.equal(run("bootRefreshDirty"), true);
  const event = { stopped: false, prevented: false, stopImmediatePropagation() { this.stopped = true; }, preventDefault() { this.prevented = true; } };
  run("swallowDuringBootRefresh")(event);
  assert.equal(event.stopped && event.prevented, true);
});

test("actualizacao falhada: volta a copia e liberta o ecra", async () => {
  const first = setup();
  fill(first.run);
  const { run, stored, listeners, classes } = setup();
  stored.set(KEY, first.stored.get(KEY));
  assert.equal(await run("warmStart()"), true);
  // A rede falha: o carregamento esvazia o que tinha e desliga o modo remoto.
  run(`initRemote = async () => { currentProfile = null; myGroups = []; isAdmin = false; groupsLoadedOk = false; state = migrateState({ players: [], games: [] }, { allowSample: false }); remoteEnabled = false; };`);
  await run("refreshAfterWarmStart()");
  assert.equal(run("isAdmin"), true);
  assert.equal(run("myGroups.length"), 1);
  assert.equal(run("remoteEnabled"), true);
  assert.equal(run("state.players.length"), 2);
  assert.equal(run("bootRefreshActive"), false);
  assert.equal(classes.has("boot-refreshing"), false);
  // So os de bloqueio: em captura, e removidos todos no fim.
  assert.deepEqual(listeners.filter((l) => l.on && l.capture === true).map((l) => l.name), ["click", "submit", "change"]);
  assert.deepEqual(listeners.filter((l) => !l.on && ["click", "submit", "change"].includes(l.name)).map((l) => l.name), ["click", "submit", "change"]);
});

test("actualizacao bem sucedida sem alteracoes: nao redesenha; com alteracoes: redesenha uma vez", async () => {
  const first = setup();
  fill(first.run);
  for (const changed of [false, true]) {
    const { run, stored } = setup();
    stored.set(KEY, first.stored.get(KEY));
    await run("warmStart()");
    run(`initRemote = async () => { ${changed ? 'eventResponses = [...eventResponses, { id: "r2", eventId: "e1", playerId: "p2", userId: "u2", status: "going", updatedAt: "x" }];' : ""} };`);
    run("renderCalls = 0");
    await run("refreshAfterWarmStart()");
    assert.equal(run("renderCalls"), changed ? 1 : 0);
  }
});

test("sair da conta apaga a copia", async () => {
  const first = setup();
  fill(first.run);
  assert.equal(first.stored.has(KEY), true);
  await first.run("adminLogout()");
  assert.equal(first.stored.has(KEY), false);
  assert.equal(first.run("bootCacheReady"), false);
});

test("rede pendurada: ao fim do limite volta a copia e liberta os toques", async () => {
  const first = setup();
  fill(first.run);
  const { run, stored, classes } = setup({ fastTimeout: true });
  stored.set(KEY, first.stored.get(KEY));
  assert.equal(await run("warmStart()"), true);
  run("initRemote = () => new Promise(() => {});");
  await run("refreshAfterWarmStart()");
  assert.equal(run("bootRefreshActive"), false);
  assert.equal(classes.has("boot-refreshing"), false);
  assert.equal(run("isAdmin"), true);
  assert.equal(run("remoteEnabled"), true);
});

test("o ultimo toque ignorado repete-se no fim se o elemento continua no ecra", async () => {
  const first = setup();
  fill(first.run);
  for (const connected of [true, false]) {
    const { run, stored } = setup();
    stored.set(KEY, first.stored.get(KEY));
    await run("warmStart()");
    run(`globalThis.clicks = 0; initRemote = async () => {
      const button = { isConnected: ${connected}, click() { globalThis.clicks += 1; } };
      swallowDuringBootRefresh({ type: "click", stopImmediatePropagation() {}, preventDefault() {}, target: { closest: () => button } });
    };`);
    await run("refreshAfterWarmStart()");
    assert.equal(run("globalThis.clicks"), connected ? 1 : 0);
  }
});

test("sem rede declarada pelo browser: fica a copia e nao se bloqueia nada", async () => {
  const first = setup();
  fill(first.run);
  const { run, stored, listeners, classes } = setup({ online: false });
  stored.set(KEY, first.stored.get(KEY));
  assert.equal(await run("warmStart()"), true);
  run("globalThis.loaded = false; initRemote = async () => { globalThis.loaded = true; };");
  await run("refreshAfterWarmStart()");
  assert.equal(run("globalThis.loaded"), false);
  assert.equal(run("isAdmin"), true);
  assert.equal(classes.has("boot-refreshing"), false);
  assert.equal(listeners.filter((l) => l.on && l.capture === true).length, 0);
});
