import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { findNearbyMoments, DUPLICATE_WINDOW_S } = require("../video-lab.js");

const moments = [
  { id: "a", t: 100, note: "Golo" },
  { id: "b", t: 108, note: "Defesa" },
  { id: "c", t: 200, note: "Outro" },
];

test("encontra momentos ate 10 s, do mais perto para o mais longe", () => {
  assert.equal(DUPLICATE_WINDOW_S, 10);
  assert.deepEqual(findNearbyMoments(moments, 106).map((item) => item.id), ["b", "a"]);
  assert.deepEqual(findNearbyMoments(moments, 90).map((item) => item.id), ["a"]);
});

test("sem momentos perto, ou tempo invalido, nao avisa", () => {
  assert.deepEqual(findNearbyMoments(moments, 150), []);
  assert.deepEqual(findNearbyMoments(moments, null), []);
  assert.deepEqual(findNearbyMoments(null, 100), []);
});

test("ignora o proprio momento ao editar", () => {
  assert.deepEqual(findNearbyMoments(moments, 100, { excludeId: "a" }).map((item) => item.id), ["b"]);
});
