import L from "leaflet";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

import { displayName, homeCount } from "./pins.js";

const WORLD_CENTER = [20, 0];
const WORLD_ZOOM = 2;

function pinIcon(selected) {
  return L.divIcon({
    className: "",
    html: `<button type="button" class="ExileWorld-pinMarker${selected ? " is-selected" : ""}"></button>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function draftIcon() {
  return L.divIcon({
    className: "",
    html: `<span class="ExileWorld-draftMarker"><span class="ExileWorld-draftPulse"></span></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function WorldMap({
  pins,
  selectedId,
  draft,
  focusToken,
  focusPoint,
  onPick,
  onSelect,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const draftMarkerRef = useRef(null);
  const onPickRef = useRef(onPick);
  const onSelectRef = useRef(onSelect);

  onPickRef.current = onPick;
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const map = L.map(container, {
      zoomControl: false,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
      attributionControl: true,
    }).setView(WORLD_CENTER, WORLD_ZOOM);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    map.on("click", (event) => {
      onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      draftMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextIds = new Set(pins.map((pin) => pin.id));
    for (const [id, marker] of markersRef.current) {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const pin of pins) {
      let marker = markersRef.current.get(pin.id);
      if (!marker) {
        marker = L.marker([pin.lat, pin.lng], {
          icon: pinIcon(pin.id === selectedId),
          keyboard: true,
          title: displayName(pin),
        }).addTo(map);
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          onSelectRef.current(pin.id);
        });
        markersRef.current.set(pin.id, marker);
      } else {
        marker.setLatLng([pin.lat, pin.lng]);
        marker.setIcon(pinIcon(pin.id === selectedId));
      }
    }
  }, [pins, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!draft) {
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
      return;
    }

    if (!draftMarkerRef.current) {
      draftMarkerRef.current = L.marker([draft.lat, draft.lng], {
        icon: draftIcon(),
        interactive: false,
        keyboard: false,
      }).addTo(map);
      return;
    }

    draftMarkerRef.current.setLatLng([draft.lat, draft.lng]);
  }, [draft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPoint || focusToken === 0) return;
    map.flyTo([focusPoint.lat, focusPoint.lng], Math.max(map.getZoom(), 5), {
      duration: 0.45,
    });
  }, [focusPoint, focusToken]);

  function zoomBy(delta) {
    mapRef.current?.setZoom((mapRef.current.getZoom() ?? WORLD_ZOOM) + delta);
  }

  function resetView() {
    mapRef.current?.setView(WORLD_CENTER, WORLD_ZOOM);
  }

  return (
    <div className="ExileWorld-map">
      <div
        ref={containerRef}
        className="ExileWorld-leaflet"
        role="application"
        aria-label={`World map with ${homeCount(pins.length).toLowerCase()}. Click to mark a home.`}
      />
      <div className="ExileWorld-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1)}>
          <Plus />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(-1)}>
          <Minus />
        </button>
        <button type="button" aria-label="Show the whole world" onClick={resetView}>
          <RotateCcw />
        </button>
      </div>
    </div>
  );
}
