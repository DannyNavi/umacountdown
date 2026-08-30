import { Hono } from "hono";
import { cors } from "hono/cors";
import { globalBanners } from "./globalSchedule.js";
import {
  applyManualBracket,
  createDefaultEvent,
  generateBracketTree,
  generateMatchupCommentary,
  loadEventsStore,
  rebalanceNextRound,
  resetOshiEvent,
  saveEventsStore,
  updateEventsStore,
} from "./oshiWars/logic.js";
import {
  isAllowedVoter,
  normalizeVoterId,
} from "./oshiWars/voters.js";
import {
  lookupPracticePartner,
  parsePracticeLookup,
  practiceCacheTtlSeconds,
} from "./partnerLookup.js";
export { OshiWarsStore } from "./oshiWars/OshiWarsStore.js";

const app = new Hono();

let cachedBannerList = null;
let cachedBannerDetails = new Map();

const CACHE_TIME = 1000 * 60 * 60;

let bannerListExpires = 0;
let bannerDetailsExpires = new Map();

app.use("*", cors());

app.get("/kv-test", async (c) => {
  await c.env.OSHI_WARS_KV.put("test", "Hello KV!");

  const value = await c.env.OSHI_WARS_KV.get("test");

  return c.text(value ?? "missing");
});

function dateStringToUnixAt22UTC(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, 22, 0, 0) / 1000);
}

let cachedJpWindows = [];

async function getBannerList() {
  const now = Date.now();

  if (cachedBannerList && now < bannerListExpires) {
    return cachedBannerList;
  }

  try {
    const response = await fetch("https://umapyoi.net/api/v1/gacha");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    cachedBannerList = data;
    bannerListExpires = now + CACHE_TIME;

    return data;
  } catch (err) {
    if (cachedBannerList) {
      console.log("Using cached banner list.");
      return cachedBannerList;
    }

    throw err;
  }
}

async function getJpWindows() {
  if (cachedJpWindows.length > 0) return cachedJpWindows;

  try {
    const response = await fetch("https://umapyoi.net/api/v1/gacha");
    const data = await response.json();

    data.sort((a, b) => a.start_date - b.start_date);

    cachedJpWindows = [...new Set(data.map((b) => b.start_date))];

    return cachedJpWindows;
  } catch (err) {
    console.error(err);
    return [];
  }
}

app.get("/api/v1/gacha", async (c) => {
  try {
    let data = await getBannerList();

    data.sort((a, b) => a.start_date - b.start_date);

    const uniqueWindows = [...new Set(data.map((b) => b.start_date))];

    const globalizedBanners = data.map((banner) => {
      const windowIndex = uniqueWindows.indexOf(banner.start_date);

      const globalMatch = globalBanners.find((g) => g.page === windowIndex);

      if (!globalMatch) return banner;

      return {
        ...banner,
        start_date: dateStringToUnixAt22UTC(globalMatch.globalStart),
        end_date:
          banner.end_date === 2147483647
            ? 2147483647
            : dateStringToUnixAt22UTC(globalMatch.globalEnd),
        is_global_mapped: true,
      };
    });

    const page = parseInt(c.req.query("page") ?? "0", 10);
    const limit = parseInt(c.req.query("limit") ?? "1", 10);

    if (c.req.query("page") !== undefined) {
      const startIndex = page * limit;
      const endIndex = startIndex + limit;

      return c.json({
        currentPage: page,
        totalPages: uniqueWindows.length,
        totalBanners: globalizedBanners.length,
        banners: globalizedBanners.slice(startIndex, endIndex),
      });
    }

    return c.json(globalizedBanners);
  } catch (err) {
    console.error("Endpoint mapping error:", err);

    return c.json(
      {
        error: "Failed to compile the accelerated global timeline layout.",
      },
      500
    );
  }
});

