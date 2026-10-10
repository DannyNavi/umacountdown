import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PIN_LIMITS,
  addPin,
  isPin,
  parsePinInput,
  readPins,
  resetExilePinsMemory,
} from "./exilePins.js";

test("parsePinInput requires a place and a map point", () => {
  assert.equal(parsePinInput(null).ok, false);
  assert.equal(parsePinInput({ lat: 10, lng: 10 }).error, "Name the place you live.");
  assert.equal(parsePinInput({ place: "Lisbon" }).error, "Choose a point on the map.");
  assert.equal(parsePinInput({ place: "Lisbon", lat: 200, lng: 0 }).error, "That point is not on the map.");
});

test("parsePinInput trims fields and rounds coordinates", () => {
  const parsed = parsePinInput({
    name: "  Ada  ",
    place: "  Lisbon  ",
    note: "A room above the tram.",
    lat: 38.72231234,
    lng: -9.13933111,
  });
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, {
    name: "Ada",
    place: "Lisbon",
    note: "A room above the tram.",
    lat: 38.72231,
    lng: -9.13933,
  });
});

test("readPins and addPin persist in memory without KV", async () => {
  resetExilePinsMemory();
  assert.deepEqual(await readPins({}), []);

  const pin = await addPin(
    {},
    { name: "Ada", place: "Lisbon", note: "", lat: 38.72, lng: -9.14 }
  );
  assert.equal(isPin(pin), true);
  assert.equal(pin.place, "Lisbon");

  const pins = await readPins({});
  assert.equal(pins.length, 1);
  assert.equal(pins[0].id, pin.id);
});

test("addPin refuses a full atlas", async () => {
  resetExilePinsMemory();
  const env = {
    OSHI_WARS_KV: {
      async get() {
        return Array.from({ length: PIN_LIMITS.maxPins }, (_, i) => ({
          id: `pin-${i}`,
          name: "",
          place: "Here",
          note: "",
          lat: 0,
          lng: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
        }));
      },
      async put() {},
    },
  };

  await assert.rejects(() => addPin(env, { name: "", place: "Lisbon", note: "", lat: 1, lng: 1 }), {
    message: "The atlas is full.",
  });
});
