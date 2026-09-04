import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyVisit,
  normalizeVisitPath,
  recordVisit,
  getVisitStats,
  resetVisitStatsMemory,
} from "./visits.js";

test("normalizeVisitPath accepts known routes and strips query/hash", () => {
  assert.equal(normalizeVisitPath("/"), "/");
  assert.equal(normalizeVisitPath("/countdown?x=1"), "/countdown");
  assert.equal(normalizeVisitPath("/oshiwars#top"), "/oshiwars");
  assert.equal(normalizeVisitPath("/parent/abc123"), "/parent");
  assert.equal(normalizeVisitPath("club"), "/club");
  assert.equal(normalizeVisitPath("/parent/"), "/parent");
});

test("normalizeVisitPath rejects unknown or empty paths", () => {
  assert.equal(normalizeVisitPath(""), null);
  assert.equal(normalizeVisitPath(null), null);
  assert.equal(normalizeVisitPath("/admin"), null);
  assert.equal(normalizeVisitPath("/api/events"), null);
  assert.equal(normalizeVisitPath("//evil"), null);
});

test("applyVisit increments totals, path, and day buckets", () => {
  const at = new Date("2026-09-04T12:00:00Z");
  const first = applyVisit(null, "/oshiwars", at);
  assert.equal(first.total, 1);
  assert.equal(first.byPath["/oshiwars"], 1);
  assert.equal(first.byDay["2026-09-04"], 1);

  const second = applyVisit(first, "/", at);
  assert.equal(second.total, 2);
  assert.equal(second.byPath["/"], 1);
  assert.equal(second.byPath["/oshiwars"], 1);
  assert.equal(second.byDay["2026-09-04"], 2);
});

test("recordVisit persists via memory fallback without KV", async () => {
  resetVisitStatsMemory();
  const env = {};
  const recorded = await recordVisit(env, "/countdown");
  assert.ok(recorded);
  assert.equal(recorded.total, 1);
  assert.equal(recorded.byPath["/countdown"], 1);

  const stats = await getVisitStats(env);
  assert.equal(stats.total, 1);

  assert.equal(await recordVisit(env, "/not-a-real-route"), null);
  const afterReject = await getVisitStats(env);
  assert.equal(afterReject.total, 1);
});
