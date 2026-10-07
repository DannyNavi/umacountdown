import { test } from "node:test";
import assert from "node:assert/strict";
import { beginQualifyingRound, createDefaultEvent } from "./logic.js";

test("beginQualifyingRound clears prior ballots and qualifying tallies", () => {
  const event = createDefaultEvent();
  event.stage = "champion";
  event.winnerId = "char-1";
  event.currentRound = 5;
  event.matchups = [{ id: "m1" }];
  event.ballots = [
    {
      id: "ballot-old",
      voterId: "trainer-1",
      choices: [{ rank: 1, characterId: "char-1", points: 5 }],
    },
  ];
  event.characters[0].qualifyingScore = 12;
  event.characters[0].qualifyingVotesCount = 3;
  event.characters[0].firstPlaceVotes = 2;
  event.characters[0].averageRating = 4;
  event.characters[0].seed = 1;
  event.characters[1].isEliminated = true;

  const before = Date.now();
  beginQualifyingRound(event, 24);
  const after = Date.now();

  assert.equal(event.stage, "qualifying");
  assert.deepEqual(event.ballots, []);
  assert.deepEqual(event.matchups, []);
  assert.equal(event.winnerId, null);
  assert.equal(event.currentRound, 1);

  const endMs = new Date(event.qualifyingEndTime).getTime();
  assert.ok(endMs >= before + 24 * 60 * 60 * 1000 - 1000);
  assert.ok(endMs <= after + 24 * 60 * 60 * 1000 + 1000);

  for (const ch of event.characters) {
    assert.equal(ch.qualifyingScore, 0);
    assert.equal(ch.qualifyingVotesCount, 0);
    assert.equal(ch.firstPlaceVotes, 0);
    assert.equal(ch.averageRating, 0);
    assert.equal(ch.seed, undefined);
    assert.equal(ch.isEliminated, false);
  }
});
