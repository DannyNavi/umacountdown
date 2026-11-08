import assert from "node:assert/strict";
import test from "node:test";
import { quotaWeek, weeklyFanProgress } from "./weeklyFans.js";

test("the report keeps the closing week through Monday JST and switches on Tuesday", () => {
  const beforeReset = quotaWeek(Date.parse("2026-11-09T14:59:59Z"));
  const afterReset = quotaWeek(Date.parse("2026-11-09T15:00:00Z"));
  assert.equal(beforeReset.start, Date.UTC(2026, 10, 2));
  assert.equal(beforeReset.end, Date.UTC(2026, 10, 9));
  assert.equal(beforeReset.resetAt, Date.parse("2026-11-09T15:00:00Z"));
  assert.equal(afterReset.start, Date.UTC(2026, 10, 9));
  assert.equal(afterReset.resetAt, Date.parse("2026-11-16T15:00:00Z"));
});

test("weekly progress uses the Monday baseline and each club's target", () => {
  const week = quotaWeek(Date.parse("2026-11-10T00:00:00Z"));
  const daily_fans = [];
  daily_fans[0] = 75_000_000;
  daily_fans[8] = 100_000_000;
  daily_fans[9] = 115_000_000;
  daily_fans[10] = 123_000_000; // Outside the requested window.
  const member = { year: 2026, month: 11, daily_fans };

  assert.deepEqual(weeklyFanProgress(member, null, "Exile I", week), {
    target: 22_000_000, earned: 15_000_000, remaining: 7_000_000,
  });
  assert.deepEqual(weeklyFanProgress(member, null, "Exile Dawn", week), {
    target: 14_000_000, earned: 15_000_000, remaining: 0,
  });
});

test("DannyN's Monday report shows 46,616,864 fans and a met quota", () => {
  const week = quotaWeek(Date.parse("2026-11-08T17:10:25Z"));
  const member = {
    year: 2026,
    month: 11,
    daily_fans: [1_078_122_976, 1_083_321_626, 1_088_171_672, 1_095_029_029,
      1_098_540_679, 1_109_741_582, 1_124_292_673, 1_129_308_768, 1_129_938_490],
  };

  assert.deepEqual(weeklyFanProgress(member, null, "Exile III", week), {
    target: 22_000_000, earned: 46_616_864, remaining: 0,
  });
});

test("a week that crosses a month boundary can use the prior month's history", () => {
  const week = quotaWeek(Date.parse("2026-10-02T06:00:00Z"));
  const daily_fans = [];
  daily_fans[27] = 100_000_000; // Monday, September 28 in JST.
  const previous = { year: 2026, month: 9, daily_fans };
  const member = { year: 2026, month: 10, daily_fans: [113_000_000, 120_000_000] };

  assert.equal(week.baselineMonth.getUTCMonth(), 8);
  assert.equal(week.currentMonth.getUTCMonth(), 9);
  assert.equal(weeklyFanProgress(member, null, "Exile II", week), null);
  assert.deepEqual(weeklyFanProgress(member, previous, "Exile II", week), {
    target: 22_000_000, earned: 20_000_000, remaining: 2_000_000,
  });
});
