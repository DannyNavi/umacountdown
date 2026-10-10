import { useCallback, useEffect, useRef, useState } from "react";
import PinComposer from "../exile/PinComposer.jsx";
import WorldMap from "../exile/WorldMap.jsx";
import { displayName, isPin, isPinList, parsePinInput } from "../exile/pins.js";
import "./ExileWorld.css";

export default function ExileWorld() {
  const [pins, setPins] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [focusToken, setFocusToken] = useState(0);
  const [focusPoint, setFocusPoint] = useState(null);
  const syncingRef = useRef(false);
  const removedIdsRef = useRef(new Set());
  const selected = pins.find((pin) => pin.id === selectedId) ?? null;

  const syncPins = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const response = await fetch("/api/v4/exile/pins", { cache: "no-store" });
      if (!response.ok) throw new Error("sync failed");
      const data = await response.json();
      const serverPins = isPinList(data?.pins) ? data.pins : null;
      if (!serverPins) throw new Error("sync failed");

      const visible = serverPins.filter((pin) => !removedIdsRef.current.has(pin.id));
      for (const id of [...removedIdsRef.current]) {
        if (!serverPins.some((pin) => pin.id === id)) {
          removedIdsRef.current.delete(id);
        }
      }

      setPins((current) => {
        const pending = current.filter(
          (pin) =>
            pin.id.startsWith("pending-") &&
            !visible.some(
              (saved) =>
                saved.name === pin.name &&
                saved.place === pin.place &&
                Math.abs(saved.lat - pin.lat) < 0.0002 &&
                Math.abs(saved.lng - pin.lng) < 0.0002
            )
        );
        return [...pending, ...visible];
      });
    } catch {
      // Keep the last map if a refresh fails.
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void syncPins();
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
    function onKeyDown(event) {
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

  function choosePoint(point) {
    if (saving) return;
    setDraft(point);
    setSelectedId(null);
    setError(null);
  }

  function selectPin(id) {
    if (saving) return;
    const pin = pins.find((item) => item.id === id);
    setSelectedId(id);
    setDraft(null);
    setError(null);
    if (!pin) return;
    setFocusPoint({ lat: pin.lat, lng: pin.lng });
    setFocusToken((token) => token + 1);
  }

  async function savePin(value) {
    if (!draft || saving) return;
    const parsed = parsePinInput({ ...value, lat: draft.lat, lng: draft.lng });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const optimistic = {
      id: `pending-${crypto.randomUUID()}`,
      ...parsed.value,
      createdAt: new Date().toISOString(),
    };

    setSaving(true);
    setError(null);
    setPins((current) => [optimistic, ...current]);
    setSelectedId(optimistic.id);

    try {
      const response = await fetch("/api/v4/exile/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "The pin could not be saved.");
      }
      if (!isPin(data?.pin)) {
        throw new Error("The pin could not be saved.");
      }

      setPins((current) => {
        const withoutPending = current.filter((item) => item.id !== optimistic.id);
        if (withoutPending.some((item) => item.id === data.pin.id)) return withoutPending;
        return [data.pin, ...withoutPending];
      });
      setDraft(null);
      setSelectedId(data.pin.id);
      setFocusPoint({ lat: data.pin.lat, lng: data.pin.lng });
      setFocusToken((token) => token + 1);
      setStatusMessage(`${displayName(data.pin)} is marked on the map.`);
    } catch (caught) {
      setPins((current) => current.filter((item) => item.id !== optimistic.id));
      setSelectedId(null);
      setError(caught instanceof Error ? caught.message : "The pin could not be saved.");
      setStatusMessage("The pin could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSelectedPin() {
    if (!selected || saving) return;

    const pin = selected;
    if (pin.id.startsWith("pending-")) {
      setPins((current) => current.filter((item) => item.id !== pin.id));
      setSelectedId(null);
      setError(null);
      setStatusMessage(`${displayName(pin)} was removed.`);
      return;
    }

    removedIdsRef.current.add(pin.id);
    setSaving(true);
    setError(null);
    setPins((current) => current.filter((item) => item.id !== pin.id));
    setSelectedId(null);

    try {
      const response = await fetch(`/api/v4/exile/pins/${encodeURIComponent(pin.id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok && response.status !== 404) {
        throw new Error(data?.error || "The pin could not be removed.");
      }
      setStatusMessage(`${displayName(pin)} was removed.`);
    } catch (caught) {
      removedIdsRef.current.delete(pin.id);
      setPins((current) =>
        current.some((item) => item.id === pin.id) ? current : [pin, ...current]
      );
      setSelectedId(pin.id);
      setError(caught instanceof Error ? caught.message : "The pin could not be removed.");
      setStatusMessage("The pin could not be removed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ExileWorld-Container">
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>
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
        <div className="ExileWorld-card">
          <p className="ExileWorld-cardPlace">{displayName(selected)}</p>
          {error ? (
            <p role="alert" className="ExileWorld-formError">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="ExileWorld-remove"
            onClick={removeSelectedPin}
            disabled={saving}
          >
            {saving ? "Removing…" : "Remove"}
          </button>
        </div>
      ) : null}
      {draft ? (
        <div className="ExileWorld-composerWrap">
          <PinComposer
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
  );
}