app.get("/api/v1/gacha/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const response = await fetch(`https://umapyoi.net/api/v1/gacha/${id}`);

    if (!response.ok) {
      throw new Error("Upstream API error");
    }

    const banner = await response.json();

    const windows = await getJpWindows();

    const windowIndex = windows.indexOf(banner.start_date);

    const globalMatch = globalBanners.find((g) => g.page === windowIndex);

    if (globalMatch) {
      banner.start_date = dateStringToUnixAt22UTC(globalMatch.globalStart);

      if (banner.end_date !== 2147483647) {
        banner.end_date = dateStringToUnixAt22UTC(globalMatch.globalEnd);
      }
    }

    return c.json(banner);
  } catch (err) {
    console.error(err);

    return c.json(
      {
        error: "Failed to load individual banner details",
      },
      500
    );
  }
});

app.get("/api/v4/circles", async (c) => {
  const apiKey = c.env.key;
  const circleId = c.req.query("circle_id");

  const response = await fetch(
    `https://uma.moe/api/v4/circles?circle_id=${circleId}`,
    {
      headers: {
        "X-API-Key": apiKey,
      },
    }
  );

  return c.json(await response.json());
});

const UMA_RESOURCE_ORIGIN = "https://uma.moe/resources/current";
const UMA_RESOURCE_NAMES = new Set(["factors", "skills"]);
let umaResourceCache = new Map();

