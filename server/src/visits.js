const STORE_KEY = "visit_stats";

/** In-memory fallback when KV is not bound (local/tests). */
let memoryStats = null;

const KNOWN_ROOTS = new Set([
  "/",
  "/countdown",
  "/oshiwars",
  "/schwarma",
  "/ozy",
  "/shaz",
  "/club",
  "/parent",
]);

function emptyStats() {
  return {
    total: 0,
    byPath: {},
    byDay: {},
    updatedAt: null,
  };
}

/**
 * Normalize a client path to a tracked route bucket.
 * Query/hash stripped; unknown paths rejected; /parent/:id → /parent.
 */
export function normalizeVisitPath(rawPath) {
  if (typeof rawPath !== "string") return null;

  let path = rawPath.trim();
  if (!path) return null;

  const q = path.indexOf("?");
  if (q >= 0) path = path.slice(0, q);
  const h = path.indexOf("#");
  if (h >= 0) path = path.slice(0, h);

  if (!path.startsWith("/")) path = `/${path}`;
  // Collapse repeated slashes and strip trailing slash (except root).
  path = path.replace(/\/+/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  if (path === "/parent" || path.startsWith("/parent/")) {
    return "/parent";
  }

  if (KNOWN_ROOTS.has(path)) return path;
  return null;
}

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function applyVisit(stats, path, at = new Date()) {
  const next = {
    total: Number(stats?.total) || 0,
    byPath: { ...(stats?.byPath || {}) },
    byDay: { ...(stats?.byDay || {}) },
    updatedAt: at.toISOString(),
  };

  next.total += 1;
  next.byPath[path] = (Number(next.byPath[path]) || 0) + 1;

  const day = utcDayKey(at);
  next.byDay[day] = (Number(next.byDay[day]) || 0) + 1;

  // Keep recent daily history bounded.
  const days = Object.keys(next.byDay).sort();
  if (days.length > 90) {
    for (const old of days.slice(0, days.length - 90)) {
      delete next.byDay[old];
    }
  }

  return next;
}

async function loadStats(env) {
  if (env?.OSHI_WARS_KV) {
    try {
      const raw = await env.OSHI_WARS_KV.get(STORE_KEY, "json");
      if (raw && typeof raw === "object") {
        memoryStats = {
          total: Number(raw.total) || 0,
          byPath: raw.byPath && typeof raw.byPath === "object" ? raw.byPath : {},
          byDay: raw.byDay && typeof raw.byDay === "object" ? raw.byDay : {},
          updatedAt: raw.updatedAt || null,
        };
        return memoryStats;
      }
    } catch (err) {
      console.error("Failed to load visit stats from KV:", err);
    }
  }

  if (!memoryStats) memoryStats = emptyStats();
  return memoryStats;
}

async function saveStats(env, stats) {
  memoryStats = stats;
  if (env?.OSHI_WARS_KV) {
    await env.OSHI_WARS_KV.put(STORE_KEY, JSON.stringify(stats));
  }
}

/**
 * Record one page view. Returns updated stats, or null if path is invalid.
 */
export async function recordVisit(env, rawPath, at = new Date()) {
  const path = normalizeVisitPath(rawPath);
  if (!path) return null;

  const current = await loadStats(env);
  const next = applyVisit(current, path, at);
  await saveStats(env, next);
  return next;
}

export async function getVisitStats(env) {
  return loadStats(env);
}

/** Test helper — clear in-memory fallback between tests. */
export function resetVisitStatsMemory() {
  memoryStats = null;
}
