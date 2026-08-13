import { PRESET_CHARACTERS } from "./presetCharacters.js";
import { getUmaIconUrl } from "./imageUtils.js";

const STORE_KEY = "oshi_wars_events";

/** In-memory fallback when KV is not bound (e.g. misconfigured local env). */
let memoryStore = null;

function getRoundName(roundNum, totalRounds) {
  const roundsLeft = totalRounds - roundNum + 1;
  if (roundsLeft === 1) return "Grand Finals";
  if (roundsLeft === 2) return "Semifinals";
  if (roundsLeft === 3) return "Quarterfinals";
  if (roundsLeft === 4) return "Round of 16";
  if (roundsLeft === 5) return "Round of 32";
  return `Round ${roundNum}`;
}

/** Highest seed vs lowest, 2nd highest vs 2nd lowest, etc. */
export function getHighLowSeedPairs(size) {
  const pairs = [];
  for (let i = 1; i <= size / 2; i++) {
    pairs.push([i, size + 1 - i]);
  }
  return pairs;
}

/**
 * After a round finishes, pair remaining winners by original seed:
 * best remaining vs worst remaining, 2nd-best vs 2nd-worst, etc.
 */
export function rebalanceNextRound(event) {
  const currentRoundMatches = event.matchups.filter(
    (m) => m.round === event.currentRound
  );
  if (
    currentRoundMatches.length === 0 ||
    !currentRoundMatches.every((m) => m.isCompleted)
  ) {
    return false;
  }

  const maxRound = Math.max(...event.matchups.map((m) => m.round));
  const winners = currentRoundMatches
    .map((m) => event.characters.find((c) => c.id === m.winnerId))
    .filter(Boolean)
    .sort((a, b) => (a.seed || 999) - (b.seed || 999));

  if (event.currentRound >= maxRound || winners.length < 2) {
    if (winners.length === 1) {
      event.winnerId = winners[0].id;
      event.stage = "completed";
    }
    return true;
  }

  const nextRound = event.currentRound + 1;
  const nextMatches = event.matchups
    .filter((m) => m.round === nextRound)
    .sort((a, b) => a.position - b.position);

  const pairCount = winners.length / 2;
  for (let i = 0; i < pairCount; i++) {
    const high = winners[i];
    const low = winners[winners.length - 1 - i];
    const match = nextMatches[i];
    if (!match) continue;
    match.character1Id = high.id;
    match.character2Id = low.id;
    match.votes1 = 0;
    match.votes2 = 0;
    match.voters = [];
    match.winnerId = null;
    match.isCompleted = false;
  }

  event.currentRound = nextRound;
  return true;
}

export function generateBracketTree(eventId, seededChars, bracketSize) {
  const matchups = [];
  const numRounds = Math.log2(bracketSize);
  const seedPairs = getHighLowSeedPairs(bracketSize);
  const round1MatchCount = bracketSize / 2;

  for (let pos = 0; pos < round1MatchCount; pos++) {
    const [s1, s2] = seedPairs[pos];
    const char1 = seededChars.find((c) => c.seed === s1) || null;
    const char2 = seededChars.find((c) => c.seed === s2) || null;

    matchups.push({
      id: `match-r1-pos${pos + 1}`,
      eventId,
      round: 1,
      roundName: getRoundName(1, numRounds),
      position: pos + 1,
      character1Id: char1 ? char1.id : null,
      character2Id: char2 ? char2.id : null,
      votes1: 0,
      votes2: 0,
      voters: [],
      winnerId: null,
      isCompleted: false,
      nextMatchupId: `match-r2-pos${Math.floor(pos / 2) + 1}`,
      nextMatchupSlot: pos % 2 === 0 ? 1 : 2,
    });
  }

  let prevRoundMatchCount = round1MatchCount;
  for (let r = 2; r <= numRounds; r++) {
    const currentRoundMatchCount = prevRoundMatchCount / 2;
    for (let pos = 0; pos < currentRoundMatchCount; pos++) {
      const isFinal = r === numRounds;
      matchups.push({
        id: `match-r${r}-pos${pos + 1}`,
        eventId,
        round: r,
        roundName: getRoundName(r, numRounds),
        position: pos + 1,
        character1Id: null,
        character2Id: null,
        votes1: 0,
        votes2: 0,
        voters: [],
        winnerId: null,
        isCompleted: false,
        nextMatchupId: isFinal
          ? null
          : `match-r${r + 1}-pos${Math.floor(pos / 2) + 1}`,
        nextMatchupSlot: isFinal ? undefined : pos % 2 === 0 ? 1 : 2,
      });
    }
    prevRoundMatchCount = currentRoundMatchCount;
  }

  return matchups;
}

