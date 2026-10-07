import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyChaosBracket,
  createDefaultEvent,
  nextPowerOfTwo,
  pickWeightedMatchupWinner,
  resolveExpiredRound,
  resolveMatchupWinner,
  startRoundClock,
} from "./logic.js";

test("nextPowerOfTwo pads roster counts for brackets", () => {
  assert.equal(nextPowerOfTwo(2), 2);
  assert.equal(nextPowerOfTwo(3), 4);
  assert.equal(nextPowerOfTwo(32), 32);
  assert.equal(nextPowerOfTwo(145), 256);
});

test("applyChaosBracket seeds every character into a padded bracket", () => {
  const event = createDefaultEvent();
  const rosterSize = event.characters.length;
  applyChaosBracket(event, null, () => 0);

  assert.equal(event.mode, "chaos");
  assert.equal(event.stage, "bracket");
  assert.equal(event.ballots.length, 0);
  assert.equal(event.maxTournamentSize, nextPowerOfTwo(rosterSize));

  const seeded = event.characters.filter((c) => c.seed != null);
  assert.equal(seeded.length, rosterSize);
  const seeds = seeded.map((c) => c.seed).sort((a, b) => a - b);
  assert.deepEqual(
    seeds,
    Array.from({ length: rosterSize }, (_, n) => n + 1)
  );
  // Every roster member is in the bracket; byes are empty slots, not rows
  assert.equal(
    event.characters.filter((c) => !c.isEliminated).length,
    rosterSize
  );
  assert.ok(event.matchups.length > 0);
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
  assert.equal(
    resolveMatchupWinner({ mode: "chaos" }, matchup, null, () => 0.05),
    "a"
  );
  assert.equal(
    resolveMatchupWinner({ mode: "chaos" }, matchup, "b", () => 0.05),
    "b"
  );
});

test("applyChaosBracket starts a 24h round clock when real matchups remain", () => {
  const event = createDefaultEvent();
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  const realDateNow = Date.now;
  Date.now = () => now;
  try {
    applyChaosBracket(event, null, () => 0);
    assert.equal(event.roundDurationHours, 24);
    assert.equal(
      event.roundEndTime,
      new Date(now + 24 * 60 * 60 * 1000).toISOString()
    );
    // Bye matchups in round 1 should already be completed
    const r1Byes = event.matchups.filter(
      (m) =>
        m.round === 1 &&
        m.isCompleted &&
        (!m.character1Id || !m.character2Id)
    );
    assert.ok(r1Byes.length > 0);
    const r1Open = event.matchups.filter(
      (m) => m.round === 1 && !m.isCompleted
    );
    assert.ok(r1Open.length > 0);
  } finally {
    Date.now = realDateNow;
  }
});

test("resolveExpiredRound rolls open matchups and advances the round clock", () => {
  const event = createDefaultEvent();
  // Tiny roster so the bracket stays small in this test
  event.characters = event.characters.slice(0, 5);
  applyChaosBracket(event, null, () => 0);
  assert.equal(event.maxTournamentSize, 8);

  const openBefore = event.matchups.filter(
    (m) => m.round === event.currentRound && !m.isCompleted
  );
  assert.ok(openBefore.length >= 1);

  event.roundEndTime = new Date(Date.now() - 1000).toISOString();
  const roundBefore = event.currentRound;
  const changed = resolveExpiredRound(event, Date.now(), () => 0.9);
  assert.equal(changed, true);
  assert.ok(
    event.matchups
      .filter((m) => m.round === roundBefore)
      .every((m) => m.isCompleted)
  );
  assert.ok(event.currentRound > roundBefore || event.stage === "completed");
  if (event.stage === "bracket") {
    assert.ok(new Date(event.roundEndTime).getTime() > Date.now());
  }
});

test("startRoundClock sets ISO end from duration hours", () => {
  const event = createDefaultEvent();
  const now = Date.UTC(2026, 5, 1, 0, 0, 0);
  startRoundClock(event, 24, now);
  assert.equal(event.roundDurationHours, 24);
  assert.equal(event.roundEndTime, new Date(now + 86400000).toISOString());
});
