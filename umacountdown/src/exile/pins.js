export const PIN_LIMITS = {
  name: 40,
  place: 60,
  note: 160,
  maxPins: 500,
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatCoord(lat, lng) {
  const latHemisphere = lat >= 0 ? "N" : "S";
  const lngHemisphere = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${latHemisphere}, ${Math.abs(lng).toFixed(2)}° ${lngHemisphere}`;
}

export function formatWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function displayName(pin) {
  return pin.name.trim() ? pin.name : "Anonymous";
}

export function homeCount(count) {
  if (count === 0) return "No homes marked yet";
  if (count === 1) return "1 home marked";
  return `${count} homes marked`;
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

  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return { ok: false, error: "Choose a point on the map." };
  }

  if (
    !Number.isFinite(body.lat) ||
    !Number.isFinite(body.lng) ||
    body.lat < -90 ||
    body.lat > 90 ||
    body.lng < -180 ||
    body.lng > 180
  ) {
    return { ok: false, error: "That point is not on the map." };
  }

  return {
    ok: true,
    value: {
      name,
      place,
      note,
      lat: roundCoord(body.lat),
      lng: roundCoord(body.lng),
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

export function isPinList(value) {
  return Array.isArray(value) && value.every(isPin);
}