/** Apply seeded character IDs (index 0 = seed 1) and build a fresh bracket. */
export function applyManualBracket(event, characterIds, targetSize) {
  const size = targetSize || event.maxTournamentSize || 32;
  if (![8, 16, 32].includes(size)) {
    throw new Error("Bracket size must be 8, 16, or 32");
  }
  if (!Array.isArray(characterIds) || characterIds.length !== size) {
    throw new Error(`Provide exactly ${size} character IDs in seed order`);
  }

  const unique = new Set(characterIds);
  if (unique.size !== size) {
    throw new Error("Duplicate characters in seed list");
  }

  const ordered = characterIds.map((id, index) => {
    const char = event.characters.find((c) => c.id === id);
    if (!char) throw new Error(`Character not found: ${id}`);
    return { char, seed: index + 1 };
  });

  event.characters.forEach((c) => {
    c.seed = undefined;
    c.isEliminated = true;
  });
  ordered.forEach(({ char, seed }) => {
    char.seed = seed;
    char.isEliminated = false;
  });

  const seeded = ordered.map(({ char }) => char);
  event.maxTournamentSize = size;
  event.matchups = generateBracketTree(event.id, seeded, size);
  event.stage = "bracket";
  event.currentRound = 1;
  event.winnerId = null;
  return event;
}

export function createDefaultEvent() {
  // Fresh / reset state: full roster available, no auto-bracket.
  // Admins build the Top 32 manually (or run qualifying + seed).
  const initialChars = PRESET_CHARACTERS.map((p, idx) => ({
    id: `char-${idx + 1}`,
    ...p,
    qualifyingScore: 0,
    qualifyingVotesCount: 0,
    firstPlaceVotes: 0,
    averageRating: 0,
    seed: undefined,
    isEliminated: false,
  }));

  return {
    id: "oshi-wars-2026",
    title: "Uma Musume Grand Prix 2026: Ultimate Uma Showdown",
    subtitle: "32-Character Single-Elimination Tournament Bracket",
    description:
      "Vote for your favorite Horse Girls in head-to-head 1v1 turf battles across 5 tournament rounds to crown the G1 Champion!",
    bannerUrl:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
    stage: "qualifying",
    maxTournamentSize: 32,
    characters: initialChars,
    matchups: [],
    ballots: [],
    currentRound: 1,
    winnerId: null,
    createdAt: new Date().toISOString(),
  };
}

