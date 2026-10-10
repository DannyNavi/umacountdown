import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  MAP_HEIGHT,
  MAP_WIDTH,
  clampTransform,
  countryPaths,
  fittedView,
  focusTransform,
  graticulePath,
  nationLabels,
  project,
  spherePath,
  unproject,
  zoomAt,
} from "./geography.js";
import { displayName, homeCount } from "./pins.js";

export default function WorldMap({
  pins,
  selectedId,
  draft,
  focusToken,
  focusPoint,
  onPick,
  onSelect,
}) {
  const svgRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);

  function commit(next) {
    const clamped = clampTransform(next);
    transformRef.current = clamped;
    setTransform(clamped);
  }

  useEffect(() => {
    if (!focusPoint || focusToken === 0) return;
    const next = focusTransform(focusPoint.lat, focusPoint.lng, transformRef.current);
    transformRef.current = next;
    setTransform(next);
  }, [focusPoint, focusToken]);

  function viewPoint(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return null;
    const fitted = fittedView(svg.getBoundingClientRect());
    if (fitted.scale === 0) return null;
    return {
      px: (clientX - fitted.left) / fitted.scale,
      py: (clientY - fitted.top) / fitted.scale,
    };
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (event.target?.closest?.("[data-pin]")) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transformRef.current.x,
      originY: transformRef.current.y,
      moved: false,
    };
    setDragging(true);
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const threshold = event.pointerType === "touch" ? 10 : 4;
    if (transformRef.current.k > 1 && Math.hypot(dx, dy) > threshold) {
      drag.moved = true;
    }
    if (transformRef.current.k <= 1) return;
    const point = viewPoint(event.clientX, event.clientY);
    const origin = viewPoint(drag.startX, drag.startY);
    if (!point || !origin) return;
    commit({
      k: transformRef.current.k,
      x: drag.originX + (point.px - origin.px),
      y: drag.originY + (point.py - origin.py),
    });
  }

  function finishPointer(event, place) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (!place || drag.moved) return;

    const point = viewPoint(event.clientX, event.clientY);
    if (!point) return;
    const current = transformRef.current;
    const worldX = (point.px - current.x) / current.k;
    const worldY = (point.py - current.y) / current.k;
    const location = unproject(worldX, worldY);
    if (location) onPick(location);
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function onWheel(event) {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const fitted = fittedView(rect);
      if (fitted.scale === 0) return;
      const px = (event.clientX - fitted.left) / fitted.scale;
      const py = (event.clientY - fitted.top) / fitted.scale;
      const factor = event.deltaY < 0 ? 1.16 : 1 / 1.16;
      const next = zoomAt(transformRef.current, px, py, factor);
      transformRef.current = next;
      setTransform(next);
    }

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  function zoomBy(factor) {
    const next = zoomAt(transformRef.current, MAP_WIDTH / 2, MAP_HEIGHT / 2, factor);
    transformRef.current = next;
    setTransform(next);
  }

  const draftPoint = draft ? project(draft.lng, draft.lat) : null;

  return (
    <div className="ExileWorld-map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className={`ExileWorld-svg${dragging ? " is-dragging" : ""}`}
        role="application"
        aria-label={`World map with ${homeCount(pins.length).toLowerCase()}. Click to mark where you live. Drag to move the map.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finishPointer(event, true)}
        onPointerCancel={(event) => finishPointer(event, false)}
      >
        <defs>
          <radialGradient id="ocean-fill" cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor="#355864" />
            <stop offset="58%" stopColor="#243b44" />
            <stop offset="100%" stopColor="#17262c" />
          </radialGradient>
        </defs>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <path d={spherePath} fill="url(#ocean-fill)" />
          <path d={graticulePath} className="ExileWorld-graticule" />
          {countryPaths.map((country) => (
            <path key={country.id} d={country.d} className="ExileWorld-land" />
          ))}
          <path d={spherePath} className="ExileWorld-sphere" />
          <g aria-hidden="true">
            {nationLabels.map((label) => {
              if (transform.k < label.minZoom) return null;
              const firstOffset = label.lines.length === 1 ? "0" : "-0.55em";
              return (
                <g
                  key={label.id}
                  transform={`translate(${label.x} ${label.y}) scale(${1 / transform.k})`}
                >
                  <text
                    className="ExileWorld-nation"
                    fontSize={label.size}
                    textAnchor="middle"
                    dominantBaseline={label.rotate ? "central" : undefined}
                    transform={label.rotate ? `rotate(${label.rotate})` : undefined}
                  >
                    {label.lines.map((line, index) => (
                      <tspan key={line} x="0" dy={index === 0 ? firstOffset : "1.15em"}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
          {pins.map((pin) => {
            const point = project(pin.lng, pin.lat);
            if (!point) return null;
            const selected = pin.id === selectedId;
            return (
              <g
                key={pin.id}
                data-pin=""
                className="ExileWorld-pin"
                role="button"
                tabIndex={0}
                aria-label={displayName(pin)}
                aria-pressed={selected}
                transform={`translate(${point[0]} ${point[1]}) scale(${1 / transform.k})`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(pin.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onSelect(pin.id);
                }}
              >
                <circle r={16} fill="transparent" />
                {selected ? (
                  <circle r={12} fill="none" stroke="#f3eee6" strokeWidth={1.2} />
                ) : null}
                <circle
                  className="ExileWorld-pinCore"
                  r={6.5}
                  fill={selected ? "#f6d7a8" : "#e39a4d"}
                  stroke="#1a120c"
                  strokeWidth={1.4}
                />
              </g>
            );
          })}
          {draft && draftPoint ? (
            <g
              transform={`translate(${draftPoint[0]} ${draftPoint[1]}) scale(${1 / transform.k})`}
              pointerEvents="none"
            >
              <circle className="ExileWorld-draftPulse" r={16} fill="#f3eee6" />
              <circle r={7} fill="none" stroke="#f3eee6" strokeWidth={1.6} />
              <circle r={2.5} fill="#f3eee6" />
            </g>
          ) : null}
        </g>
      </svg>

      <div className="ExileWorld-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.35)}>
          <Plus />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.35)}>
          <Minus />
        </button>
        <button type="button" aria-label="Show the whole world" onClick={() => commit({ x: 0, y: 0, k: 1 })}>
          <RotateCcw />
        </button>
      </div>

      {!draft ? (
        <p className="ExileWorld-hint">
          <span>Click the map to mark where you live. Drag to move it.</span>
        </p>
      ) : null}
    </div>
  );
}
