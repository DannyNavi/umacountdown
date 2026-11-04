import test from "node:test";
import assert from "node:assert/strict";
import { calculateParentAffinity } from "./parentAffinity.js";

const affinity = { chars: [1001, 1002, 1003], aff2: [0, 20, 30, 20, 0, 10, 30, 10, 0] };
const races = { races: [{ win_saddles: [
  { saddle_id: 1, group_id: 1, win_saddle_type: 3 },
  { saddle_id: 2, group_id: 1, win_saddle_type: 3 },
  { saddle_id: 3, group_id: 2, win_saddle_type_label: "G1" },
  { saddle_id: 4, group_id: 3, win_saddle_type: 2 },
] }] };
const inheritance = { main_parent_id: 100101, parent_left_id: 100201, parent_right_id: 100302,
  main_win_saddles: [1, 2, 3, 4], left_win_saddles: [2, 4], right_win_saddles: [1, 3, 4] };

test("counts each shared G1 group once per pair, excluding G2 wins", () => {
  assert.deepEqual(calculateParentAffinity(inheritance, affinity, races), {
    total: 59, base: 50, race: 9, left: 23, right: 36, stored: false,
  });
});

test("empty win arrays give base affinity without a race bonus", () => {
  assert.equal(calculateParentAffinity({ ...inheritance, main_win_saddles: [] }, affinity, races).total, 50);
});

test("missing wins or unknown characters use the stored score instead of a partial total", () => {
  assert.deepEqual(calculateParentAffinity({ ...inheritance, left_win_saddles: undefined,
    affinity_score: 153 }, affinity, races), { total: 153, stored: true });
  assert.equal(calculateParentAffinity({ ...inheritance, parent_left_id: 999901 }, affinity, races), null);
});

test("missing resources preserve a stored zero score", () => {
  assert.deepEqual(calculateParentAffinity({ affinity_score: 0 }), { total: 0, stored: true });
  assert.equal(calculateParentAffinity({}), null);
});
