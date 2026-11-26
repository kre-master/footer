import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { webcrypto } from "node:crypto";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8")
  .replace(/bindEvents\(\);\r?\ninitApp\(\);/, "");

function setup({ admin = true, remote = false, response = "maybe", eventStatus = "open", full = false, failure = false } = {}) {
  const alerts = [];
  const writes = [];
  const buttons = [
    { disabled: full, dataset: { eventId: "event", playerId: "player" } },
    { disabled: false, dataset: { eventId: "event", playerId: "other" } },
  ];
  const context = createContext({
    console, Intl, crypto: webcrypto,
    URLSearchParams,
    window: { FIVE5_CONFIG: {}, location: { search: "" }, crypto: webcrypto, addEventListener() {} },
    document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } },
    localStorage: { getItem() { return null; }, setItem() {} },
    alert: (message) => alerts.push(message), buttons,
    fakeSupabase: { from(table) {
      assert.equal(table, "event_responses");
      return { async upsert(row, options) {
        writes.push({ row, options });
        return { error: failure ? new Error("write failed") : null };
      } };
    } },
  });
  const run = (code) => runInContext(code, context);
  run(source);
  run(`state.players = [{ id: "player", name: "Jogador", overall: 70 }];
    state.games = [];
    state.events = [{ id: "event", title: "Jogo", maxPlayers: 2, minPlayers: 2, status: ${JSON.stringify(eventStatus)} }];
    eventResponses = [{ id: "response", eventId: "event", playerId: "player", userId: "original-account", status: ${JSON.stringify(response)} }];
    remoteEnabled = ${remote}; isAdmin = ${admin}; supabaseClient = fakeSupabase;
    els.eventsList = { querySelectorAll: () => buttons };
    render = () => {};
    renderAvatar = () => "";
    renderCardHaloClass = () => "";
    loadRemoteState = async () => { remoteLoads += 1; };
    var remoteLoads = 0;`);
  if (full) run(`eventResponses.push(
    { eventId: "event", playerId: "a", status: "going" },
    { eventId: "event", playerId: "b", status: "going" }
  );`);
  return { run, alerts, writes, buttons,
    json: (code) => JSON.parse(run(`JSON.stringify(${code})`)),
  };
}

for (const response of ["maybe", "not_going"]) {
  test(`admin confirms a player who answered ${response}`, async () => {
    const app = setup({ response });
    await app.run('saveAdminEventResponse("event", "player", "going")');
    assert.equal(app.run('getEventGoingCount("event")'), 1);
    assert.equal(app.run('getResponseForPlayer("event", "player").userId'), "original-account");
    assert.equal(app.run("currentEventId"), "event");
    assert.equal(app.alerts.length, 0);
  });
}

test("admin removes a confirmed player and frees a place", async () => {
  const app = setup({ response: "going" });
  app.run('eventResponses.push({ eventId: "event", playerId: "other", status: "going" })');
  await app.run('saveAdminEventResponse("event", "player", "not_going")');
  assert.equal(app.run('getResponseForPlayer("event", "player").status'), "not_going");
  assert.equal(app.run('getEventGoingCount("event")'), 1);
  assert.equal(app.run('getEventResponses("event").length'), 2);
});

test("full event rejects confirmation without changing the response or calling the API", async () => {
  const app = setup({ full: true, remote: true });
  await app.run('saveAdminEventResponse("event", "player", "going")');
  assert.equal(app.run('getResponseForPlayer("event", "player").status'), "maybe");
  assert.equal(app.writes.length, 0);
  assert.match(app.alerts[0], /Limite de 2/);
  assert.deepEqual(app.buttons.map((button) => button.disabled), [true, false]);
});

test("non-admin cannot adjust another player's response", async () => {
  const app = setup({ admin: false, remote: true });
  await app.run('saveAdminEventResponse("event", "player", "going")');
  assert.equal(app.writes.length, 0);
  assert.equal(app.run('getResponseForPlayer("event", "player").status'), "maybe");
});

for (const eventStatus of ["cancelled", "completed"]) {
  test(`admin cannot adjust a ${eventStatus} event`, async () => {
    const app = setup({ eventStatus, remote: true });
    await app.run('saveAdminEventResponse("event", "player", "going")');
    assert.equal(app.writes.length, 0);
    assert.doesNotMatch(app.run('renderRosterMini("Talvez", state.players, state.events[0], "maybe")'), /data-event-admin-response/);
  });
}

test("remote adjustment preserves vote account and uses the existing unique response", async () => {
  const app = setup({ remote: true });
  await app.run('saveAdminEventResponse("event", "player", "going")');
  assert.equal(app.writes.length, 1);
  assert.equal(app.writes[0].row.user_id, "original-account");
  assert.equal(app.writes[0].row.status, "going");
  assert.equal(app.writes[0].options.onConflict, "event_id,player_id");
  assert.equal(app.run("remoteLoads"), 1);
});

test("remote failure keeps previous response and restores buttons", async () => {
  const app = setup({ remote: true, failure: true });
  await app.run('saveAdminEventResponse("event", "player", "going")');
  assert.equal(app.run('getResponseForPlayer("event", "player").status'), "maybe");
  assert.equal(app.run("remoteLoads"), 0);
  assert.match(app.alerts[0], /write failed/);
  assert.deepEqual(app.buttons.map((button) => button.disabled), [false, false]);
  assert.ok(app.buttons.every((button) => !button.dataset.busy));
});

test("roster shows separate profile and adjustment buttons only to admins", () => {
  const app = setup({ full: true });
  const html = app.run('renderRosterMini("Talvez", state.players, state.events[0], "maybe")');
  assert.match(html, /data-open-player="player"/);
  assert.match(html, /data-event-admin-response="going"[^>]*disabled/);
  assert.match(html, />Confirmar<\/button>/);
  assert.match(app.run('renderRosterMini("Vou", state.players, state.events[0], "going")'), /data-event-admin-response="not_going"[^>]*>Remover<\/button>/);
  app.run("isAdmin = false");
  assert.doesNotMatch(app.run('renderRosterMini("Talvez", state.players, state.events[0], "maybe")'), /data-event-admin-response/);
});

test("busy event ignores a repeated adjustment", async () => {
  const app = setup({ remote: true });
  app.buttons[0].dataset.busy = "true";
  await app.run('saveAdminEventResponse("event", "player", "going")');
  assert.equal(app.writes.length, 0);
});