async function readUmaResourceJson(name) {
  const cached = umaResourceCache.get(name);
  if (cached && Date.now() < cached.expires) return cached.body;

  const res = await fetch(`${UMA_RESOURCE_ORIGIN}/${name}.json.gz`, {
    headers: { Accept: "application/json, application/gzip, */*" },
  });
  if (!res.ok) {
    throw new Error(`uma.moe resource ${name} returned ${res.status}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  const gzipped = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  let text;
  if (gzipped) {
    const stream = new Response(bytes).body.pipeThrough(
      new DecompressionStream("gzip")
    );
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder().decode(bytes);
  }

  const body = JSON.parse(text);
  umaResourceCache.set(name, { body, expires: Date.now() + CACHE_TIME });
  return body;
}

app.get("/api/v4/resources/:name", async (c) => {
  const name = c.req.param("name");
  if (!UMA_RESOURCE_NAMES.has(name)) {
    return c.json({ error: "Unknown uma.moe resource" }, 404);
  }
  try {
    const body = await readUmaResourceJson(name);
    c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return c.json(body);
  } catch (err) {
    return c.json(
      { error: err?.message || `Failed to load ${name}` },
      502
    );
  }
});

function getUmaApiKey(env) {
  return env?.key || env?.UMA_API_KEY || "";
}

function practiceCacheKey(requestUrl, partnerId, kind) {
  const url = new URL(requestUrl);
  url.search = "";
  url.searchParams.set("id", partnerId);
  url.searchParams.set("type", kind);
  return new Request(url.toString(), { method: "GET" });
}

async function matchPracticeCache(cacheKey) {
  try {
    if (typeof caches === "undefined" || !caches.default) return null;
    return await caches.default.match(cacheKey);
  } catch {
    return null;
  }
}

function putPracticeCache(c, cacheKey, response) {
  try {
    if (typeof caches === "undefined" || !caches.default) return;
    const put = caches.default.put(cacheKey, response.clone());
    if (c.executionCtx?.waitUntil) c.executionCtx.waitUntil(put);
  } catch {
    // Cache API is Cloudflare-only; ignore on Node.
  }
}

app.get("/api/v4/practice", async (c) => {
  const apiKey = getUmaApiKey(c.env);
  const parsed = parsePracticeLookup(c.req.query("id"), c.req.query("type"));

  if (!apiKey) {
    return c.json(
      { error: "uma.moe API key not configured. Set key in server/.env or server/.dev.vars" },
      503
    );
  }
  if (parsed.error) {
    return c.json({ error: parsed.error }, 400);
  }

  const { partnerId, kind } = parsed;
  const cacheKey = practiceCacheKey(c.req.url, partnerId, kind);
  const cached = await matchPracticeCache(cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-Cache", "HIT");
    return new Response(cached.body, { status: cached.status, headers });
  }

  try {
    const result = await lookupPracticePartner(apiKey, partnerId, { kind });
    const response = c.json(result.body, result.status);
    if (result.ok && result.status === 200) {
      response.headers.set(
        "Cache-Control",
        `public, max-age=${practiceCacheTtlSeconds(kind)}`
      );
      response.headers.set("X-Cache", "MISS");
      putPracticeCache(c, cacheKey, response);
    } else {
      response.headers.set("Cache-Control", "no-store");
    }
    return response;
  } catch (err) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return c.json(
      {
        error: timedOut
          ? "Lookup timed out"
          : err?.message || "Failed to look up practice partner",
      },
      timedOut ? 504 : 502
    );
  }
});

// ----------------- OSHI WARS API -----------------

function getOshiAdminToken(env) {
  return env?.OSHI_ADMIN_TOKEN || "";
}

function requireOshiAdmin(c) {
  const expected = getOshiAdminToken(c.env);
  if (!expected) {
    return c.json({ error: "Admin auth not configured on server" }, 503);
  }
  const auth = c.req.header("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== expected) {
    return c.json({ error: "Admin authentication required" }, 401);
  }
  return null;
}

app.get("/api/events", async (c) => {
  const eventsStore = await loadEventsStore(c.env);
  return c.json(Object.values(eventsStore));
});

app.get("/api/events/:id", async (c) => {
  const eventsStore = await loadEventsStore(c.env);
  const event = eventsStore[c.req.param("id")];
  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }
  return c.json(event);
});

app.post("/api/events", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { title, subtitle, description, bannerUrl, maxTournamentSize } = body;
  const newId = `event-${Date.now()}`;

  const defaultEvt = createDefaultEvent();
  const event = {
    ...defaultEvt,
    id: newId,
    title: title || defaultEvt.title,
    subtitle: subtitle || defaultEvt.subtitle,
    description: description || defaultEvt.description,
    bannerUrl: bannerUrl || defaultEvt.bannerUrl,
    maxTournamentSize: maxTournamentSize || 16,
    stage: "qualifying",
    createdAt: new Date().toISOString(),
  };

  const eventsStore = await loadEventsStore(c.env);
  eventsStore[event.id] = event;
  await saveEventsStore(c.env, eventsStore);
  return c.json(event);
});

app.post("/api/events/:id/reset", async (c) => {
  const denied = requireOshiAdmin(c);
  if (denied) return denied;

  try {
    const fresh = await resetOshiEvent(c.env, c.req.param("id"));
    return c.json(fresh);
  } catch (err) {
    console.error("Reset failed:", err);
    return c.json({ error: err.message || "Failed to reset tournament" }, 500);
  }
});

app.post("/api/admin/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { username, password } = body;
  const expectedUser = c.env?.OSHI_ADMIN_USERNAME || "admin";
  const expectedPass = c.env?.OSHI_ADMIN_PASSWORD;
  const expectedToken = getOshiAdminToken(c.env);

  if (!expectedPass || !expectedToken) {
    return c.json({ error: "Admin auth not configured on server" }, 503);
  }

  if (username === expectedUser && password === expectedPass) {
    return c.json({ success: true, token: expectedToken });
  }
  return c.json({ error: "Invalid admin username or password" }, 401);
});

app.post("/api/events/:id/start-qualifying", async (c) => {
  const eventsStore = await loadEventsStore(c.env);
  const event = eventsStore[c.req.param("id")];
  if (!event) return c.json({ error: "Event not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const hours = Number(body.durationHours) || 24;
  const endTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  event.stage = "qualifying";
  event.qualifyingEndTime = endTime;
  event.matchups = [];
  event.currentRound = 1;
  event.winnerId = null;

  await saveEventsStore(c.env, eventsStore);
  return c.json(event);
});

app.post("/api/events/:id/characters", async (c) => {
  const eventsStore = await loadEventsStore(c.env);
  const event = eventsStore[c.req.param("id")];
  if (!event) return c.json({ error: "Event not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const { name, series, avatarUrl, bio, quote, category } = body;
  if (!name || !series) {
    return c.json({ error: "Name and series are required" }, 400);
  }

  const newChar = {
    id: `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    series,
    avatarUrl:
      avatarUrl ||
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    bio: bio || "Contender in the Oshi Wars tournament.",
    quote: quote || "",
    category: category || "General",
    qualifyingScore: 10,
    qualifyingVotesCount: 1,
    averageRating: 10.0,
  };

  event.characters.push(newChar);
  await saveEventsStore(c.env, eventsStore);
  return c.json(newChar);
});

