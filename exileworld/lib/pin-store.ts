import "server-only";

import { env } from "cloudflare:workers";
import { randomUUID } from "node:crypto";

import { isPin, PIN_LIMITS, type Pin, type PinInput } from "@/lib/pins";

type PinRow = {
  id: string;
  name: string;
  place: string;
  note: string;
  lat: number;
  lng: number;
  created_at: string;
};

let tableReady: Promise<void> | undefined;

function ensurePinsTable(): Promise<void> {
  tableReady ??= env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS pins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      place TEXT NOT NULL,
      note TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      created_at TEXT NOT NULL
    )`,
  )
    .run()
    .then(() => undefined)
    .catch((error: unknown) => {
      tableReady = undefined;
      throw error;
    });
  return tableReady;
}

function toPin(row: PinRow): Pin | null {
  const pin = {
    id: row.id,
    name: row.name,
    place: row.place,
    note: row.note,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
  };
  return isPin(pin) ? pin : null;
}

export async function readPins(): Promise<Pin[]> {
  await ensurePinsTable();
  const result = await env.DB.prepare(
    `SELECT id, name, place, note, lat, lng, created_at
     FROM pins
     ORDER BY created_at DESC`,
  ).all<PinRow>();
  return result.results.flatMap((row) => {
    const pin = toPin(row);
    return pin ? [pin] : [];
  });
}

export async function addPin(input: PinInput): Promise<Pin> {
  await ensurePinsTable();
  const pin: Pin = {
    id: randomUUID(),
    name: input.name,
    place: input.place,
    note: input.note,
    lat: input.lat,
    lng: input.lng,
    createdAt: new Date().toISOString(),
  };

  const result = await env.DB.prepare(
    `INSERT INTO pins (id, name, place, note, lat, lng, created_at)
     SELECT ?, ?, ?, ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM pins) < ?`,
  )
    .bind(
      pin.id,
      pin.name,
      pin.place,
      pin.note,
      pin.lat,
      pin.lng,
      pin.createdAt,
      PIN_LIMITS.maxPins,
    )
    .run();

  if (!result.meta.changes) {
    throw new Error("The atlas is full.");
  }

  return pin;
}
