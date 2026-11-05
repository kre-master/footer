import assert from "node:assert/strict";
import test from "node:test";
import feedback from "../postgame-feedback.js";

const {
  ENERGY_SCALE,
  INTENSITY_SCALE,
  POSTGAME_SCALES,
  isCheckinRequired,
  isScaleValue,
  sortPendingCheckins,
} = feedback;

test("accepts only integer scale values from 1 through 10", () => {
  assert.equal(isScaleValue(1), true);
  assert.equal(isScaleValue(10), true);
  assert.equal(isScaleValue(0), false);
  assert.equal(isScaleValue(11), false);
  assert.equal(isScaleValue(4.5), false);
  assert.equal(isScaleValue("5"), false);
});

test("publishes the approved scale questions and anchors", () => {
  assert.equal(INTENSITY_SCALE.question, "Intensidade do jogo: Velhinhos ou Champions?");
  assert.deepEqual(INTENSITY_SCALE.anchors, {
    1: "Velhinhos",
    5: "Bom ritmo",
    10: "Champions",
  });
  assert.equal(ENERGY_SCALE.question, "Morreste ou jogavas mais meia hora?");
  assert.deepEqual(ENERGY_SCALE.anchors, {
    1: "Morri",
    5: "Ainda dava uns minutos",
    10: "Mais meia hora facil",
  });
  assert.equal(POSTGAME_SCALES.intensity, INTENSITY_SCALE);
  assert.equal(POSTGAME_SCALES.energy, ENERGY_SCALE);
});

test("requires transition feedback even when the MVP vote already exists", () => {
  assert.equal(isCheckinRequired({
    hasVote: false,
    hasFeedback: false,
    isTransitionGame: true,
    isAfterRollout: false,
  }), true);
  assert.equal(isCheckinRequired({
    hasVote: true,
    hasFeedback: false,
    isTransitionGame: true,
    isAfterRollout: false,
  }), true);
  assert.equal(isCheckinRequired({
    hasVote: true,
    hasFeedback: true,
    isTransitionGame: true,
    isAfterRollout: false,
  }), false);
});

test("requires post-rollout check-ins and excludes earlier games or feedback", () => {
  assert.equal(isCheckinRequired({
    hasVote: false,
    hasFeedback: false,
    isTransitionGame: false,
    isAfterRollout: true,
  }), true);
  assert.equal(isCheckinRequired({
    hasVote: false,
    hasFeedback: false,
    isTransitionGame: false,
    isAfterRollout: false,
    isBeforeRollout: true,
  }), false);
  assert.equal(isCheckinRequired({
    hasVote: false,
    hasFeedback: true,
    isTransitionGame: false,
    isAfterRollout: true,
  }), false);
});

test("sorts pending check-ins by oldest date and then deterministic ID", () => {
  const pending = [
    { id: "b", date: "2026-09-08" },
    { id: "z", date: "2026-09-01" },
    { id: "a", date: "2026-09-01" },
  ];
  const sorted = sortPendingCheckins(pending);

  assert.deepEqual(sorted.map((item) => item.id), ["a", "z", "b"]);
  assert.deepEqual(pending.map((item) => item.id), ["b", "z", "a"]);
});

test("uses ID tie-break when equivalent timestamps use different formats", () => {
  const sorted = sortPendingCheckins([
    { id: "b", date: "2026-09-01T10:00:00.000Z" },
    { id: "a", date: "2026-09-01T10:00:00Z" },
  ]);

  assert.deepEqual(sorted.map((item) => item.id), ["a", "b"]);
});

test("ignores a careless 1/1 answer far from the group (game of 4 Nov)", () => {
  const rows = [[7, 7], [8, 9], [9, 9], [8, 5], [8, 3], [7, 3], [6, 6], [1, 1]]
    .map(([gameIntensity, remainingEnergy], index) => ({ id: `f${index}`, playerId: `p${index}`, gameIntensity, remainingEnergy }));
  const result = feedback.assessGameFeedback(rows, { gamePace: 82.4, usualPace: 79.8 });
  const careless = result.find((item) => item.id === "f7");
  assert.equal(careless.intensityTrusted, false);
  assert.equal(careless.energyTrusted, false);
  assert.deepEqual(careless.reasons, ["far_from_group", "against_running", "all_minimum"]);
  assert.ok(result.filter((item) => item.id !== "f7").every((item) => item.intensityTrusted && item.energyTrusted));
});

test("keeps a low but honest energy and drops only an off-consensus intensity", () => {
  const rows = [[5, 8], [4, 5], [8, 6], [6, 5], [1, 10], [8, 10], [3, 1], [4, 3], [7, 7]]
    .map(([gameIntensity, remainingEnergy], index) => ({ id: `f${index}`, gameIntensity, remainingEnergy }));
  const result = feedback.assessGameFeedback(rows, { gamePace: 79.8, usualPace: 79.8 });
  const lowIntensity = result.find((item) => item.id === "f4");
  assert.equal(lowIntensity.intensityTrusted, false);
  assert.equal(lowIntensity.energyTrusted, true);
  const tired = result.find((item) => item.id === "f6");
  assert.equal(tired.intensityTrusted, true);
  assert.equal(tired.energyTrusted, true);
});

test("does not judge when there are too few answers and no running data", () => {
  const rows = [{ id: "a", gameIntensity: 1, remainingEnergy: 1 }, { id: "b", gameIntensity: 9, remainingEnergy: 8 }];
  const result = feedback.assessGameFeedback(rows);
  assert.equal(result[0].intensityTrusted, true);
  assert.equal(result[0].energyTrusted, true);
  assert.deepEqual(result[0].reasons, ["all_minimum"]);
});

test("an answer repeated in the last 4 games does not count for the game intensity", () => {
  const rows = [[7, 7], [8, 9], [5, 10], [8, 5], [7, 3]]
    .map(([gameIntensity, remainingEnergy], index) => ({ id: `f${index}`, gameIntensity, remainingEnergy, repeated: index === 2 }));
  const result = feedback.assessGameFeedback(rows);
  assert.equal(result[2].intensityTrusted, false);
  assert.equal(result[2].energyTrusted, true);
  assert.ok(result[2].reasons.includes("repeated"));
});
