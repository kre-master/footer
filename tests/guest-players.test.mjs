import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { webcrypto } from "node:crypto";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8")
  .replace("bindEvents();\ninitApp();", "").replace("bindEvents();\r\ninitApp();", "");

function playerRow(overrides = {}) {
  return { id: "existing", name: "Hélder", pace: 81, shooting: 60, passing: 62,
    dribbling: 70, defending: 65, physical: 63, overall: 67, photo_data_url: "photo",
    linked_user_id: "account", is_guest: false, guest_score_0_to_10: null, ...overrides };
}

function setup({ rows = [], remote = false, admin = true, failure = null, readGate = null } = {}) {
  const stored = new Map();
  const alerts = [];
  const calls = [];
  const dbRows = rows.map((r) => ({ ...r }));
  const button = { disabled: false };
  const context = createContext({ console, crypto: webcrypto, Intl,
    URLSearchParams,
    window: { FIVE5_CONFIG: {}, location: { search: "" }, crypto: webcrypto, addEventListener() {} },
    document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } },
    localStorage: { getItem: (k) => stored.get(k) || null, setItem: (k, v) => stored.set(k, v) },
    alert: (message) => alerts.push(message),
    fakeSupabase: { from(table) {
      let operation = "read";
      let payload;
      let id;
      const builder = {
        select() {
          if (operation !== "read") return builder;
          calls.push({ operation, table });
          const result = { data: dbRows.map((r) => ({ ...r })), error: failure === "read" ? new Error("read failed") : null };
          return readGate ? readGate.then(() => result) : Promise.resolve(result);
        },
        insert(row) { operation = "insert"; payload = row; return builder; },
        update(row) { operation = "update"; payload = row; return builder; },
        eq(column, value) { assert.equal(column, "id"); id = value; return builder; },
        async single() {
          calls.push({ operation, table, payload });
          if (failure === operation) return { data: null, error: new Error(`${operation} failed`) };
          if (operation === "insert") { dbRows.push({ ...payload }); return { data: payload, error: null }; }
          const row = dbRows.find((r) => r.id === id);
          Object.assign(row, payload);
          return { data: { ...row }, error: null };
        },
      };
      return builder;
    } },
    guestName: { value: "" }, guestScore: { value: "" }, button,
    hint: { textContent: "", className: "" },
  });
  runInContext(source, context);
  runInContext(`state.players = []; state.games = []; state.events = [];
    remoteEnabled = ${remote}; isAdmin = ${admin}; supabaseClient = fakeSupabase;
    render = () => {}; els.guestName = guestName; els.guestScore = guestScore;
    els.addGuest = button; els.selectionHint = hint;`, context);
  return { context, stored, alerts, calls, dbRows, button,
    run: (code) => runInContext(code, context),
    json: (code) => JSON.parse(runInContext(`JSON.stringify(${code})`, context)),
  };
}

test("new guest becomes a persisted player without an account", async () => {
  const app = setup({ remote: true });
  const player = await app.run('createOrReuseGuestPlayer("  Amigo  Novo ", "6.5")');
  assert.equal(player.name, "Amigo Novo");
  assert.equal(player.overall, 60);
  assert.equal(player.isGuest, false);
  assert.equal(player.linkedUserId, null);
  assert.match(player.id, /^p-/);
  assert.equal(app.dbRows.length, 1);
  assert.equal(app.json("state.players.length"), 1);
  assert.ok(app.stored.has("five-a-side-balancer-state-v1"));
});

test("normalized existing names reuse the ID and preserve attributes and account", async () => {
  const existing = playerRow();
  const app = setup({ remote: true, rows: [existing] });
  const player = await app.run('createOrReuseGuestPlayer("  HELDER ", "10")');
  assert.equal(player.id, existing.id);
  assert.equal(player.pace, existing.pace);
  assert.equal(player.overall, existing.overall);
  assert.equal(player.photoDataUrl, existing.photo_data_url);
  assert.equal(player.linkedUserId, existing.linked_user_id);
  assert.equal(app.calls.filter((c) => c.operation !== "read").length, 0);
});

test("an existing player needs no quick score and accents/spaces match", async () => {
  const app = setup({ remote: true, rows: [playerRow({ name: "José  Manuel" })] });
  const player = await app.run('createOrReuseGuestPlayer("jose manuel", "")');
  assert.equal(player.id, "existing");
});

