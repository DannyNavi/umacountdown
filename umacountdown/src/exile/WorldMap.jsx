import { Minus, Plus, RotateCcw } from "lucide-react";
import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import maplibreWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { displayName, homeCount } from "./pins.js";

// Vite emits this worker as a same-origin asset. MapLibre's default
// sibling URL (./maplibre-gl-worker.mjs next to the bundle) does not exist.
setWorkerUrl(maplibreWorker);

const WORLD_CENTER = [0, 20];
const WORLD_ZOOM = 1.6;

function makePinElement(pin, selected, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `ExileWorld-pinMarker${selected ? " is-selected" : ""}`;
  button.setAttribute("aria-label", displayName(pin));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onSelect(pin.id);
  });
  return button;
}

function makeDraftElement() {
  const wrap = document.createElement("span");
  wrap.className = "ExileWorld-draftMarker";
  wrap.innerHTML = '<span class="ExileWorld-draftPulse"></span>';
  return wrap;
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

    const map = new MapLibreMap({
      container,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      minZoom: 1,
      maxZoom: 12,
      attributionControl: true,
    });

    map.on("click", (event) => {
      onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    map.on("load", () => map.resize());
    mapRef.current = map;

    return () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
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
        marker = new Marker({
          element: makePinElement(pin, pin.id === selectedId, (id) => onSelectRef.current(id)),
          anchor: "center",
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
        markersRef.current.set(pin.id, marker);
      } else {
        marker.setLngLat([pin.lng, pin.lat]);
        const selected = pin.id === selectedId;
        marker.getElement().classList.toggle("is-selected", selected);
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
      draftMarkerRef.current = new Marker({
        element: makeDraftElement(),
        anchor: "center",
      })
        .setLngLat([draft.lng, draft.lat])
        .addTo(map);
      return;
    }

    draftMarkerRef.current.setLngLat([draft.lng, draft.lat]);
  }, [draft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPoint || focusToken === 0) return;
    map.easeTo({
      center: [focusPoint.lng, focusPoint.lat],
      zoom: Math.max(map.getZoom(), 5),
      duration: 450,
    });
  }, [focusPoint, focusToken]);

  function zoomBy(delta) {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 200 });
  }

  function resetView() {
    mapRef.current?.easeTo({ center: WORLD_CENTER, zoom: WORLD_ZOOM, duration: 300 });
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
