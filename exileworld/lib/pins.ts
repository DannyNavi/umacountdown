export const PIN_LIMITS = {
  name: 40,
  place: 60,
  note: 160,
  maxPins: 500,
} as const;

export type Pin = {
  id: string;
  name: string;
  place: string;
  note: string;
  lat: number;
  lng: number;
  createdAt: string;
};

export type PinInput = {
  name: string;
  place: string;
  note: string;
  lat: number;
  lng: number;
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
] as const;

export function formatCoord(lat: number, lng: number): string {
  const latHemisphere = lat >= 0 ? "N" : "S";
  const lngHemisphere = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${latHemisphere}, ${Math.abs(lng).toFixed(2)}° ${lngHemisphere}`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function displayName(pin: { name: string }): string {
  return pin.name.trim() ? pin.name : "Anonymous";
}

export function homeCount(count: number): string {
  if (count === 0) return "No homes marked yet";
  if (count === 1) return "1 home marked";
  return `${count} homes marked`;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

export function parsePinInput(
  body: unknown,
): { ok: true; value: PinInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "That pin could not be read." };
  }

  const record = body as Record<string, unknown>;
  const name = clean(record.name, PIN_LIMITS.name);
  const place = clean(record.place, PIN_LIMITS.place);
  const note = clean(record.note, PIN_LIMITS.note);

  if (!place) return { ok: false, error: "Name the place you live." };

  if (typeof record.lat !== "number" || typeof record.lng !== "number") {
    return { ok: false, error: "Choose a point on the map." };
  }

  if (
    !Number.isFinite(record.lat) ||
    !Number.isFinite(record.lng) ||
    record.lat < -90 ||
    record.lat > 90 ||
    record.lng < -180 ||
    record.lng > 180
  ) {
    return { ok: false, error: "That point is not on the map." };
  }

  return {
    ok: true,
    value: {
      name,
      place,
      note,
      lat: roundCoord(record.lat),
      lng: roundCoord(record.lng),
    },
  };
}

export function isPin(value: unknown): value is Pin {
  if (!value || typeof value !== "object") return false;
  const pin = value as Partial<Pin>;
  return (
    typeof pin.id === "string" &&
    typeof pin.name === "string" &&
    typeof pin.place === "string" &&
    typeof pin.note === "string" &&
    typeof pin.lat === "number" &&
    typeof pin.lng === "number" &&
    typeof pin.createdAt === "string" &&
    Number.isFinite(pin.lat) &&
    Number.isFinite(pin.lng)
  );
}
