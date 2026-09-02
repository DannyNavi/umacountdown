import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyBannerDates,
  applyBannerDatesToList,
  buildBannerDateMap,
  isoToUnix,
} from "./bannerDates.js";

test("isoToUnix converts UTC ISO timestamps to unix seconds", () => {
  assert.equal(isoToUnix("2026-09-01T22:00:00Z"), 1788300000);
  assert.equal(isoToUnix("2026-09-09T22:00:00Z"), 1788991200);
});

test("isoToUnix returns null for missing or invalid values", () => {
  assert.equal(isoToUnix(null), null);
  assert.equal(isoToUnix(""), null);
  assert.equal(isoToUnix("not-a-date"), null);
});

test("buildBannerDateMap indexes confirmed Global dates by gacha_id", () => {
  const map = buildBannerDateMap({
    events: [
      {
        gacha_id: 30122,
        global_release_date: "2026-09-01T22:00:00Z",
        estimated_end_date: "2026-09-09T22:00:00Z",
        is_confirmed: true,
      },
      {
        type: "story_event",
        title: "ignored",
      },
    ],
  });

  assert.deepEqual(map.get(30122), {
    start: 1788300000,
    end: 1788991200,
    is_confirmed: true,
  });
});

test("applyBannerDates overlays Yamanin Zephyr 30122 onto Sept 1 / Sept 9 UTC", () => {
  const dateMap = buildBannerDateMap({
    events: [
      {
        gacha_id: 30122,
        global_release_date: "2026-09-01T22:00:00Z",
        estimated_end_date: "2026-09-09T22:00:00Z",
        is_confirmed: true,
      },
    ],
  });

  const banner = {
    id: 30122,
    start_date: 1666148400,
    end_date: 1666925999,
    card_type: "Outfit",
  };

  assert.deepEqual(applyBannerDates(banner, dateMap), {
    id: 30122,
    start_date: 1788300000,
    end_date: 1788991200,
    card_type: "Outfit",
    is_global_mapped: true,
    is_confirmed: true,
  });
});

test("applyBannerDates leaves unmatched umapyoi IDs unchanged", () => {
  const dateMap = buildBannerDateMap({
    events: [
      {
        gacha_id: 30122,
        global_release_date: "2026-09-01T22:00:00Z",
        estimated_end_date: "2026-09-09T22:00:00Z",
        is_confirmed: true,
      },
    ],
  });

  const banner = {
    id: 20001,
    start_date: 1600000000,
    end_date: 1600003600,
  };

  assert.deepEqual(applyBannerDates(banner, dateMap), banner);
});

test("applyBannerDatesToList remaps only matching banners", () => {
  const dateMap = buildBannerDateMap({
    events: [
      {
        gacha_id: 30122,
        global_release_date: "2026-09-01T22:00:00Z",
        estimated_end_date: "2026-09-09T22:00:00Z",
        is_confirmed: true,
      },
    ],
  });

  const banners = applyBannerDatesToList(
    [
      { id: 30122, start_date: 1, end_date: 2 },
      { id: 20001, start_date: 3, end_date: 4 },
    ],
    dateMap
  );

  assert.equal(banners[0].start_date, 1788300000);
  assert.equal(banners[0].is_global_mapped, true);
  assert.deepEqual(banners[1], { id: 20001, start_date: 3, end_date: 4 });
});