app.post("/api/events/:id/submit-ballot", async (c) => {
  const eventsStore = await loadEventsStore(c.env);
  const event = eventsStore[c.req.param("id")];
  if (!event) return c.json({ error: "Event not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const { voterId, rankings } = body;
  const cleanVoterId = normalizeVoterId(voterId);

  if (!cleanVoterId) {
    return c.json({ error: "Voter ID is required" }, 400);
  }

  if (!isAllowedVoter(cleanVoterId)) {
    return c.json({ error: "Voter ID is not on the allowed list" }, 403);
  }

  if (!rankings || !Array.isArray(rankings) || rankings.length === 0) {
    return c.json({ error: "At least one character ranking is required" }, 400);
  }

  event.ballots = event.ballots || [];

  const alreadyVoted = event.ballots.some(
    (b) => b.voterId.toLowerCase() === cleanVoterId.toLowerCase()
  );
  if (alreadyVoted) {
    return c.json({ error: "Already voted" }, 409);
  }

  const ballotChoices = [];

  rankings.forEach(({ rank, characterId }) => {
    if (!characterId) return;
    const char = event.characters.find((ch) => ch.id === characterId);
    if (char) {
      const points = Math.max(1, 6 - rank);
      ballotChoices.push({ rank, characterId, points });
    }
  });

  const newBallot = {
    id: `ballot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    voterId: cleanVoterId,
    timestamp: new Date().toISOString(),
    choices: ballotChoices,
  };

  event.ballots.unshift(newBallot);

  event.characters.forEach((ch) => {
    ch.qualifyingScore = 0;
    ch.qualifyingVotesCount = 0;
    ch.firstPlaceVotes = 0;
  });

  event.ballots.forEach((b) => {
    b.choices.forEach((choice) => {
      const char = event.characters.find((ch) => ch.id === choice.characterId);
      if (char) {
        char.qualifyingScore = (char.qualifyingScore || 0) + choice.points;
        char.qualifyingVotesCount = (char.qualifyingVotesCount || 0) + 1;
        if (choice.rank === 1) {
          char.firstPlaceVotes = (char.firstPlaceVotes || 0) + 1;
        }
      }
    });
  });

  event.characters.forEach((char) => {
    char.averageRating = Number(
      (
        (char.qualifyingScore || 0) / Math.max(1, char.qualifyingVotesCount || 1)
      ).toFixed(1)
    );
  });

  await saveEventsStore(c.env, eventsStore);
  return c.json({ success: true, ballot: newBallot, event });
});

app.post("/api/events/:id/qualify-vote", async (c) => {
  const eventsStore = await loadEventsStore(c.env);
  const event = eventsStore[c.req.param("id")];
  if (!event) return c.json({ error: "Event not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const { characterId, rating } = body;
  const char = event.characters.find((ch) => ch.id === characterId);
  if (!char) return c.json({ error: "Character not found" }, 404);

  const numRating = Math.min(10, Math.max(1, Number(rating) || 5));
  char.qualifyingScore += numRating;
  char.qualifyingVotesCount += 1;
  char.averageRating = Number(
    (char.qualifyingScore / char.qualifyingVotesCount).toFixed(1)
  );

  await saveEventsStore(c.env, eventsStore);
  return c.json({ success: true, character: char });
});

app.post("/api/events/:id/seed", async (c) => {
  const eventsStore = await loadEventsStore(c.env);
  const event = eventsStore[c.req.param("id")];
  if (!event) return c.json({ error: "Event not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const targetSize = body.maxTournamentSize || event.maxTournamentSize || 32;
  event.maxTournamentSize = targetSize;

  const sorted = [...event.characters].sort((a, b) => {
    if ((b.qualifyingScore || 0) !== (a.qualifyingScore || 0)) {
      return (b.qualifyingScore || 0) - (a.qualifyingScore || 0);
    }
    if ((b.firstPlaceVotes || 0) !== (a.firstPlaceVotes || 0)) {
      return (b.firstPlaceVotes || 0) - (a.firstPlaceVotes || 0);
    }
    if ((b.qualifyingVotesCount || 0) !== (a.qualifyingVotesCount || 0)) {
      return (b.qualifyingVotesCount || 0) - (a.qualifyingVotesCount || 0);
    }
    return a.name.localeCompare(b.name);
  });

  sorted.forEach((char, index) => {
    if (index < targetSize) {
      char.seed = index + 1;
      char.isEliminated = false;
    } else {
      char.seed = undefined;
      char.isEliminated = true;
    }
  });

  const topContenders = sorted.slice(0, targetSize);
  event.matchups = generateBracketTree(event.id, topContenders, targetSize);
  event.stage = "bracket";
  event.currentRound = 1;
  event.winnerId = null;

  await saveEventsStore(c.env, eventsStore);
  return c.json(event);
});

/** Admin: build a bracket from an explicit seed-ordered character ID list. */
app.post("/api/events/:id/manual-bracket", async (c) => {
  const denied = requireOshiAdmin(c);
  if (denied) return denied;

  const body = await c.req.json().catch(() => ({}));
  const { characterIds, maxTournamentSize } = body;
  const eventId = c.req.param("id");

  try {
    const result = await updateEventsStore(c.env, (eventsStore) => {
      const event = eventsStore[eventId];
      if (!event) return { ok: false, status: 404, error: "Event not found" };
      try {
        applyManualBracket(
          event,
          characterIds,
          maxTournamentSize || event.maxTournamentSize || 32
        );
      } catch (err) {
        return { ok: false, status: 400, error: err.message || "Invalid bracket" };
      }
      return { ok: true, payload: event };
    });

    if (!result.ok) {
      return c.json({ error: result.error }, result.status || 400);
    }
    return c.json(result.payload);
  } catch (err) {
    return c.json({ error: err.message || "Failed to build bracket" }, 409);
  }
});

app.post("/api/events/:id/vote-matchup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { matchupId, characterId, voterId } = body;
  const cleanVoterId = normalizeVoterId(voterId);
  const eventId = c.req.param("id");

  if (!cleanVoterId) {
    return c.json({ error: "Voter ID is required" }, 400);
  }

  if (!isAllowedVoter(cleanVoterId)) {
    return c.json({ error: "Voter ID is not on the allowed list" }, 403);
  }

  try {
    const result = await updateEventsStore(c.env, (eventsStore) => {
      const event = eventsStore[eventId];
      if (!event) return { ok: false, status: 404, error: "Event not found" };

      const matchup = event.matchups.find((m) => m.id === matchupId);
      if (!matchup) return { ok: false, status: 404, error: "Matchup not found" };

      if (matchup.isCompleted) {
        return { ok: false, status: 400, error: "Matchup is already completed" };
      }

      matchup.voters = Array.isArray(matchup.voters) ? matchup.voters : [];
      const alreadyVoted = matchup.voters.some(
        (id) => id.toLowerCase() === cleanVoterId.toLowerCase()
      );
      if (alreadyVoted) {
        return { ok: false, status: 409, error: "Already voted" };
      }

      if (characterId === matchup.character1Id) {
        matchup.votes1 += 1;
      } else if (characterId === matchup.character2Id) {
        matchup.votes2 += 1;
      } else {
        return {
          ok: false,
          status: 400,
          error: "Character is not in this matchup",
        };
      }

      matchup.voters.push(cleanVoterId);
      return { ok: true, payload: { success: true, matchup } };
    });

    if (!result.ok) {
      return c.json({ error: result.error }, result.status || 400);
    }
    return c.json(result.payload);
  } catch (err) {
    return c.json({ error: err.message || "Failed to vote" }, 409);
  }
});

app.post("/api/events/:id/advance-matchup", async (c) => {
  const denied = requireOshiAdmin(c);
  if (denied) return denied;

  const body = await c.req.json().catch(() => ({}));
  const { matchupId, winnerId: forcedWinnerId } = body;
  const eventId = c.req.param("id");

  try {
    const result = await updateEventsStore(c.env, (eventsStore) => {
      const event = eventsStore[eventId];
      if (!event) return { ok: false, status: 404, error: "Event not found" };

      const matchup = event.matchups.find((m) => m.id === matchupId);
      if (!matchup) return { ok: false, status: 404, error: "Matchup not found" };

      let winnerId = forcedWinnerId;
      if (!winnerId) {
        if (matchup.votes1 >= matchup.votes2) {
          winnerId = matchup.character1Id;
        } else {
          winnerId = matchup.character2Id;
        }
      }

      if (!winnerId) {
        return { ok: false, status: 400, error: "Cannot determine winner" };
      }

      matchup.winnerId = winnerId;
      matchup.isCompleted = true;

      const loserId =
        winnerId === matchup.character1Id
          ? matchup.character2Id
          : matchup.character1Id;
      if (loserId) {
        const loser = event.characters.find((ch) => ch.id === loserId);
        if (loser) loser.isEliminated = true;
      }

      // When the round is fully done, re-pair winners high vs low for the next round.
      // (Do not use fixed nextMatchup slots — those can force 1v2 early.)
      const currentRoundMatches = event.matchups.filter(
        (m) => m.round === event.currentRound
      );
      if (
        currentRoundMatches.length > 0 &&
        currentRoundMatches.every((m) => m.isCompleted)
      ) {
        const maxRound = Math.max(...event.matchups.map((m) => m.round));
        if (event.currentRound >= maxRound) {
          event.winnerId = winnerId;
          event.stage = "completed";
        } else {
          rebalanceNextRound(event);
        }
      }

      return { ok: true, payload: { success: true, event } };
    });

    if (!result.ok) {
      return c.json({ error: result.error }, result.status || 400);
    }
    return c.json(result.payload);
  } catch (err) {
    return c.json({ error: err.message || "Failed to advance matchup" }, 409);
  }
});

app.post("/api/events/:id/simulate-round", async (c) => {
  const denied = requireOshiAdmin(c);
  if (denied) return denied;

  const eventsStore = await loadEventsStore(c.env);
  const event = eventsStore[c.req.param("id")];
  if (!event) return c.json({ error: "Event not found" }, 404);

  const activeMatches = event.matchups.filter(
    (m) =>
      m.round === event.currentRound &&
      !m.isCompleted &&
      m.character1Id &&
      m.character2Id
  );

  activeMatches.forEach((m) => {
    const total = Math.floor(Math.random() * 350) + 150;
    const split = Math.random();
    m.votes1 += Math.floor(total * split);
    m.votes2 += Math.floor(total * (1 - split));

    const winnerId = m.votes1 >= m.votes2 ? m.character1Id : m.character2Id;
    m.winnerId = winnerId;
    m.isCompleted = true;

    const loserId =
      winnerId === m.character1Id ? m.character2Id : m.character1Id;
    if (loserId) {
      const loser = event.characters.find((ch) => ch.id === loserId);
      if (loser) loser.isEliminated = true;
    }
  });

  const currentRoundMatches = event.matchups.filter(
    (m) => m.round === event.currentRound
  );
  if (
    currentRoundMatches.length > 0 &&
    currentRoundMatches.every((m) => m.isCompleted)
  ) {
    const maxRound = Math.max(...event.matchups.map((m) => m.round));
    if (event.currentRound >= maxRound) {
      const final = currentRoundMatches[0];
      event.winnerId = final?.winnerId || null;
      event.stage = "completed";
    } else {
      rebalanceNextRound(event);
    }
  }

  await saveEventsStore(c.env, eventsStore);
  return c.json(event);
});

app.post("/api/ai/matchup-commentary", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { char1, char2, roundName } = body;
  if (!char1 || !char2) {
    return c.json({ error: "Both character profiles are required" }, 400);
  }

  const result = await generateMatchupCommentary(c.env, {
    char1,
    char2,
    roundName,
  });
  return c.json(result);
});

app.get("/", (c) => {
  return c.text("Uma Countdown API is running!");
});

app.notFound((c) => {
  return c.text("Not Found", 404);
});
export default app;