test("legacy guest promotion only changes guest flag", async () => {
  const existing = playerRow({ is_guest: true, linked_user_id: null });
  const app = setup({ remote: true, rows: [existing] });
  const player = await app.run('createOrReuseGuestPlayer("helder", "1")');
  assert.equal(player.isGuest, false);
  assert.equal(player.id, existing.id);
  assert.equal(player.overall, existing.overall);
  const update = app.calls.find((c) => c.operation === "update");
  assert.deepEqual(Object.keys(update.payload).sort(), ["is_guest", "updated_at"]);
});

test("ambiguous names cannot silently merge different players", async () => {
  const app = setup({ remote: true, rows: [playerRow(), playerRow({ id: "other", name: "Helder" })] });
  await assert.rejects(app.run('createOrReuseGuestPlayer("helder", "6")'), /varios perfis/);
  assert.equal(app.calls.filter((c) => c.operation !== "read").length, 0);
  assert.equal(app.json("state.players.length"), 0);
});

// Notas escondidas em todos os clubes (2026-11-11): um jogador novo entra sempre com a base 60.
test("with ratings hidden every new player starts at the base, whatever score is typed", async () => {
  for (const score of ["", " ", null, "NaN", "-1", "6.5", "100"]) {
    const app = setup();
    assert.equal((await app.run(`createOrReuseGuestPlayer("Novo", ${JSON.stringify(score)})`)).overall, 60);
    assert.equal(app.json("state.players.length"), 1);
  }
});

test("read and insert failures leave no local-only official player", async () => {
  for (const failure of ["read", "insert"]) {
    const app = setup({ remote: true, failure });
    await assert.rejects(app.run('createOrReuseGuestPlayer("Novo", "7")'), /failed/);
    assert.equal(app.json("state.players.length"), 0);
    assert.equal(app.dbRows.length, 0);
    assert.equal(app.json("pendingGuestPlayers.size"), 0);
  }
});

test("concurrent requests for the same normalized name share one insert", async () => {
  let release;
  const readGate = new Promise((resolve) => { release = resolve; });
  const app = setup({ remote: true, readGate });
  const first = app.run('createOrReuseGuestPlayer("José", "7")');
  const second = app.run('createOrReuseGuestPlayer("JOSE", "9")');
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.id, b.id);
  assert.equal(app.dbRows.length, 1);
  assert.equal(app.calls.filter((c) => c.operation === "insert").length, 1);
});

test("local mode preserves one persistent identity across additions", async () => {
  const app = setup();
  const a = await app.run('createOrReuseGuestPlayer("Amigo", "6")');
  const b = await app.run('createOrReuseGuestPlayer("amigo", "")');
  assert.equal(a.id, b.id);
  assert.equal(app.json("state.players.length"), 1);
  assert.equal(b.isGuest, false);
});

test("visitors cannot create an official remote player", async () => {
  const app = setup({ remote: true, admin: false });
  await assert.rejects(app.run('createOrReuseGuestPlayer("Novo", "7")'), /admin/);
  assert.equal(app.calls.length, 0);
});

test("generator handler selects persisted profile and reports storage failure", async () => {
  const app = setup({ remote: true });
  app.run('guestName.value = "Novo"; guestScore.value = "7";');
  await app.run("addGuest()");
  assert.equal(app.json("selectedIds.size"), 1);
  assert.equal(app.context.guestName.value, "");
  assert.equal(app.button.disabled, false);
  const failed = setup({ remote: true, failure: "insert" });
  failed.run('guestName.value = "Novo"; guestScore.value = "7";');
  await failed.run("addGuest()");
  assert.equal(failed.json("selectedIds.size"), 0);
  assert.equal(failed.context.guestName.value, "Novo");
  assert.match(failed.context.hint.textContent, /insert failed/);
  assert.equal(failed.button.disabled, false);
});

test("event failure retains the saved profile for retry", async () => {
  const app = setup({ remote: true });
  app.run(`guestName.value = "Novo"; guestScore.value = "7";
    els.eventsList = { querySelector(selector) {
      return selector.includes("-btn") ? button : selector.includes("-name") ? guestName : guestScore;
    } };
    saveEventResponseForPlayer = async () => { throw new Error("Evento cheio"); };`);
  await app.run('addGuestToEvent("event")');
  assert.equal(app.dbRows.length, 1);
  assert.equal(app.json("state.players.length"), 1);
  assert.match(app.alerts[0], /perfil de Novo ficou guardado/);
  assert.equal(app.button.disabled, false);
});
