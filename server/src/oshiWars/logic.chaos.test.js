import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyChaosBracket,
  createDefaultEvent,
  pickWeightedMatchupWinner,
  resolveExpiredRound,
  resolveMatchupWinner,
  startRoundClock,
} from "./logic.js";

test("applyChaosBracket randomly seeds a full bracket and sets chaos mode", () => {
  const event = createDefaultEvent();
  let i = 0;
  const sequential = () => {
    // Deterministic: always pick index 0 from remaining → reverse-ish shuffle pattern
    i += 0.01;
    return 0;
  };

  applyChaosBracket(event, 32, sequential);

  assert.equal(event.mode, "chaos");
  assert.equal(event.stage, "bracket");
  assert.equal(event.ballots.length, 0);
  assert.ok(event.matchups.length > 0);

  const seeded = event.characters.filter((c) => c.seed != null);
  assert.equal(seeded.length, 32);
  const seeds = seeded.map((c) => c.seed).sort((a, b) => a - b);
  assert.deepEqual(seeds, Array.from({ length: 32 }, (_, n) => n + 1));
  assert.equal(
    event.characters.filter((c) => !c.isEliminated).length,
    32
  );
});

test("pickWeightedMatchupWinner follows vote share", () => {
  const matchup = {
    character1Id: "a",
    character2Id: "b",
    votes1: 75,
    votes2: 25,
  };
  assert.equal(pickWeightedMatchupWinner(matchup, () => 0.0), "a");
  assert.equal(pickWeightedMatchupWinner(matchup, () => 0.749), "a");
  assert.equal(pickWeightedMatchupWinner(matchup, () => 0.75), "b");
  assert.equal(pickWeightedMatchupWinner(matchup, () => 0.99), "b");
});

test("pickWeightedMatchupWinner is 50/50 with no votes", () => {
  const matchup = {
    character1Id: "a",
    character2Id: "b",
    votes1: 0,
    votes2: 0,
  };
  assert.equal(pickWeightedMatchupWinner(matchup, () => 0.49), "a");
  assert.equal(pickWeightedMatchupWinner(matchup, () => 0.5), "b");
});

test("resolveMatchupWinner uses majority in standard and weights in chaos", () => {
  const matchup = {
    character1Id: "a",
    character2Id: "b",
    votes1: 10,
    votes2: 90,
  };
  assert.equal(
    resolveMatchupWinner({ mode: "standard" }, matchup, null, () => 0),
    "b"
  );
  // Chaos with random always in a's slice (first 10 of 100)
  assert.equal(
    resolveMatchupWinner({ mode: "chaos" }, matchup, null, () => 0.05),
    "a"
  );
  assert.equal(
    resolveMatchupWinner({ mode: "chaos" }, matchup, "b", () => 0.05),
    "b"
  );
});

test("applyChaosBracket starts a 24h round clock", () => {
  const event = createDefaultEvent();
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  const realDateNow = Date.now;
  Date.now = () => now;
  try {
    applyChaosBracket(event, 8, () => 0);
    assert.equal(event.roundDurationHours, 24);
    assert.equal(
      event.roundEndTime,
      new Date(now + 24 * 60 * 60 * 1000).toISOString()
    );
  } finally {
    Date.now = realDateNow;
  }
});

test("resolveExpiredRound rolls open matchups and advances the round clock", () => {
  const event = createDefaultEvent();
  applyChaosBracket(event, 8, () => 0);
  const round1 = event.matchups.filter((m) => m.round === 1);
  assert.ok(round1.length >= 2);

  // Expire the round window
  event.roundEndTime = new Date(Date.now() - 1000).toISOString();
  const changed = resolveExpiredRound(event, Date.now(), () => 0.9);
  assert.equal(changed, true);
  assert.ok(round1.every((m) => m.isCompleted));
  assert.equal(event.currentRound, 2);
  assert.ok(new Date(event.roundEndTime).getTime() > Date.now());
});

test("startRoundClock sets ISO end from duration hours", () => {
  const event = createDefaultEvent();
  const now = Date.UTC(2026, 5, 1, 0, 0, 0);
  startRoundClock(event, 24, now);
  assert.equal(event.roundDurationHours, 24);
  assert.equal(event.roundEndTime, new Date(now + 86400000).toISOString());
});
