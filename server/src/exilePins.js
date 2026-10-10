export const PIN_LIMITS = {
  name: 40,
  place: 60,
  note: 160,
  maxPins: 500,
};

const STORE_KEY = "exile_world_pins";

/** In-memory fallback when KV is not bound (local/tests). */
let memoryPins = null;

export function resetExilePinsMemory() {
  memoryPins = null;
}

function clean(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function roundCoord(value) {
  return Math.round(value * 1e5) / 1e5;
}

export function parsePinInput(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "That pin could not be read." };
  }

  const name = clean(body.name, PIN_LIMITS.name);
  const place = clean(body.place, PIN_LIMITS.place);
  const note = clean(body.note, PIN_LIMITS.note);

  if (!place) return { ok: false, error: "Name the place you live." };

  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: "Choose a point on the map." };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: "That point is not on the map." };
  }

  return {
    ok: true,
    value: {
      name,
      place,
      note,
      lat: roundCoord(lat),
      lng: roundCoord(lng),
    },
  };
}

export function isPin(value) {
  if (!value || typeof value !== "object") return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.place === "string" &&
    typeof value.note === "string" &&
    typeof value.lat === "number" &&
    typeof value.lng === "number" &&
    typeof value.createdAt === "string" &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng)
  );
}

function normalizePins(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPin).slice(0, PIN_LIMITS.maxPins);
}

async function loadPins(env) {
  if (env?.OSHI_WARS_KV) {
    try {
      const raw = await env.OSHI_WARS_KV.get(STORE_KEY, "json");
      memoryPins = normalizePins(raw);
      return memoryPins;
    } catch (err) {
      console.error("Failed to load Exile World pins from KV:", err);
    }
  }

  if (!memoryPins) memoryPins = [];
  return memoryPins;
}

async function savePins(env, pins) {
  memoryPins = pins;
  if (env?.OSHI_WARS_KV) {
    await env.OSHI_WARS_KV.put(STORE_KEY, JSON.stringify(pins));
  }
}

export async function readPins(env) {
  return loadPins(env);
}

export async function addPin(env, input) {
  const pins = await loadPins(env);
  if (pins.length >= PIN_LIMITS.maxPins) {
    const error = new Error("The atlas is full.");
    error.code = "ATLAS_FULL";
    throw error;
  }

  const pin = {
    id: crypto.randomUUID(),
    name: input.name,
    place: input.place,
    note: input.note,
    lat: input.lat,
    lng: input.lng,
    createdAt: new Date().toISOString(),
  };

  await savePins(env, [pin, ...pins]);
  return pin;
}