export function normalizeStoreForDo(store) {
  const eventsStore = store && typeof store === "object" ? { ...store } : {};
  const defaultEvt = eventsStore["oshi-wars-2026"];

  const needsBootstrap =
    !defaultEvt ||
    !defaultEvt.characters?.some((c) => c.series === "Uma Musume Pretty Derby") ||
    (defaultEvt.stage === "bracket" &&
      (!defaultEvt.matchups || defaultEvt.matchups.length === 0));

  if (needsBootstrap) {
    const freshEvt = createDefaultEvent();
    eventsStore[freshEvt.id] = freshEvt;
    return { store: eventsStore, dirty: true };
  }

  let dirty = false;
  if (defaultEvt.maxTournamentSize !== 32) {
    defaultEvt.maxTournamentSize = 32;
    dirty = true;
  }
  if (!Array.isArray(defaultEvt.ballots)) {
    defaultEvt.ballots = [];
    dirty = true;
  }
  defaultEvt.matchups?.forEach((m) => {
    if (!Array.isArray(m.voters)) {
      m.voters = [];
      dirty = true;
    }
  });

  // Add any newly added preset characters without wiping live tournament state
  const existingNames = new Set(
    defaultEvt.characters.map((c) => c.name.toLowerCase())
  );
  PRESET_CHARACTERS.forEach((preset) => {
    if (!existingNames.has(preset.name.toLowerCase())) {
      defaultEvt.characters.push({
        id: `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...preset,
        avatarUrl: getUmaIconUrl(preset.name),
        qualifyingScore: 0,
        qualifyingVotesCount: 0,
        firstPlaceVotes: 0,
        averageRating: 0,
        isEliminated: defaultEvt.stage === "bracket",
      });
      dirty = true;
    }
  });

  defaultEvt.characters.forEach((c) => {
    // Official EN / wiki slug is one word (not "Machikane Tannhauser")
    if (
      c.name === "Machikane Tannhauser" ||
      c.name === "Machikane Tannhäuser" ||
      c.name === "Matikane Tannhauser"
    ) {
      c.name = "Matikanetannhauser";
      dirty = true;
    }
    if (c.name) {
      const nextUrl = getUmaIconUrl(c.name);
      if (c.avatarUrl !== nextUrl) {
        c.avatarUrl = nextUrl;
        dirty = true;
      }
    }
  });
  return { store: eventsStore, dirty };
}

function getStoreStub(env) {
  if (!env?.OSHI_WARS_DO) return null;
  return env.OSHI_WARS_DO.getByName("oshi-wars-main");
}

async function ensureDoImportedFromKv(env, stub) {
  if (!env?.OSHI_WARS_KV) return;
  try {
    const kvData = await env.OSHI_WARS_KV.get(STORE_KEY, "json");
    if (kvData) {
      await stub.importFromKvIfEmpty(kvData);
    }
  } catch (err) {
    console.error("KV→DO import skipped:", err);
  }
}

export async function loadEventsStore(env) {
  const stub = getStoreStub(env);
  if (stub) {
    await ensureDoImportedFromKv(env, stub);
    const { store } = await stub.getState();
    memoryStore = store;
    return store;
  }

  // Legacy KV / memory fallback
  try {
    if (env?.OSHI_WARS_KV) {
      const raw = await env.OSHI_WARS_KV.get(STORE_KEY, "json");
      const { store, dirty } = normalizeStoreForDo(raw);
      if (dirty) {
        await saveEventsStore(env, store);
      }
      memoryStore = store;
      return store;
    }
  } catch (err) {
    console.error("Error loading Oshi Wars KV store:", err);
  }

  if (!memoryStore) {
    memoryStore = normalizeStoreForDo(null).store;
  }
  return memoryStore;
}

export async function saveEventsStore(env, store) {
  memoryStore = store;
  const stub = getStoreStub(env);
  if (stub) {
    // Force save for callers that already applied a full replacement.
    await stub.forceSave(store);
    return;
  }
  if (env?.OSHI_WARS_KV) {
    await env.OSHI_WARS_KV.put(STORE_KEY, JSON.stringify(store));
  }
}

/**
 * Load → mutate → CAS-save with retries (prevents votes from overwriting resets).
 * updater(store) mutates store in place and returns the HTTP response payload.
 */
export async function updateEventsStore(env, updater) {
  const stub = getStoreStub(env);
  if (stub) {
    await ensureDoImportedFromKv(env, stub);
    for (let attempt = 0; attempt < 8; attempt++) {
      const { store, rev } = await stub.getState();
      const draft = structuredClone(store);
      const result = await updater(draft);
      const ok = await stub.saveIfRev(draft, rev);
      if (ok) {
        memoryStore = draft;
        return result;
      }
    }
    throw new Error("Tournament state is busy — please try again");
  }

  // Fallback path (no DO): best-effort single write
  const store = await loadEventsStore(env);
  const result = await updater(store);
  await saveEventsStore(env, store);
  return result;
}

/** Atomic bracket reset that cannot lose to an in-flight vote write. */
export async function resetOshiEvent(env, eventId) {
  const stub = getStoreStub(env);
  if (stub) {
    await ensureDoImportedFromKv(env, stub);
    const fresh = await stub.resetEvent(eventId);
    // Keep memory + legacy KV mirror in sync
    const { store } = await stub.getState();
    memoryStore = store;
    if (env?.OSHI_WARS_KV) {
      await env.OSHI_WARS_KV.put(STORE_KEY, JSON.stringify(store));
    }
    return fresh;
  }

  const fresh = createDefaultEvent();
  fresh.id = eventId;
  const eventsStore = await loadEventsStore(env);
  eventsStore[eventId] = fresh;
  await saveEventsStore(env, eventsStore);
  return fresh;
}

export async function generateMatchupCommentary(env, { char1, char2, roundName }) {
  const fallback = {
    commentary: `🔥 HIGH STAKES IN THE ${roundName?.toUpperCase() || "ARENA"}! ${char1.name} (${char1.series}) faces off against ${char2.name} (${char2.series})! Who will secure the fans' hearts and advance?`,
  };

  const key = env?.gemini_api_key || env?.GEMINI_API_KEY;
  if (!key) return fallback;

  const prompt = `You are the energetic, hype, anime tournament sports commentator for "Oshi Wars".
Character 1: ${char1.name} from "${char1.series}". Bio: "${char1.bio}". Quote: "${char1.quote || ""}".
Character 2: ${char2.name} from "${char2.series}". Bio: "${char2.bio}". Quote: "${char2.quote || ""}".
Round: ${roundName || "Head-to-Head Battle"}.

Write a punchy 2-3 sentence high-energy battle hype breakdown comparing their abilities, personalities, or fanbase passion. Keep it fun, dramatic, and full of anime tournament hype! Use an emoji or two.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      "An intense clash of titans is underway!";

    return { commentary: text };
  } catch (err) {
    console.error("Gemini error:", err);
    return {
      commentary: `⚡ BATTLE OF DESTINY! ${char1.name} vs ${char2.name} in the ${roundName}! Cast your votes to decide the victor!`,
    };
  }
}
