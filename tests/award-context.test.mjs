import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { webcrypto } from "node:crypto";
import monthly from "../monthly-recap.js";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8")
  .replace(/bindEvents\(\);\r?\ninitApp\(\);/, "");

function setup() {
  const modals = [];
  const context = createContext({
    console, Intl, crypto: webcrypto,
    URLSearchParams,
    window: { FIVE5_CONFIG: {}, location: { search: "" }, FooterMonthly: monthly, addEventListener() {} },
    document: { addEventListener() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      createElement() { return { querySelectorAll() { return []; } }; },
      body: { appendChild(modal) { modals.push(modal); } },
    },
    localStorage: { getItem() { return null; }, setItem() {} },
  });
  const run = (code) => runInContext(code, context);
  run(source);
  run(`state.players = [player("p", "Jogador", 60, 60, 60, 60, 60, 60, 60), player("q", "Outro", 60, 60, 60, 60, 60, 60, 60)];
    state.games = []; gameMvpVotes = [];`);
  return {
    run,
    context, modals,
    json: (code) => JSON.parse(run(`JSON.stringify(${code})`)),
    game(id, date, { finished = true, attend = true, mvp = true } = {}) {
      run(`state.games.push({ id: ${JSON.stringify(id)}, date: ${JSON.stringify(date)},
        teamA: ${JSON.stringify(attend ? ["p"] : ["q"])}, teamB: ["q"],
        scoreA: ${finished ? 2 : "null"}, scoreB: ${finished ? 1 : "null"} });`);
      if (mvp) run(`for (let index = 0; index < 5; index++) gameMvpVotes.push({ gameId: ${JSON.stringify(id)}, candidatePlayerId: "p", voterPlayerId: "v" + index });`);
    },
  };
}

test("monthly MVP lists every won month with its year and matches the badge", () => {
  const app = setup();
  app.game("a", "2024-05-01T12:00:00");
  app.game("b", "2025-05-01T12:00:00");
  assert.deepEqual(app.json('getPlayerMonthlyAwardMonths("p", "mvp_month")'), ["2025-05", "2024-05"]);
  assert.deepEqual(app.json('getPlayerAwardContext("p", {key: "mvp_month"}).periods'), ["maio de 2025", "maio de 2024"]);
  assert.equal(app.run('getPlayerAwardShowcase(state.players[0]).find(a => a.key === "mvp_month").count'), 2);
  const html = app.run('renderAwardShowcaseCard(state.players[0], {key: "mvp_month", count: 2})');
  assert.match(html, /maio de 2025 · maio de 2024/);
  assert.match(html, /x2/);
});

test("unfinished months and future months never appear as conquered", () => {
  const app = setup();
  app.game("closed", "2024-04-01T12:00:00");
  app.game("done", "2024-05-01T12:00:00");
  app.game("open", "2024-05-10T12:00:00", { finished: false, mvp: false });
  app.game("future", "2099-05-01T12:00:00");
  assert.deepEqual(app.json('getPlayerMonthlyAwardMonths("p", "mvp_month")'), ["2024-04"]);
  assert.deepEqual(app.json('getPlayerMonthlyAwardMonths("q", "mvp_month")'), []);
});

test("monthly MVP ties retain all winners", () => {
  const app = setup();
  app.game("a", "2024-05-01T12:00:00");
  app.run('state.games[0].scoreB = 2; for (let index = 0; index < 5; index++) gameMvpVotes.push({gameId: "a", candidatePlayerId: "q", voterPlayerId: "q" + index})');
  assert.deepEqual(app.json('getPlayerMonthlyAwardMonths("p", "mvp_month")'), ["2024-05"]);
  assert.deepEqual(app.json('getPlayerMonthlyAwardMonths("q", "mvp_month")'), ["2024-05"]);
});

test("Ironman months require all appearances and at least two finished games", () => {
  const app = setup();
  app.game("a", "2024-05-01T12:00:00");
  app.game("b", "2024-05-08T12:00:00");
  app.game("c", "2024-06-01T12:00:00");
  app.game("d", "2024-06-08T12:00:00", { attend: false, mvp: false });
  app.game("e", "2024-07-01T12:00:00");
  assert.deepEqual(app.json('getPlayerMonthlyAwardMonths("p", "ironman_month")'), ["2024-05"]);
  assert.equal(app.run('getPlayerAwardShowcase(state.players[0]).find(a => a.key === "ironman_month").count'), 1);
});

test("MVP sequences show actual game dates and reset between awards", () => {
  const app = setup();
  app.game("a", "2024-05-01T12:00:00");
  app.game("b", "2024-05-08T12:00:00");
  app.game("c", "2024-05-15T12:00:00");
  app.game("break", "2024-05-22T12:00:00", { mvp: false });
  app.game("d", "2024-05-29T12:00:00");
  assert.deepEqual(app.json('getPlayerAwardContext("p", {key: "mvp_2x"}).periods'), ["01/05/2024 – 08/05/2024"]);
  assert.deepEqual(app.json('getPlayerAwardContext("p", {key: "mvp_3x"}).periods'), ["01/05/2024 – 15/05/2024"]);
  assert.equal(app.json('getPlayerAwardContext("p", {key: "mvp"}).periods').length, 4);
});

test("monthly recap and reveal use the specific award date", () => {
  const app = setup();
  app.game("a", "2024-05-01T12:00:00");
  app.game("b", "2024-06-01T12:00:00");
  assert.deepEqual(app.json('getPlayerAwardContext("p", {key: "win_1x"}).periods'), ["01/05/2024"]);
  assert.match(app.run('renderAwardRevealItem(state.players[0], PLAYER_CARD_VARIANTS.win_1x, state.games[0])'), /01\/05\/2024/);
  const html = app.run('renderAwardShowcaseCard(state.players[0], {key: "form_3w_5", date: "2024-06-01T12:00:00"})');
  assert.match(html, /01\/06\/2024/);
  assert.doesNotMatch(html, /award-count|xundefined/);
});

test("opening recap cards preserves the specific date and omits unknown counts", () => {
  const app = setup();
  const handlers = {};
  app.context.cards = {
    querySelectorAll() {
      return [{ dataset: { awardKey: "form_3w_5", awardDate: "2024-06-01T12:00:00" },
        addEventListener(type, handler) { handlers[type] = handler; } }];
    },
  };
  app.run(`bindAwardDetailCards(cards, state.players[0], [
    {key:"form_3w_5", date:"2024-05-01T12:00:00"},
    {key:"form_3w_5", date:"2024-06-01T12:00:00"}
  ]);`);
  let prevented = false;
  handlers.keydown({ key: "Enter", preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.match(app.modals[0].innerHTML, /01\/06\/2024/);
  assert.doesNotMatch(app.modals[0].innerHTML, /01\/05\/2024|award-count-large/);
  handlers.click();
  assert.equal(app.modals.length, 2);
});

test("award detail lists all months and keeps its numeric showcase count", () => {
  const app = setup();
  app.game("a", "2024-05-01T12:00:00");
  app.game("b", "2025-05-01T12:00:00");
  app.run('showAwardDetail(state.players[0], getPlayerAwardShowcase(state.players[0]).find(a => a.key === "mvp_month"))');
  assert.match(app.modals[0].innerHTML, /<li>maio de 2025<\/li><li>maio de 2024<\/li>/);
  assert.match(app.modals[0].innerHTML, /award-count-large">x2/);
});
