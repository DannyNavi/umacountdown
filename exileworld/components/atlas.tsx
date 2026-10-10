"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PinComposer } from "@/components/pin-composer";
import { Roster } from "@/components/roster";
import { WorldMap } from "@/components/world-map";
import { displayName, isPin, parsePinInput, type Pin } from "@/lib/pins";
import { cn } from "@/lib/utils";

type DraftPoint = { lat: number; lng: number };

function isPinList(value: unknown): value is Pin[] {
  return Array.isArray(value) && value.every(isPin);
}

export function Atlas({ initialPins }: { initialPins: Pin[] }) {
  const [pins, setPins] = useState(initialPins);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [focusToken, setFocusToken] = useState(0);
  const [focusPoint, setFocusPoint] = useState<DraftPoint | null>(null);
  const syncingRef = useRef(false);
  const selected = pins.find((pin) => pin.id === selectedId) ?? null;

  const syncPins = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const response = await fetch("/api/pins", { cache: "no-store" });
      if (!response.ok) throw new Error("sync failed");
      const data: unknown = await response.json();
      const serverPins =
        data &&
        typeof data === "object" &&
        "pins" in data &&
        isPinList(data.pins)
          ? data.pins
          : null;
      if (!serverPins) throw new Error("sync failed");

      setPins((current) => {
        const pending = current.filter(
          (pin) =>
            pin.id.startsWith("pending-") &&
            !serverPins.some(
              (saved) =>
                saved.name === pin.name &&
                saved.place === pin.place &&
                Math.abs(saved.lat - pin.lat) < 0.0002 &&
                Math.abs(saved.lng - pin.lng) < 0.0002,
            ),
        );
        return [...pending, ...serverPins];
      });
      setSyncError(false);
    } catch {
      setSyncError(true);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void syncPins();
    }, 4000);
    const onFocus = () => {
      void syncPins();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncPins]);

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`home-${selectedId}`)?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || saving) return;
      if (draft) {
        setDraft(null);
        setError(null);
        return;
      }
      setSelectedId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draft, saving]);

  function choosePoint(point: DraftPoint) {
    if (saving) return;
    setDraft(point);
    setSelectedId(null);
    setError(null);
  }

  function selectPin(id: string) {
    if (saving) return;
    const pin = pins.find((item) => item.id === id);
    setSelectedId(id);
    setDraft(null);
    setError(null);
    if (!pin) return;
    setFocusPoint({ lat: pin.lat, lng: pin.lng });
    setFocusToken((token) => token + 1);
  }

  async function savePin(value: { name: string; place: string; note: string }) {
    if (!draft || saving) return;
    const parsed = parsePinInput({ ...value, lat: draft.lat, lng: draft.lng });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const optimistic: Pin = {
      id: `pending-${crypto.randomUUID()}`,
      ...parsed.value,
      createdAt: new Date().toISOString(),
    };

    setSaving(true);
    setError(null);
    setPins((current) => [optimistic, ...current]);
    setSelectedId(optimistic.id);

    try {
      const response = await fetch("/api/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "The pin could not be saved.";
        throw new Error(message);
      }

      const saved =
        data && typeof data === "object" && "pin" in data ? data.pin : null;
      if (!isPin(saved)) {
        throw new Error("The pin could not be saved.");
      }

      setPins((current) => {
        const withoutPending = current.filter((item) => item.id !== optimistic.id);
        if (withoutPending.some((item) => item.id === saved.id)) return withoutPending;
        return [saved, ...withoutPending];
      });
      setDraft(null);
      setSelectedId(saved.id);
      setFocusPoint({ lat: saved.lat, lng: saved.lng });
      setFocusToken((token) => token + 1);
      setStatusMessage(`${displayName(saved)} is marked in ${saved.place}.`);
    } catch (caught) {
      setPins((current) => current.filter((item) => item.id !== optimistic.id));
      setSelectedId(null);
      setError(
        caught instanceof Error ? caught.message : "The pin could not be saved.",
      );
      setStatusMessage("The pin could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col px-3 py-3 md:px-5 md:py-4">
      <header className="flex shrink-0 items-center justify-between gap-4 pb-3">
        <div className="flex items-center gap-3">
          <Compass />
          <div>
            <p className="text-[11px] tracking-[0.22em] text-primary uppercase">
              Shared atlas
            </p>
            <h1 className="font-heading text-3xl leading-none tracking-tight md:text-4xl">
              Exile World
            </h1>
          </div>
        </div>
        <p className="hidden max-w-xs text-right text-sm leading-5 text-muted-foreground sm:block">
          Mark where you live. Everyone who opens this page sees the same pins.
        </p>
      </header>

      <noscript>
        <p className="mb-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          JavaScript is off, so you can read the atlas but not drop a new pin.
          The homes below were drawn on the server.
        </p>
      </noscript>

      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <div className="relative flex min-h-0 flex-1 flex-col gap-3">
          <div className="relative min-h-[200px] flex-1 overflow-hidden rounded-2xl border border-border">
            <WorldMap
              pins={pins}
              selectedId={selectedId}
              draft={draft}
              focusToken={focusToken}
              focusPoint={focusPoint}
              onPick={choosePoint}
              onSelect={selectPin}
            />
            {selected && !draft ? (
              <div className="pointer-events-none absolute top-3 left-3 z-10 hidden max-w-xs rounded-2xl border border-border bg-card/95 px-3 py-2.5 shadow-xl shadow-black/30 sm:block">
                <p className="font-heading text-xl leading-tight">{selected.place}</p>
                <p
                  className={cn(
                    "mt-0.5 text-sm",
                    selected.name ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {displayName(selected)}
                </p>
                {selected.note ? (
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {selected.note}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {draft ? (
            <div className="z-20 shrink-0 lg:absolute lg:bottom-4 lg:left-4 lg:w-[22.5rem]">
              <PinComposer
                lat={draft.lat}
                lng={draft.lng}
                saving={saving}
                error={error}
                onCancel={() => {
                  if (saving) return;
                  setDraft(null);
                  setError(null);
                }}
                onSubmit={savePin}
              />
            </div>
          ) : null}
        </div>
        <aside
          className={`flex min-h-36 w-full shrink-0 flex-col lg:max-h-none lg:w-[22.5rem] ${
            draft ? "hidden lg:flex" : "max-h-[42vh] lg:max-h-none"
          }`}
        >
          <Roster
            pins={pins}
            selectedId={selectedId}
            syncError={syncError}
            onSelect={selectPin}
          />
        </aside>
      </div>
    </div>
  );
}

function Compass() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-11 shrink-0 text-primary"
      aria-hidden="true"
    >
      <circle
        cx="24"
        cy="24"
        r="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.8"
      />
      <path d="M24 8.5 L27.2 24 L24 21.2 L20.8 24 Z" fill="currentColor" />
      <path
        d="M24 39.5 L20.8 24 L24 26.8 L27.2 24 Z"
        fill="currentColor"
        opacity="0.35"
      />
      <circle cx="24" cy="24" r="1.7" fill="currentColor" />
    </svg>
  );
}
