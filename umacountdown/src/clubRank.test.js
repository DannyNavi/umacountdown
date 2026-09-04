import { test } from "node:test";
import assert from "node:assert/strict";
import { circleListItems, estimateCombinedRank } from "./clubRank.js";

test("circleListItems reads uma.moe list shapes", () => {
  assert.deepEqual(circleListItems([{ circle_id: 1 }]), [{ circle_id: 1 }]);
  assert.deepEqual(circleListItems({ circles: [{ circle_id: 2 }] }), [
    { circle_id: 2 },
  ]);
  assert.deepEqual(circleListItems({ list: [{ circle_id: 3 }] }), [
    { circle_id: 3 },
  ]);
  assert.deepEqual(circleListItems({ items: [{ circle_id: 4 }] }), [
    { circle_id: 4 },
  ]);
  assert.deepEqual(circleListItems({}), []);
});

test("estimateCombinedRank inserts a merged club and skips Exile IDs", () => {
  const ladder = [
    { circle_id: 1, name: "Alpha", monthly_point: 2_000_000_000, monthly_rank: 1 },
    { circle_id: 619284325, name: "Exile I", monthly_point: 462_000_000, monthly_rank: 168 },
    { circle_id: 3, name: "Beta", monthly_point: 1_000_000_000, monthly_rank: 20 },
    { circle_id: 4, name: "Gamma", monthly_point: 400_000_000, monthly_rank: 200 },
  ];

  const result = estimateCombinedRank(1_500_000_000, ladder, [619284325, 676001972]);
  assert.equal(result.rank, 2);
  assert.equal(result.complete, true);
  assert.equal(result.above.name, "Alpha");
  assert.equal(result.below.name, "Beta");
});

test("estimateCombinedRank reports an incomplete scan when every fetched club is still ahead", () => {
  const ladder = [
    { circle_id: 1, name: "Alpha", monthly_point: 3_000_000_000, monthly_rank: 1 },
    { circle_id: 2, name: "Beta", monthly_point: 2_000_000_000, monthly_rank: 2 },
  ];
  const result = estimateCombinedRank(1_000_000_000, ladder, []);
  assert.equal(result.rank, 3);
  assert.equal(result.complete, false);
  assert.equal(result.compared, 2);
});
